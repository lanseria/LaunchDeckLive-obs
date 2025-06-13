<script setup lang="ts">
import { formatMET } from '~/composables/utils/formatters'

const props = defineProps<{
  events: MissionEvent[]
  currentTime: number
  pixelsPerSecond?: number
  focusLineFromTop?: number
  timelineHeight?: number
}>()

const timelineEventsContainerRef = ref<HTMLElement | null>(null)

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

function getEventStatus(eventTime: number): 'past' | 'currentFocus' | 'future' {
  const timeDifference = Math.abs(eventTime - props.currentTime)
  const tolerancePixels = 3
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
    <div>
      <div
        class="bg-cyan-400 opacity-50 w-2px bottom-1/2 right-11px top-0 absolute z-1"
        aria-hidden="true"
      /><div
        class="bg-gray-600 opacity-50 w-2px bottom-0 right-11px top-1/2 absolute"
        aria-hidden="true"
      />
    </div>
    <div
      ref="timelineEventsContainerRef"
      class="left-0 right-0 top-0 absolute"
      :style="{ transform: `translateY(${effectiveFocusLineOffset - (props.currentTime * effectivePPS)}px)` }"
    >
      <div
        v-for="event in visibleEventsWindow"
        :key="event.eventName + event.time"
        class="event-item-on-timeline pr-2 flex items-center left-0 right-0 absolute md:pr-3"
        :style="{ top: `${getEventTopPosition(event.time)}px` }"
        :class="{
          'opacity-50 text-gray-500': getEventStatus(event.time) === 'past',
          'font-semibold text-cyan-400 scale-100 z-10': getEventStatus(event.time) === 'currentFocus',
          'text-gray-300': getEventStatus(event.time) === 'future',
        }"
      >
        <div class="mr-3 flex flex-grow items-center justify-end space-x-2 md:mr-4">
          <span class="event-name px-1 py-px text-right rounded bg-gray-800 bg-opacity-70 max-w-[200px] truncate md:max-w-[220px]">
            {{ event.eventName }}
          </span>
          <span class="event-time-met text-[0.6rem] text-gray-500 flex-shrink-0 md:text-xs">
            {{ formatMET(event.time) }}
          </span>
        </div>
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
    <div v-if="(!events || events.length === 0) && visibleEventsWindow.length === 0" class="text-gray-500 flex items-center inset-0 justify-center absolute">
      无事件记录
    </div>
  </div>
</template>

<style scoped>
.event-item-on-timeline {
  height: 24px;
  line-height: 24px;
  transition:
    opacity 0.3s ease-in-out,
    transform 0.3s ease-in-out,
    color 0.3s ease-in-out;
  will-change: transform, opacity;
}
</style>
