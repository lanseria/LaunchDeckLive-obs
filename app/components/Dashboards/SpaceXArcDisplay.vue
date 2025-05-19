<script setup lang="ts">
// 假设 formatMET 和 TelemetryData/useI18n 等已通过自动导入或正确导入
// import { formatMET } from '~/utils/formatters'; // 如果不是自动导入，则需要

const props = defineProps<{
  telemetry: TelemetryData
}>()

const { t } = useI18n()

// --- SVG 配置常量 ---
// viewBox 的宽度可以设为一个较大的参考值，实际显示宽度由CSS控制
const VIEWBOX_WIDTH = 600 // SVG 内部坐标系宽度
// viewBox 的高度需要根据弧形和下方文字来定，现在弧线在底部，所以Y值会比较大
const ARC_RADIUS = 280 // 较大的半径，使其看起来宽广
const ARC_STROKE_WIDTH = 10 // 弧线宽度
const ARC_TOTAL_ANGLE_DEG = 60 // 弧线总共扫描的角度

// 圆心 X 始终在 viewBox 的中间
const ARC_CENTER_X = VIEWBOX_WIDTH / 2
// 圆心 Y，由于开口向下且弧线在底部，圆心 Y 应该在 viewBox 的上方，甚至在 viewBox 的负 Y 区域
// 或者我们可以让 viewBox 的 (0,0) 在弧线最顶部的中心，然后计算
// 让我们尝试让弧线的"底部"（即弧线的最低点或接近最低点）靠近 viewBox 的底部
// 假设弧线最低点距离 viewBox 底部有一定边距 (e.g., 20px)
// 而弧线的中心在Y轴方向上，会比这个最低点高出 R * (1 - cos(扫描角度一半))
// 但更简单的方法是，设定一个 Y 值，然后调整半径和角度
// 目标：弧线底部开口，圆心朝下（即圆弧是“向上凸起”的，开口在底部）
// SVG 角度：0度向右，正角度顺时针。
// 如果是底部开口，对称于 Y 轴，弧线在 SVG 上方，开口向下：
// 起始角度：180 - (ARC_TOTAL_ANGLE_DEG / 2)  => 180 - 30 = 150度
// 结束角度：180 + (ARC_TOTAL_ANGLE_DEG / 2)  => 180 + 30 = 210度
const ARC_START_ANGLE_DEG = 180 - ARC_TOTAL_ANGLE_DEG / 2
const ARC_END_ANGLE_DEG = 180 + ARC_TOTAL_ANGLE_DEG / 2

// 计算弧线的实际顶点 Y（弧线最高点），以便设置 viewBox 的高度
// cos(0) = 1 (当角度是相对于对称轴时)
// 弧的垂直跨度是 R * (1 - cos(总角度的一半)) -- 这不对，这是弓高
// 对于一个对称于Y轴，开口向下的弧，其最高点 Y 是 CY - R
// 最低点 Y (在开口边缘) 是 CY - R * cos(总角度的一半)
// 为了让弧线紧靠“下方”（在SVG的视觉下方，即Y值较大处），圆心Y应该比较小。
// 让我们重新思考：圆心朝下，开口在底部，意味着弧线是“向上拱起”的。
// 这意味着弧线的中心Y值，应该比弧线的边缘Y值要小。
// 想象一个倒挂的碗。碗底是圆心，碗口是弧线。
// 不，描述是“弧度圆心朝下”，这通常意味着是一个“向下凹陷”的弧，像一个微笑的嘴巴。
// 如果是这样，圆心Y会比较大。

