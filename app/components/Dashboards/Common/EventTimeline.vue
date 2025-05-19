<script setup lang="ts">
import { useI18n } from '#imports'
import { formatMET } from '~/composables/utils/formatters'

const props = defineProps<{
  events: MissionEvent[]
  currentTime: number // 当前的 simulationTime (MET)
  maxVisibleEvents?: number // 可选：限制显示事件的数量
}>()

const { t } = useI18n()

// 确定当前事件的索引
const currentEventRealIndex = computed(() => {
  if (!props.events || props.events.length === 0)
    return -1
  let foundIndex = -1
  for (let i = props.events.length - 1; i >= 0; i--) {
    if (props.events[i]!.time <= props.currentTime) {
      foundIndex = i
      break
    }
  }
  return foundIndex // 返回最后一个已发生或正在发生的事件的索引
})

// 根据当前事件动态地选择要显示的事件范围
const visibleEvents = computed(() => {
  if (!props.events || props.events.length === 0)
    return []

  const maxEvents = props.maxVisibleEvents || 5 // 默认显示5条
  const totalEvents = props.events.length
  let startIndex = 0
  let endIndex = totalEvents

  if (totalEvents <= maxEvents) {
    // 如果总事件数小于等于最大显示数，则全部显示
    return props.events
  }

  // 优先显示当前事件和其后的事件
  // 让当前事件尽量居中或靠上
  // 例如：显示当前事件，前面1-2个，后面2-3个

  let centerIndex = currentEventRealIndex.value
  if (centerIndex === -1) { // 如果还没有事件发生 (currentTime < firstEvent.time)
    centerIndex = 0 // 从第一个事件开始显示
  }

  // 计算理想的开始和结束索引
  // 尝试让 centerIndex 在显示窗口的 (例如) 1/3 处或中间
  const pivotOffset = Math.floor(maxEvents / 3) // 比如让当前事件显示在列表的1/3处
  // const pivotOffset = Math.floor(maxEvents / 2); // 或者让当前事件尽量居中

  startIndex = Math.max(0, centerIndex - pivotOffset)
  endIndex = Math.min(totalEvents, startIndex + maxEvents)

  // 如果因为 centerIndex 靠后导致 endIndex 到达了 totalEvents，但显示的事件数不足 maxEvents
  // 则尝试从后往前调整 startIndex 以显示足够数量的事件
  if (endIndex === totalEvents && (endIndex - startIndex) < maxEvents) {
    startIndex = Math.max(0, endIndex - maxEvents)
  }

  return props.events.slice(startIndex, endIndex)
})

function getEventStatus(eventTime: number, eventIndex: number): 'past' | 'current' | 'future' {
  if (eventTime <= props.currentTime) {
    // 如果这是最后一个已发生或正在发生的事件
    if (eventIndex === currentEventRealIndex.value) {
      return 'current'
    }
    return 'past'
  }
  return 'future'
}
</script>

<template>
  <div class="event-timeline text-xs text-right md:text-sm">
    <div class="text-gray-400 mb-1 uppercase md:mb-2">
      {{ t('missionTimelineTitle') }}
      <!-- i18n: "任务时间轴" or "Timeline"  -->
    </div>
    <div class="relative space-y-1 md:space-y-1.5">
      <!-- 可选的垂直线 -->
      <div
        v-if="visibleEvents.length > 0"
        class="bg-gray-600 opacity-50 w-px bottom-0 right-[-10px] top-0 absolute md:right-[-12px]"
        aria-hidden="true"
      />

      <div
        v-for="(event, index) in visibleEvents"
        :key="index"
        class="event-item pl-3 flex items-center justify-end relative md:pl-4"
        :class="{
          'opacity-60': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'past',
          'font-semibold text-cyan-400': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'current',
          'text-gray-300': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'future',
        }"
      >
        <!-- 事件点 -->
        <div
          class="rounded-full h-1.5 w-1.5 right-[-12px] top-1/2 absolute md:h-2 md:w-2 -translate-y-1/2 md:right-[-16px]"
          :class="{
            'bg-gray-500': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'past',
            'bg-cyan-400 ring-1 ring-cyan-300 scale-125': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'current',
            'bg-gray-400': getEventStatus(event.time, props.events.findIndex(e => e.eventNameKey === event.eventNameKey && e.time === event.time)) === 'future',
          }"
        />
        <span class="event-name max-w-[70%] truncate md:max-w-[65%]">
          {{ t(event.eventNameKey) }}
        </span>
        <span class="event-time text-gray-500 ml-2 flex-shrink-0">
          {{ formatMET(event.time) }}
        </span>
      </div>
      <div v-if="visibleEvents.length === 0 && props.events.length > 0" class="text-gray-500">
        {{ t('timelineLoading') }}
        <!-- i18n: "时间轴加载中..." -->
      </div>
      <div v-if="props.events.length === 0" class="text-gray-500">
        {{ t('noEventsInTimeline') }}
        <!-- i18n: "无事件" -->
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 你可以根据需要添加更多自定义样式 */
.event-item {
  transition:
    opacity 0.3s ease-in-out,
    color 0.3s ease-in-out; /* 平滑过渡效果 */
}
/* 确保即使事件名为空，也占据一定空间 */
.event-name:empty::after {
  content: '...'; /* 或者其他占位符 */
  visibility: hidden;
}
</style>
