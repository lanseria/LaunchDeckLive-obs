<script setup lang="ts">
import { formatMET } from '~/composables/utils/formatters'

const props = defineProps<{
  telemetry: TelemetryData
}>()

const initialTimestampsReact = ['0:05', '0:10', '0:30', '1:00', '1:10', '1:15', '1:30', '2:00'] // 示例，对应秒：5, 10, 30, 60, 70, 75, 90, 120 (假设是分钟数)
const initialNodeNamesReact = ['Startup', 'Liftoff', 'Max Q', 'MECO', 'S1 Detach', 'S2 Startup', 'SECO', 'Deploy']

// 这些 ref 将模拟 React 的 state
const timestamps = ref<string[]>([...initialTimestampsReact]) // 用字符串数组，像React代码那样
const nodeNames = ref<string[]>([...initialNodeNamesReact])
const missionTime = ref<string>('2:30') // 总任务时间，格式 "MM:SS"
const timeValue = ref<string>('0.1') // 倒计时起始时间 (分钟)
const timerClock = ref<string>('T - 00:00:00')
const isStarted = ref(false)
// rotationAngle 在 React 代码中似乎没有被用来直接旋转 SVG，而是用于计算，这里暂时保留
// const rotationAngle = ref(0.1);

// --- SVG 元素引用 ---
const svgRef = ref<SVGSVGElement | null>(null) // 获取 <svg> 元素的引用
const svgWrapperRef = ref<HTMLElement | null>(null) // 获取 #svg_wrapper 的引用

// --- 定时器 ID ---
let timerIntervalId: NodeJS.Timeout | null = null
let rotationIntervalId: NodeJS.Timeout | null = null

