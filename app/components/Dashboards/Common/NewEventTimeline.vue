<script setup lang="ts">
import { formatMET } from '~/composables/utils/formatters'

const props = defineProps<{
  events: MissionEvent[] // 使用全局类型
  currentTime: number
  pixelsPerSecond?: number
  focusLineFromTop?: number
  timelineHeight?: number
}>()

const { t } = useI18n() // 假设 useI18n 是自动导入的

const timelineEventsContainerRef = ref<HTMLElement | null>(null)
// timelineScrollOffset 变量不再直接用于 translateY，而是通过计算每个事件的 top
// 和容器的 transform 来实现滚动效果，所以这个 ref 可能不再需要了，
// 或者其用途已改变。基于之前的代码，transform 是在容器上，所以我们保留它。
// const timelineScrollOffset = ref(0); // 这在之前的实现中用于容器的 translateY

const DEFAULT_PIXELS_PER_SECOND = 5
const DEFAULT_FOCUS_LINE_OFFSET = 100
const DEFAULT_TIMELINE_HEIGHT = 200

const effectivePPS = computed(() => props.pixelsPerSecond || DEFAULT_PIXELS_PER_SECOND)
const effectiveFocusLineOffset = computed(() => props.focusLineFromTop || DEFAULT_FOCUS_LINE_OFFSET)
const effectiveTimelineHeight = computed(() => props.timelineHeight || DEFAULT_TIMELINE_HEIGHT)

const visibleEventsWindow = computed(() => {
  if (!props.events || props.events.length === 0)
    return []
  const secondsBefore = effectiveFocusLineOffset.value / effectivePPS.value
  const secondsAfter = (effectiveTimelineHeight.value - effectiveFocusLineOffset.value) / effectivePPS.value
  const bufferSeconds = 30
  const minTime = props.currentTime - secondsBefore - bufferSeconds
  const maxTime = props.currentTime + secondsAfter + bufferSeconds
  return props.events.filter(event => event.time >= minTime && event.time <= maxTime)
})

// watch(() => props.currentTime, (newTime) => {
//   // timelineScrollOffset.value = -(newTime * effectivePPS.value); // 这个值用于容器的 translateY
// }, { immediate: true });
// 上面的 watch 是针对之前 translateY(timelineScrollOffset) 的，现在 translateY 直接用 props.currentTime 计算

function getEventStatus(eventTime: number): 'past' | 'currentFocus' | 'future' {
  const timeDifference = Math.abs(eventTime - props.currentTime)
  const tolerancePixels = 3 // 定义一个更小的像素容差来确定 "currentFocus"
  if (timeDifference < (1 / effectivePPS.value) * tolerancePixels) {
    return 'currentFocus'
  }
  else if (eventTime < props.currentTime) {
    return 'past'
  }
  return 'future'
}

function getEventTopPosition(eventTime: number): number {
  return eventTime * effectivePPS.value
}
</script>

<template>
  <div
    class="event-timeline text-xs relative md:text-sm"
    :style="{ height: `${effectiveTimelineHeight}px`, overflow: 'hidden' }"
  >
    <!-- 标题 -->
    <!-- <div class="text-gray-400 mb-1 px-1 text-right uppercase left-0 right-0 top-0 absolute z-20 md:mb-2">
      {{ t('missionTimelineTitle') }}
    </div> -->
    <!-- 可选的垂直线 -->
    <div>
      <div
        class="bg-cyan-400 opacity-50 w-2px bottom-1/2 right-11px top-0 absolute z-1"
        aria-hidden="true"
      /><div
        class="bg-gray-600 opacity-50 w-2px bottom-0 right-11px top-1/2 absolute"
        aria-hidden="true"
      />
    </div>
    <!-- 当前时间焦点线 -->
    <!-- <div
      class="current-time-line bg-red-500 h-px w-full left-0 right-0 absolute z-10"
      :style="{ top: `${effectiveFocusLineOffset}px` }"
      aria-hidden="true"
    /> -->

    <!-- 事件列表容器，应用 translateY 使其内容滚动 -->
    <div
      ref="timelineEventsContainerRef"
      class="left-0 right-0 top-0 absolute"
      :style="{ transform: `translateY(${effectiveFocusLineOffset - (props.currentTime * effectivePPS)}px)` }"
    >
      <!-- 事件项 -->
      <div
        v-for="event in visibleEventsWindow"
        :key="event.eventNameKey + event.time"
        class="event-item-on-timeline pr-2 flex items-center left-0 right-0 absolute md:pr-3"
        :style="{ top: `${getEventTopPosition(event.time)}px` }"
        :class="{
          'opacity-50 text-gray-500': getEventStatus(event.time) === 'past',
          'font-semibold text-cyan-400 scale-100 z-10': getEventStatus(event.time) === 'currentFocus',
          'text-gray-300': getEventStatus(event.time) === 'future',
        }"
      >
        <!-- 事件名称和时间的容器，用于靠右对齐 -->
        <div class="mr-3 flex flex-grow items-center justify-end space-x-2 md:mr-4">
          <span class="event-name px-1 py-px text-right rounded bg-gray-800 bg-opacity-70 max-w-[200px] truncate md:max-w-[220px]">
            {{ t(event.eventNameKey) }}
          </span>
          <span class="event-time-met text-[0.6rem] text-gray-500 flex-shrink-0 md:text-xs">
            {{ formatMET(event.time) }}
          </span>
        </div>

        <!-- 事件点 (dot) -->
        <div
          class="dot border border-gray-700 rounded-full h-1.5 w-1.5 top-1/2 absolute dark:border-gray-500 md:h-2 md:w-2 -translate-y-1/2"
          :style="{ right: `8px` }"
          :class="{
            'bg-gray-600 dark:bg-gray-400': getEventStatus(event.time) === 'past',
            'bg-cyan-400 ring-2 ring-offset-1 ring-offset-gray-900 dark:ring-offset-gray-800 ring-cyan-500 scale-125': getEventStatus(event.time) === 'currentFocus',
            'bg-gray-400 dark:bg-gray-300': getEventStatus(event.time) === 'future',
          }"
        />
      </div>
    </div>

    <!-- 无事件提示 -->
    <div v-if="(!events || events.length === 0) && visibleEventsWindow.length === 0" class="text-gray-500 flex items-center inset-0 justify-center absolute">
      {{ t('noEventsInTimeline') }}
    </div>
  </div>
</template>

<style scoped>
.current-time-line::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-right: 6px solid red; /* 箭头指向左，表示时间线在右侧 */
}

.event-item-on-timeline {
  height: 24px; /* 示例高度，确保与你的内容和设计匹配 */
  line-height: 24px;
  transition:
    opacity 0.3s ease-in-out,
    /* ease-in-out 更平滑 */ transform 0.3s ease-in-out,
    color 0.3s ease-in-out;
  will-change: transform, opacity; /* 提示浏览器这些属性会变化，可能有助于性能 */
}
</style>
