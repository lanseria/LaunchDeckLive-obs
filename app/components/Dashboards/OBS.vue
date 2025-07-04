<script setup lang="ts">
import type { TimelineConfig } from '~~/server/utils/obsState'
import TimelineSvg from './Common/TimelineSvg.vue'

const props = defineProps<{
  simulationTime: number
  missionName: string
  vehicle: string
  events: { time: number, name: string }[]
  // 新增 prop
  timelineConfig?: TimelineConfig
}>()

// ... (其他 script 内容不变) ...
function formatTimeForClock(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds)
  const secs = totalSeconds < 0 ? Math.floor(abs) : Math.ceil(abs)
  const h = String(Math.floor(secs / 3600)).padStart(2, '0')
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  const sign = (totalSeconds < 0 || Object.is(totalSeconds, -0)) ? '-' : '+'
  return `T ${sign} ${h}:${m}:${s}`
}
const timerClock = computed(() => formatTimeForClock(props.simulationTime))
const timestamps = computed(() => props.events.map(e => e.time))
const nodeNames = computed(() => props.events.map(e => e.name))
// --- 关键逻辑修改 ---
const missionDuration = computed(() => {
  // 1. 优先使用从配置中传入的时长
  if (props.timelineConfig?.missionDuration && props.timelineConfig.missionDuration > 0)
    return props.timelineConfig.missionDuration

  // 2. 如果未配置，则回退到根据事件自动计算
  if (timestamps.value.length === 0)
    return 600 // 最终回退的默认值

  return 2 * Math.max(...timestamps.value.map(e => Math.abs(e)))
})
</script>

<template>
  <div class="relative h-full w-full select-none text-white font-saira">
    <!-- ... (Center Clock and Mission Name 不变) ... -->
    <div class="fixed bottom-16px left-1/2 z-50 mx-auto max-w-md text-center font-400 -translate-x-1/2">
      <div class="text-42px leading-tight tabular-nums">
        {{ timerClock }}
      </div>
      <div class="text-sm uppercase">
        {{ missionName }} - {{ vehicle }}
      </div>
    </div>

    <TimelineSvg
      v-if="events.length > 0"
      class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
      :timestamps="timestamps"
      :node-names="nodeNames"
      :mission-duration="missionDuration"
      :current-time-offset="simulationTime"
      :svg-width="1920"
      :svg-height="200"
      :past-node-density-factor="timelineConfig?.pastNodeDensityFactor"
      :future-node-density-factor="timelineConfig?.futureNodeDensityFactor"
    />
  </div>
</template>