// 让我们按“微笑嘴巴”的形状来：圆心在上方，开口在下方，弧线向下弯曲。
// 那么，角度应该是从 viewBox 底部往上画。
// 0度向右，正角顺时针。
// 一个对称于Y轴，开口在底部的60度弧：
// 起始角度：90 - (ARC_TOTAL_ANGLE_DEG / 2) = 90 - 30 = 60度
// 结束角度：90 + (ARC_TOTAL_ANGLE_DEG / 2) = 90 + 30 = 120度
// 圆心Y设置，使得弧线在底部。
// 例如，如果 viewBox 高度是 150，我们希望弧线底部离 viewBox 底部 10px
// 弧线最低点 Y = ARC_CENTER_Y + ARC_RADIUS = 150 - 10 = 140
// 所以 ARC_CENTER_Y = 140 - ARC_RADIUS
// const ARC_CENTER_Y = 140 - ARC_RADIUS; // 这会导致 Y 为负值，如果半径大
// 重新设定 viewBox 高度和圆心Y
const VIEWBOX_HEIGHT = 150 // 尝试一个高度
const ARC_CENTER_Y_SMILE = 50 // 圆心Y，靠上一些，让弧线向下弯曲在底部
// const ARC_RADIUS_SMILE = 280; // 之前的值

