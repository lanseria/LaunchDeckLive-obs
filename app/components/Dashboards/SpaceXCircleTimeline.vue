<script setup lang="ts">
import { formatMET } from '~/composables/utils/formatters'

const props = defineProps<{
  telemetry: TelemetryData // 包含 currentTime, allEvents, missionName 等
}>()

const { t } = useI18n()

// --- SVG 和时间轴配置 ---
const SVG_SIZE = 300
const CENTER_X = SVG_SIZE / 2
const CENTER_Y = SVG_SIZE / 2
const CIRCLE_RADIUS = 120
const NODE_RADIUS = 4
const LABEL_OFFSET = 15

// 当前事件高亮的容差时间（秒）
// 例如，如果事件时间与当前时间相差在此范围内，则认为是“当前”或“焦点”事件
const CURRENT_EVENT_TIME_TOLERANCE_SECONDS = 2.5 // +/- 2.5 秒

const timeWindow = computed(() => {
  if (!props.telemetry.allEvents || props.telemetry.allEvents.length === 0) {
    return { min: -60, max: 180, duration: 240 }
  }
  const times = props.telemetry.allEvents.map(e => e.time)
  const minEventTime = Math.min(...times)
  const maxEventTime = Math.max(...times)
  const eventDuration = maxEventTime - minEventTime

  // 窗口至少要能容纳所有事件，或者有一个最小/默认时长
  const minWindowDuration = 120 // 例如，时间轴至少代表2分钟
  const calculatedWindowDuration = Math.max(minWindowDuration, eventDuration + 60) // 加一些缓冲区

  // 尝试让当前时间在窗口中有一个大致的中心位置，但这比较复杂，
  // 对于圆形时间轴，通常是整个任务或一个固定的大窗口。
  // 简化：窗口就基于所有事件的范围加缓冲区。
  const buffer = calculatedWindowDuration * 0.15 || 30 // 15% 或 30s 的缓冲区
  const finalMin = minEventTime - buffer
  const finalMax = maxEventTime + buffer

  return {
    min: finalMin,
    max: finalMax,
    duration: finalMax - finalMin,
  }
})

const svgNodes = computed(() => {
  if (!props.telemetry.allEvents || props.telemetry.allEvents.length === 0 || timeWindow.value.duration <= 0) {
    return []
  }

  return props.telemetry.allEvents.map((event) => {
    const timeDiffFromCurrent = event.time - props.telemetry.simulationTime

    // 将 timeDiffFromCurrent 映射到相对于 "当前时间标记"（例如顶部）的角度
    // 整个圆周 (2 * PI) 代表 timeWindow.value.duration 的时长
    // 角度 = (timeDiffFromCurrent / timeWindow.value.duration) * 2 * Math.PI
    // 我们希望 "当前时间" (timeDiffFromCurrent = 0) 在顶部，即 -Math.PI / 2 弧度
    const angle = (timeDiffFromCurrent / timeWindow.value.duration) * (2 * Math.PI) - (Math.PI / 2)

    const cx = CENTER_X + CIRCLE_RADIUS * Math.cos(angle)
    const cy = CENTER_Y + CIRCLE_RADIUS * Math.sin(angle)

    const labelAngle = angle
    const labelRadius = CIRCLE_RADIUS + LABEL_OFFSET
    const textX = CENTER_X + labelRadius * Math.cos(labelAngle)
    const textY = CENTER_Y + labelRadius * Math.sin(labelAngle)
    const textRotationDeg = labelAngle * (180 / Math.PI) + 90

    const isCurrent = Math.abs(timeDiffFromCurrent) <= CURRENT_EVENT_TIME_TOLERANCE_SECONDS
    const isPast = event.time < props.telemetry.simulationTime && !isCurrent // 确保 past 不覆盖 current

    return {
      key: event.eventNameKey + event.time,
      cx,
      cy,
      text: t(event.eventNameKey),
      met: formatMET(event.time),
      textX,
      textY,
      textRotation: textRotationDeg,
      isCurrent,
      isPast,
    }
  })
})

const centralFormattedMET = computed(() => formatMET(props.telemetry.simulationTime))
</script>