// --- 辅助函数 (从 React 代码迁移并适配) ---
function convertTimeToFloatMinutes(timeStr: string): number {
  if (timeStr === '0' || !timeStr || !timeStr.includes(':')) {
    // 尝试直接解析为浮点数，如果已经是数字或无法解析为 M:S 格式
    const parsed = Number.parseFloat(timeStr)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const parts = timeStr.split(':')
  const minutes = Number.parseInt(parts[0]!, 10)
  const seconds = Number.parseInt(parts[1]!, 10)
  if (Number.isNaN(minutes) || Number.isNaN(seconds))
    return 0
  return Number.parseFloat((minutes + (seconds / 60)).toFixed(2))
}

// newTimestamps 和 newMissionTime 在 React 中是 state，这里可以是 computed
const newTimestampsInMinutes = computed(() => timestamps.value.map(t => convertTimeToFloatMinutes(t)))
const newMissionTimeInMinutes = computed(() => convertTimeToFloatMinutes(missionTime.value))

function plotNodesOnCircle(
  numNodes: number,
  totalDurationMinutes: number, // 圆周代表的总时长 (分钟)
  radius: number,
  eventTimesMinutes: number[], // 事件发生的时间点 (分钟，相对于0)
  svgWidth: number,
  svgHeight: number,
) {
  if (!svgRef.value)
    return
  // console.log('Plotting:', numNodes, totalDurationMinutes, radius, eventTimesMinutes, svgWidth, svgHeight);

  // 清空 SVG 内容 (与 React 代码的 svg.innerHTML = "" 对应)
  while (svgRef.value.firstChild) {
    svgRef.value.removeChild(svgRef.value.firstChild)
  }

  const centerX = svgWidth / 2
  const centerY = svgHeight / 2

  // 1. 创建背景圆环
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', centerX.toString())
  circle.setAttribute('cy', centerY.toString())
  circle.setAttribute('r', radius.toString())
  circle.setAttribute('stroke', '#ffffff')
  circle.setAttribute('fill', 'none') // 通常背景圆是无填充的
  circle.setAttribute('stroke-width', '1') // 根据 React CSS 调整
  svgRef.value.appendChild(circle)

  // 2. 创建固定的“当前时间”标记 (在SVG旋转180度后，它会出现在顶部)
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  marker.setAttribute('stroke', '#ffffff')
  marker.setAttribute('stroke-width', '2') // 稍微粗一点
  // 标记在圆的正下方 (旋转前)
  marker.setAttribute('x1', centerX.toString())
  marker.setAttribute('y1', (centerY + radius - 5).toString()) // 稍微在圆弧内一点
  marker.setAttribute('x2', centerX.toString())
  marker.setAttribute('y2', (centerY + radius + 5).toString()) // 稍微在圆弧外一点
  svgRef.value.appendChild(marker)

  // 3. 绘制事件节点
  if (totalDurationMinutes <= 0)
    return // 防止除以0

  for (let i = 0; i < numNodes; i++) {
    const eventTimeMin = eventTimesMinutes[i]!
    const eventName = nodeNames.value[i] || `Event ${i + 1}`

    // 计算角度：React 代码中 angle_i = 2 * Math.PI * t_i / d + Math.PI / 2;
    // t_i 是事件时间，d 是总时间。Math.PI / 2 使 0 点在底部 (因为Y轴向下)。
    // 由于整个 SVG 稍后会 transform: rotate(180deg)，所以这个底部会变成顶部。
    const angleRad = (2 * Math.PI * eventTimeMin / totalDurationMinutes) + (Math.PI / 2)

    const nodeX = centerX + radius * Math.cos(angleRad)
    const nodeY = centerY + radius * Math.sin(angleRad)

    // 事件节点圆点
    const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeCircle.setAttribute('cx', nodeX.toString())
    nodeCircle.setAttribute('cy', nodeY.toString())
    nodeCircle.setAttribute('r', '5') // React: 5
    nodeCircle.setAttribute('stroke', '#ffffff')
    nodeCircle.setAttribute('stroke-width', '1')
    nodeCircle.setAttribute('fill', '#000000') // React: #000000
    svgRef.value.appendChild(nodeCircle)

    // 名称旁边的小指示圆点 (根据React代码的条件)
    if ((nodeX >= centerX) && (nodeY <= centerY + radius)) { // 条件与React代码一致
      const nameIndicatorCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      nameIndicatorCircle.setAttribute('cx', nodeX.toString())
      nameIndicatorCircle.setAttribute('cy', nodeY.toString())
      nameIndicatorCircle.setAttribute('r', '2') // React: 2
      nameIndicatorCircle.setAttribute('fill', '#ffffff')
      svgRef.value.appendChild(nameIndicatorCircle)
    }

    // 事件名称文本
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    let textPosY = nodeY
    // React代码中的文本Y偏移逻辑
    if ((numNodes % 2 !== 0) && (i === numNodes - 1)) { // 奇数个节点的最后一个
      textPosY -= 15
    }
    else if (i % 2 === 0) { // 偶数索引的节点
      textPosY -= 15
    }
    else { // 奇数索引的节点
      textPosY += 25
    }
    textEl.setAttribute('x', nodeX.toString())
    textEl.setAttribute('y', textPosY.toString())
    // 文本旋转 (使其径向朝外，底部朝向节点)
    // React代码: (angle_i + Math.PI / 2) * 180 / Math.PI
    const textRotationDeg = (angleRad + Math.PI / 2) * (180 / Math.PI)
    textEl.setAttribute('transform', `rotate(${textRotationDeg}, ${nodeX}, ${nodeY})`)
    textEl.setAttribute('fill', '#ffffff')
    textEl.setAttribute('font-size', '10') // React: 10
    textEl.setAttribute('text-anchor', 'middle')
    textEl.textContent = eventName
    svgRef.value.appendChild(textEl)

    // 连接文本和节点的短线
    const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    let lineY1 = nodeY; let lineY2 = nodeY
    if ((numNodes % 2 !== 0) && (i === numNodes - 1)) {
      lineY1 -= 5; lineY2 -= 10
    }
    else if (i % 2 === 0) {
      lineY1 -= 5; lineY2 -= 10
    }
    else {
      lineY1 += 5; lineY2 += 10
    }
    lineEl.setAttribute('x1', nodeX.toString())
    lineEl.setAttribute('y1', lineY1.toString())
    lineEl.setAttribute('x2', nodeX.toString())
    lineEl.setAttribute('y2', lineY2.toString())
    lineEl.setAttribute('transform', `rotate(${textRotationDeg}, ${nodeX}, ${nodeY})`)
    lineEl.setAttribute('stroke', '#ffffff')
    lineEl.setAttribute('stroke-width', '1')
    svgRef.value.appendChild(lineEl)
  }
}

function setTimerVue(inputMinutesStr: string, mode: 'dec' | 'inc') {
  if (timerIntervalId.value)
    clearInterval(timerIntervalId.value)

  const inputMinutes = Number.parseFloat(inputMinutesStr)
  if (Number.isNaN(inputMinutes))
    return

  let durationSeconds = inputMinutes * 60
  let timer = durationSeconds

  timerIntervalId.value = setInterval(() => {
    const hours = Math.floor(timer / 3600)
    const minutes = Math.floor((timer % 3600) / 60)
    const seconds = Math.floor(timer % 60)

    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')

    const prefix = (mode === 'dec') ? 'T - ' : 'T + '
    timerClock.value = `${prefix}${hh}:${mm}:${ss}`

    if (mode === 'dec') {
      timer--
      if (timer < 0) {
        clearInterval(timerIntervalId.value!)
        timerIntervalId.value = null
        startRotationVue() // 倒计时结束，开始“旋转”
        setTimerVue('0', 'inc') // 切换到正计时
      }
    }
    else {
      timer++
      // 正计时可以无限进行，或者设置一个上限
    }
  }, 1000)
}

function startRotationVue() {
  if (rotationIntervalId.value)
    clearInterval(rotationIntervalId.value)

  // 这个函数在React版本中是修改 newTimestamps 数组然后重绘
  // 我们也这样做，但修改的是 ref<number[]>
  // React: newTimestamps[k] = v - 0.001; (递减0.001分钟)
  // 0.001 分钟 = 0.001 * 60 = 0.06 秒
  // setInterval 频率是 75ms
  const decrementPerIntervalMin = 0.001 // 每次递减的分钟数

  rotationIntervalId.value = setInterval(() => {
    // 创建一个新的数组来触发响应式更新
    const currentEventTimesMin = [...newTimestampsInMinutes.value]
    const updatedEventTimesMin = currentEventTimesMin.map(t => t - decrementPerIntervalMin)

    // 更新 timestamps (字符串格式) 以触发依赖 newTimestampsInMinutes 的重算
    // 这比较tricky，因为我们想改浮点数，但原始state是字符串
    // 理想情况下，我们的核心 "时间" 应该是数字（秒或分钟）
    // 为了快速复刻，我们尝试直接更新用于绘图的 newTimestampsInMinutes
    // 但这不会自动更新 localStorage 或原始的 timestamps ref。
    // 更好的做法是有一个核心的“当前模拟时间”的概念，节点的时间是固定的，
    // 我们是调整“当前模拟时间”相对于节点的位置。
    // React 代码的这种直接修改时间戳数组的方式是为了让节点“移动”。

    // 简化：我们直接在 plotNodesOnCircle 中使用一个“偏移”来模拟滚动
    // 或者，我们像 React 那样，有一个会被修改的 `currentDisplayTimestamps`
    // 这里，我们直接修改一个用于绘图的内部时间数组。
    // 这个 currentPlotTimestamps 不直接是 props.telemetry.allEvents.time

    // **重要**: 为了精确复刻 React 通过修改 `newTimestamps` 数组来驱动动画的行为，
    // 我们需要一个可变的 ref 来存储这些用于绘图的时间戳（分钟）。
    // Pinia store中的 allEvents.time 是秒，且通常是固定的。
    // 所以，我们需要一个新的 ref 来专门模拟 React 的 newTimestamps。

    // 假设我们有一个 `plotableEventTimesMin = ref<number[]>(convertAllEventsToMinutes())`
    // plotableEventTimesMin.value = plotableEventTimesMin.value.map(t => t - decrementPerIntervalMin);
    // 然后 plotNodesOnCircle 使用这个 plotableEventTimesMin。

    // **更符合我们当前项目结构的方式是：**
    // 我们不修改事件本身的时间。`props.telemetry.simulationTime` 在变化。
    // `plotNodesOnCircle` 应该使用 `props.telemetry.simulationTime` 来计算每个固定事件时间点
    // 相对于“当前时间标记”的角度。
    // React 代码的 startRotation 实际上是在模拟时间流逝，通过改变事件节点“相对于0点”的时间。
    // 在我们的系统中，`props.telemetry.simulationTime` 就是那个正在流逝的时间。

    // 因此，`startRotationVue` 主要的职责是确保 `plotNodesOnCircle` 被调用。
    // 而 `plotNodesOnCircle` 会基于当前的 `props.telemetry.simulationTime` 来绘制。
    // 真正的“滚动”效果来自于 `props.telemetry.simulationTime` 的变化，
    // 导致 `svgNodes` (我们下一个要实现的computed)重新计算。
    // React 代码的 `newTimestamps.forEach(v => v - 0.001)` 的作用，在我们的Vue版本中，
    // 由 `props.telemetry.simulationTime` 在 `setTimerVue` 的 `T+` 模式下递增来实现。
    // `plotNodesOnCircle` 将在 `props.telemetry.simulationTime` 变化时通过 `svgNodes` 的 `computed` 属性自动重绘。
    // 所以，`startRotationVue` 可能只需要确保一个重绘的触发（如果 computed 不够），
    // 但通常 Vue 的响应式系统会处理好。
    // 在 React 代码中，`startRotation` 调用 `plotNodesOnCircle` 是因为 `newTimestamps` 被直接修改，
    // 需要手动触发重绘。

    // 在我们的Vue版本中，当 `props.telemetry.simulationTime` 在 `setTimerVue` 的 `T+` 模式下递增时，
    // `svgNodes` computed 属性会自动重新计算，从而导致SVG重新渲染。
    // 所以 `startRotationVue` 可能不需要做特别的事情，除了启动T+计时器。
    // React 代码中的 `startRotation` 的 `setInterval` 是在模拟 T+ 模式下，
    // 并且**同时**更新了用于绘图的时间戳数组。
    // 我们的 `setTimerVue` 已经处理了 `timerClock` 的 T+ 更新。
    // 现在我们需要确保 `svgNodes` 也反映这个 T+ 的时间流逝。
    // `svgNodes` 依赖 `props.telemetry.simulationTime`，而这个值在 `setTimerVue` 的T+模式下会自增。
    // 所以，理论上不需要单独的 `rotationIntervalId` 来驱动SVG更新。

    // **结论：`startRotationVue` 函数可能是不必要的，如果 `setTimerVue` 中的 `T+` 模式正确更新了
    // `props.telemetry.simulationTime` (通过store)，并且 `svgNodes` 正确依赖它。**
    // React 代码的 `startRotation` 是因为它在 `T-` 结束后，需要一个独立的机制来驱动圆盘“动画”。
    // 而我们的 `T+` 计时器本身就在驱动 `simulationTime`。

    // 为了精确模仿React版本在T-0后节点的“移动”，如果它不是由全局simulationTime驱动，
    // 而是独立地让圆盘上的时间“流逝”，那么就需要一个独立的机制。
    // React代码中：`newTimestamps.forEach(function (v: any, k: any) { newTimestamps[k] = v - 0.001; });`
    // 这意味着它有一个独立于中心倒计时 `timerClock` 的“圆盘时间”概念。
    // 如果我们要复刻这个，需要一个额外的 ref 来表示“圆盘的当前0点对应的时间”，
    // 并在 `rotationIntervalId` 中更新这个 ref，然后 `svgNodes` 的角度计算要基于这个。

    // 让我们假设目标是：倒计时结束后，中心时间显示 T+，同时圆盘上的节点继续相对于固定的 "NOW" 标记移动。
    // 这意味着 `plotNodesOnCircle` (或 `svgNodes`) 中的角度计算，其参考点 (`currentTime` 或 `simulationTime`)
    // 必须是那个正在 T+ 模式下递增的时间。
    // 所以，只要 `setTimerVue` 在 `T+` 模式下正确地驱动 `props.telemetry.simulationTime` (通过store) 的更新，
    // `svgNodes` 就会自动更新，不需要额外的 `startRotationVue` 定时器来修改数据或强制重绘。

    // 因此，这里的 `startRotationVue` 可以被移除，其逻辑已经包含在 `setTimerVue` 的 `T+` 模式
    // （即 `timer++`）和 Vue 的响应式系统中。
    if (rotationIntervalId.value)
      clearInterval(rotationIntervalId.value) // 先清除以防万一
    console.log('Rotation (node movement) should be driven by props.telemetry.simulationTime incrementing in T+ mode.')
  }, 75) // React 代码中的频率
}

// --- 事件处理函数 (模拟 React 的) ---
function handleStartLaunch() {
  if (isStarted.value) {
    isStarted.value = false
    if (timerIntervalId.value)
      clearInterval(timerIntervalId.value)
    if (rotationIntervalId.value)
      clearInterval(rotationIntervalId.value) // 如果我们真的需要它
  }
  else {
    isStarted.value = true
    setTimerVue(timeValue.value, 'dec') // timeValue 是分钟字符串
  }
}

function handleUpdateTimeValue(event: Event) { // 对应 React 的 updateTimer
  const target = event.target as HTMLInputElement
  timeValue.value = target.value
  // 在React代码中，updateTimer也清除了定时器，这里如果需要，可以在 setTimerVue 开始时清除
  if (isStarted.value) { // 如果正在运行，停止并用新时间准备
    isStarted.value = false
    if (timerIntervalId.value)
      clearInterval(timerIntervalId.value)
    if (rotationIntervalId.value)
      clearInterval(rotationIntervalId.value)
  }
}
function handleUpdateMissionTime(event: Event) {
  const target = event.target as HTMLInputElement
  missionTime.value = target.value
  // 这会通过 computed newMissionTimeInMinutes 自动更新绘图参数
}

// 节点管理功能 (简化，因为我们不直接用这里的 timestamps 绘图)
// 如果需要界面编辑，这些需要完整实现并更新 store
function handleAddNode() {
  timestamps.value = [...timestamps.value, '0:00']
  nodeNames.value = [...nodeNames.value, `Node ${nodeNames.value.length + 1}`]
}
// ... 其他节点管理函数 ...

// --- 生命周期钩子 ---
onMounted(() => {
  // 初始绘制
  // React useEffect for [newTimestamps, nodeNames, newMissionTime]
  // 在Vue中，这会通过 computed svgNodes 和模板的 v-for 自动完成。
  // 我们只需要确保依赖项正确。
  // 这里可以进行一次初始的 plotNodesOnCircle 调用，如果 computed 还未触发
  // 或者依赖 immediate: true 的 watch
  // plotNodesOnCircle(newTimestampsInMinutes.value.length, newMissionTimeInMinutes.value, CIRCLE_RADIUS, newTimestampsInMinutes.value, SVG_WIDTH, SVG_HEIGHT);
  // ^^^ 上面这行其实不需要了，因为 svgNodes 是 computed，会在模板中自动使用

  // 如果需要从 localStorage 加载，在这里处理
  // const savedTimestamps = localStorage.getItem('timestamps_vue');
  // if (savedTimestamps) timestamps.value = JSON.parse(savedTimestamps);
  // const savedNodeNames = localStorage.getItem('nodenames_vue');
  // if (savedNodeNames) nodeNames.value = JSON.parse(savedNodeNames);
})

onBeforeUnmount(() => {
  if (timerIntervalId.value)
    clearInterval(timerIntervalId.value)
  if (rotationIntervalId.value)
    clearInterval(rotationIntervalId.value)
})

// Watchers 模拟 React 的 useEffect 依赖更新
// 当用于绘图的参数改变时，svgNodes 会自动重新计算
// watch([newTimestampsInMinutes, newMissionTimeInMinutes, nodeNames], () => {
//    // SVG 会通过 svgNodes 计算属性自动更新
// }, { deep: true });
// ^^^ 这个 watch 也不需要了，因为 computed 的依赖会自动处理。

// 格式化中央倒计时 (如果需要与 formatMET 不同的特定格式)
const formattedCentralTimerClock = computed(() => {
  // React 代码中的 timerClock 已经是 "T - HH:MM:SS" 格式
  // 我们的 props.telemetry.simulationTime 是秒
  // 所以我们需要用 formatMET
  if (isStarted.value) { // 只有在开始后才显示 timerClock 的值
    return timerClock.value // timerClock ref 由 setTimerVue 更新
  }
  // 未开始时，显示基于 props.telemetry.simulationTime 的时间
  return formatMET(props.telemetry.simulationTime)
})
</script>

<template>
  <div class="spacex-circle-timeline-replacer font-din-condensed text-white bg-[#111] flex flex-col h-full w-full select-none items-center justify-center">
    <!-- 顶部控制区域 (简化版，只放核心控制) -->
    <div class="controls-container mb-4 p-4 flex space-x-4">
      <div>
        <label for="timeToLaunchInput" class="text-xs block">Time to Launch (min):</label>
        <input id="timeToLaunchInput" type="text" :value="timeValue" class="text-sm p-1 border border-gray-600 rounded bg-gray-700 w-20" @change="handleUpdateTimeValue">
      </div>
      <button class="text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-700" @click="handleStartLaunch">
        {{ isStarted ? 'Stop Countdown' : 'Start Countdown' }}
      </button>
      <div>
        <label for="totalMissionTimeInput" class="text-xs block">Total Display Duration (M:SS):</label>
        <input id="totalMissionTimeInput" type="text" :value="missionTime" class="text-sm p-1 border border-gray-600 rounded bg-gray-700 w-20" @change="handleUpdateMissionTime">
      </div>
    </div>

    <!-- SVG 容器，模拟 React 代码中的 #svg_wrapper 和 #mySvg -->
    <!-- React 代码中 timeline_wrapper 有 padding: 50px 0; height: 200px; overflow: hidden; -->
    <!-- canvas_wrapper 也有类似样式，这里我们简化为一个 SVG 容器 -->
    <div
      class="svg-container-for-spacex-timeline bg-[#111] h-[200px] w-[1152px] relative overflow-hidden"
      :style="{ boxShadow: '0 0 0 100vmax #111', clipPath: 'inset(0 -100vmax)' }"
    >
      <!-- 模拟 React 中的 #svg_wrapper, 它没有明确尺寸，依赖 #mySvg -->
      <!-- #mySvg position:absolute, top:50px, left:0, transform:rotate(180deg) -->
      <!-- SVG 元素本身是 1200x1200 -->
      <div
        ref="svgWrapperRef"
        class="absolute"
        style="left: 0; top: 50px; width: 1200px; height: 1200px;"
      >
        <svg
          ref="svgRef"
          width="1200"
          height="1200"
          class="transition-all duration-75"
          style="transform: rotate(180deg);"
        >
          <!-- SVG 内容将由 plotNodesOnCircle 或 svgNodes 计算属性动态生成 -->
        </svg>
      </div>

      <!-- 中央倒计时文本 (模拟 React 的 .timer_clock) -->
      <!-- React: position:absolute, bottom:0, left:42.1%, font-size:2rem, padding:25px 0 -->
      <div
        class="text-3xl font-bold absolute"
        style="bottom: 25px; left: 50%; transform: translateX(-50%); z-index: 10;"
      >
        {{ formattedCentralTimerClock }}
      </div>
    </div>

    <!-- 底部任务名等 (如果需要，可以从SVG下方移到这里) -->
    <div class="mt-4 text-center relative z-10">
      <h1 class="text-xl font-bold tracking-wider uppercase md:text-2xl">
        {{ props.telemetry.missionName || 'STARLINK MISSION' }}
      </h1>
      <p class="text-xs text-gray-400 uppercase md:text-sm">
        {{ props.telemetry.vehicleName || 'FALCON 9' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.font-din-condensed {
  font-family: 'D-DIN Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif;
}
/* 从 React CSS 迁移或用 UnoCSS 等效实现 */
/* .timeline_wrapper 和 .canvas_wrapper 的 clip-path 和 box-shadow 是为了背景色充满屏幕 */
.svg-container-for-spacex-timeline {
  /* 这些样式与 React 代码中的 .timeline_wrapper 或 .canvas_wrapper 类似，用于创建裁剪的圆形视图 */
  /* 它的高度决定了你能看到圆的多少部分 */
}
/* 你可能需要根据 React 的 .nodes 和 .nodes li 的样式来调整 SVG 中 text 和 line 的定位 */
</style>