// --- 辅助函数 ---
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function describeArcPath(x: number, y: number, radius: number, startAngleDeg: number, endAngleDeg: number, sweepFlagOverride?: string): string {
  const startRad = degreesToRadians(startAngleDeg)
  const endRad = degreesToRadians(endAngleDeg)

  const startX = x + radius * Math.cos(startRad)
  const startY = y + radius * Math.sin(startRad)
  const endX = x + radius * Math.cos(endRad)
  const endY = y + radius * Math.sin(endRad)

  const largeArcFlag = Math.abs(endAngleDeg - startAngleDeg) <= 180 ? '0' : '1'
  // sweepFlag: 0 for counter-clockwise, 1 for clockwise
  const sweepFlag = sweepFlagOverride || (endAngleDeg > startAngleDeg ? '1' : '0')

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`
}

// --- 计算属性 ---
const formattedCentralMET = computed(() => formatMET(props.telemetry.simulationTime))

// 重新计算弧线参数，使其开口向下，圆心在“上方”
const SMILE_ARC_RADIUS = 280 // 保持较大的半径以获得宽广感
// 为了让60度弧线看起来宽，同时开口向下在底部，圆心Y需要调整
// 假设弧线最低点（Y最大处）接近 VIEWBOX_HEIGHT 的底部，例如 VIEWBOX_HEIGHT - 20
// 弧的最低点 = SMILE_ARC_CENTER_Y + SMILE_ARC_RADIUS
// 所以 SMILE_ARC_CENTER_Y = (VIEWBOX_HEIGHT - 20) - SMILE_ARC_RADIUS
// 这会导致圆心Y为负，意味着圆心在viewBox的外部上方，这是可以的。
const SMILE_ARC_CENTER_Y = (VIEWBOX_HEIGHT - 10) - SMILE_ARC_RADIUS

const smileArcPathD = computed(() => {
  // 开口向下的60度弧，对称于Y轴。
  // 起始角度应该是从X轴负方向（180度）逆时针偏离30度，即 180 + 30 = 210度 (或者 -150度)
  // 结束角度应该是从X轴正方向（0度）顺时针偏离30度，即 0 - 30 = -30度 (或者 330度)
  // 为了使用A命令，通常startAngle < endAngle 且 sweepFlag=1 (顺时针)
  // 或者反过来，但保持 sweepFlag 一致。
  // 让我们用 -30 到 -150，sweep flag = 0 (逆时针)
  // 或者，更符合SVG习惯，从左到右：
  const startAngle = 90 + ARC_TOTAL_ANGLE_DEG / 2 // 例如 120度
  const endAngle = 90 - ARC_TOTAL_ANGLE_DEG / 2 // 例如 60度
  // M (startX, startY) A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  // sweep-flag 为 0 表示逆时针 (从 start 到 end)
  // console.log(`Smile Arc: Center(${ARC_CENTER_X}, ${SMILE_ARC_CENTER_Y}), R(${SMILE_ARC_RADIUS}), Start(${startAngle}), End(${endAngle})`);
  return describeArcPath(ARC_CENTER_X, SMILE_ARC_CENTER_Y, SMILE_ARC_RADIUS, startAngle, endAngle, '0')
})

// 时间轴进度指示弧
const timeArcProgressPathD = computed(() => {
  const timeRange = TIME_WINDOW_MAX - TIME_WINDOW_MIN
  if (timeRange <= 0)
    return ''

  let currentTimeInWindow = props.telemetry.simulationTime
  const progressRatio = (currentTimeInWindow - TIME_WINDOW_MIN) / timeRange
  const clampedProgressRatio = Math.max(0, Math.min(1, progressRatio))

  // 进度条从左（大角度）向右（小角度）绘制
  const startAngle = 90 + ARC_TOTAL_ANGLE_DEG / 2
  const endAngleProgress = startAngle - (clampedProgressRatio * ARC_TOTAL_ANGLE_DEG)

  if (clampedProgressRatio <= 0 && currentTimeInWindow < TIME_WINDOW_MIN) {
    return describeArcPath(ARC_CENTER_X, SMILE_ARC_CENTER_Y, SMILE_ARC_RADIUS, startAngle, startAngle, '0') // 画一个点
  }
  // 确保 endAngleProgress 不会超过原始的结束角度
  const finalEndAngle = Math.max(90 - ARC_TOTAL_ANGLE_DEG / 2, endAngleProgress)

  return describeArcPath(ARC_CENTER_X, SMILE_ARC_CENTER_Y, SMILE_ARC_RADIUS, startAngle, finalEndAngle, '0')
})
</script>

<template>
  <div class="spacex-arc-display-wrapper font-din-condensed text-white flex flex-col h-auto w-full pointer-events-none items-center bottom-0 left-0 right-0 justify-end absolute z-10">
    <!-- SVG 容器，控制其在屏幕上的宽度 -->
    <div class="max-w-2xl w-1/2 svg-container">
      <!-- 占据页面一半宽度，并设置一个最大宽度 -->
      <svg :viewBox="`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`" class="h-auto w-full block">
        <defs>
          <!-- 可以在这里定义渐变或滤镜 -->
        </defs>

        <!-- 1. 底部弧线 (作为时间轴背景) -->
        <path
          :d="smileArcPathD"
          fill="none"
          stroke="rgba(70, 90, 110, 0.5)"
          :stroke-width="ARC_STROKE_WIDTH"
          stroke-linecap="round"
        />

        <!-- 2. 时间轴进度指示弧 -->
        <path
          v-if="props.telemetry.simulationTime >= TIME_WINDOW_MIN && props.telemetry.simulationTime <= TIME_WINDOW_MAX + (TIME_WINDOW_MAX - TIME_WINDOW_MIN) * 0.05"
          :d="timeArcProgressPathD"
          fill="none"
          stroke="rgba(0, 190, 255, 0.9)"
          :stroke-width="ARC_STROKE_WIDTH"
          stroke-linecap="round"
          class="transition-path-d"
        />

      </svg>
    </div>
  </div>
</template>

<style scoped>
.font-din-condensed {
  font-family: 'D-DIN Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif;
}

.spacex-arc-display-wrapper {
  /* 这个 wrapper 用于将整个组件定位在屏幕底部 */
  /* 例如，在父组件中（pages/index.vue 的 .main-display-container）:
     display: flex;
     flex-direction: column;
     justify-content: flex-end; // 将子元素推到底部
     align-items: center; // 水平居中
  */
}

.svg-container {
  /* SVG 的直接父容器，用于控制宽度 */
  /* margin-bottom: 10px; */ /* 如果需要一些底部间距 */
}

svg path {
  transition: d 0.15s linear; /* 给路径 d 属性的变化添加平滑过渡 */
}

.met-text {
  /* text-shadow: 0 0 5px rgba(0, 190, 255, 0.5); 可选：给MET文本添加一点辉光效果 */
}
.mission-info-text {
  /* letter-spacing: 0.05em; */
}

/* 你可能需要为 tspan（如果使用的话）或 text 内的不同部分定义不同的 fill 颜色 */
</style>