<template>
  <div class="spacex-circle-timeline font-din-condensed text-white flex flex-col h-full w-full items-center justify-center">
    <svg :viewBox="`0 0 ${SVG_SIZE} ${SVG_SIZE}`" class="h-[300px] w-[300px] lg:h-[400px] lg:w-[400px] md:h-[350px] md:w-[350px]">
      <defs>
        <!-- 可以在这里定义渐变、滤镜等 -->
      </defs>

      <!-- 1. 背景圆环 (主时间轴轨道) -->
      <!-- 轨道颜色 -->
      <circle
        :cx="CENTER_X"
        :cy="CENTER_Y"
        :r="CIRCLE_RADIUS"
        fill="none"
        stroke="rgba(70, 90, 110, 0.6)"
        :stroke-width="8"
      />

      <!-- 2. "当前时间" 固定标记 (例如，在顶部) -->
      <!-- 当前时间标记线颜色 -->
      <line
        :x1="CENTER_X"
        :y1="CENTER_Y - CIRCLE_RADIUS - 8"
        :x2="CENTER_X"
        :y2="CENTER_Y - CIRCLE_RADIUS + 8"
        stroke="red"
        stroke-width="2"
      />
      <!-- 也可以用一个小三角形或更复杂的标记 -->
      <polygon
        :points="`${CENTER_X - 4},${CENTER_Y - CIRCLE_RADIUS - 10} ${CENTER_X + 4},${CENTER_Y - CIRCLE_RADIUS - 10} ${CENTER_X},${CENTER_Y - CIRCLE_RADIUS - 4}`"
        fill="red"
      />

      <!-- 3. 动态渲染事件节点 -->
      <g v-for="node in svgNodes" :key="node.key">
        <!-- 事件节点的小圆点 -->
        <circle
          :cx="node.cx"
          :cy="node.cy"
          :r="NODE_RADIUS"
          :fill="node.isCurrent ? 'rgb(0, 190, 255)' : (node.isPast ? 'rgba(100,100,100,0.8)' : 'rgba(200,200,200,0.8)')"
          :stroke="node.isCurrent ? 'white' : 'rgba(150,150,150,0.5)'"
          stroke-width="1"
          :class="{ 'animate-pulse': node.isCurrent }"
        />
        <!-- 事件名称标签 -->
        <!-- 根据旋转调整，可能需要 start/end -->
        <text
          :x="node.textX"
          :y="node.textY"
          :transform="`rotate(${node.textRotation}, ${node.textX}, ${node.textY})`"
          fill="rgba(220, 220, 220, 0.9)"
          font-size="10"
          text-anchor="middle"
          dominant-baseline="middle"
          class="transition-opacity duration-300"
          :class="{ 'opacity-50': node.isPast, 'font-bold text-cyan-300': node.isCurrent }"
        >
          {{ node.text }} <tspan font-size="8" fill="rgba(180,180,180,0.7)">{{ node.met }}</tspan>
        </text>
      </g>

      <!-- 4. 中央 MET 时间文本 -->
      <!-- 调整Y使其视觉居中 -->
      <text
        :x="CENTER_X"
        :y="CENTER_Y"
        fill="white"
        font-size="40"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ centralFormattedMET }}
      </text>

      <!-- 5. 任务名和型号 (SVG内部或外部均可，这里放在外部方便布局) -->
    </svg>

    <!-- SVG 下方的任务名和型号 -->
    <div class="mt-[-70px] text-center relative z-10 lg:mt-[-90px] md:mt-[-80px]">
      <h1 class="text-xl font-bold tracking-wider uppercase md:text-2xl">
        {{ props.telemetry.missionName || t('displayPanelTitle') }}
      </h1>
      <p class="text-xs text-gray-400 uppercase md:text-sm">
        {{ props.telemetry.vehicleName || t('standby') }}
      </p>
      <!-- 状态信息 -->
      <div class="text-xs mt-1 md:text-sm">
        <span v-if="!props.telemetry.isPlaying " class="text-red-400 font-semibold">
          {{ t('simulationPausedStoppedFull') }}
        </span>
        <span v-if="props.telemetry.isPlaying" class="text-green-400 font-semibold animate-pulse">
          {{ t('simulationRunningFull') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-din-condensed {
  font-family: 'D-DIN Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif;
}
svg {
  display: block;
}
/* 给当前高亮事件的文本添加一点额外样式 */
.fill-cyan-300 {
  /* Tailwind/UnoCSS 可能没有 fill-* 类，需要自定义或用 text-* */
  fill: #67e8f9; /* 对应 text-cyan-300 */
}
.text-xs {
  /* 如果需要更小的字号，可以定义 */
  font-size: 0.7rem; /* 示例 */
}
</style>
