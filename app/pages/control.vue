<script setup lang="ts">
import { useDisplayStore } from '~/composables/store/display'

// 动态导入仪表盘组件
const SpaceXFalcon9Dashboard = defineAsyncComponent(() => import('~/components/Dashboards/SpaceXFalcon9.vue'))
const SpaceLen1Dashboard = defineAsyncComponent(() => import('~/components/Dashboards/SpaceLen1.vue'))

const displayStore = useDisplayStore()
const hasReceivedOnce = ref(false)
const videoRef = useTemplateRef('videoRef')
const showPlayButton = ref(false)

const currentDashboardComponent = shallowRef<any>(SpaceLen1Dashboard)

const isSeeking = ref(false)
let seekingTimeoutId: NodeJS.Timeout | null = null
const SYNC_TOLERANCE = 0.75
const SEEK_TIMEOUT_MS = 2000
let onCanPlayHandler: (() => void) | null = null

onMounted(() => {
  displayStore.initialize()
  if (videoRef.value) {
    videoRef.value.addEventListener('seeked', handleVideoSeeked)
    videoRef.value.addEventListener('error', handleVideoError)
    videoRef.value.addEventListener('stalled', handleVideoStalled)
    videoRef.value.addEventListener('waiting', handleVideoWaiting)
  }
})

onBeforeUnmount(() => {
  displayStore.dispose()
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.removeEventListener('seeked', handleVideoSeeked)
    videoRef.value.removeEventListener('error', handleVideoError)
    videoRef.value.removeEventListener('stalled', handleVideoStalled)
    videoRef.value.removeEventListener('waiting', handleVideoWaiting)
    if (onCanPlayHandler) {
      videoRef.value.removeEventListener('canplay', onCanPlayHandler)
      onCanPlayHandler = null
    }
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
})

function handleVideoSeeked() {
  isSeeking.value = false
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
  seekingTimeoutId = null
  if (displayStore.telemetry.isPlaying && videoRef.value?.paused)
    playVideoWithSound()
}

function handleVideoError(event: Event) {
  console.error('[VIDEO EVENT] Video Error:', event, videoRef.value?.error)
  isSeeking.value = false
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
  showPlayButton.value = false
}

function handleVideoStalled() {
  console.warn('[VIDEO EVENT] Video stalled')
}
function handleVideoWaiting() {
  console.warn('[VIDEO EVENT] Video waiting for data (buffering)')
}

async function playVideoWithSound() {
  if (!videoRef.value || !displayStore.telemetry.videoConfig?.source)
    return

  try {
    showPlayButton.value = false
    await videoRef.value.play()
  }
  catch (error: any) {
    console.error('[VIDEO CONTROL] Video play failed:', error.name, error.message)
    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError')
      showPlayButton.value = true
  }
}

function pauseVideo() {
  if (videoRef.value) {
    videoRef.value.pause()
    showPlayButton.value = false
  }
}

function seekVideo(targetTime: number) {
  if (!videoRef.value || isSeeking.value || videoRef.value.readyState === 0)
    return

  if (Math.abs(videoRef.value.currentTime - targetTime) <= SYNC_TOLERANCE)
    return

  isSeeking.value = true
  videoRef.value.currentTime = targetTime

  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
  seekingTimeoutId = setTimeout(() => {
    if (isSeeking.value) {
      console.warn(`[VIDEO CONTROL] Seek to ${targetTime} timed out. Resetting seeking flag.`)
      isSeeking.value = false
    }
  }, SEEK_TIMEOUT_MS)
}

watch(() => displayStore.telemetry.selectedDashboardStyle, (newStyle) => {
  if (newStyle === 'SpaceXFalcon9')
    currentDashboardComponent.value = SpaceXFalcon9Dashboard
  else if (newStyle === 'SpaceLen1')
    currentDashboardComponent.value = SpaceLen1Dashboard
  else
    currentDashboardComponent.value = SpaceLen1Dashboard
}, { immediate: true })

watch(() => displayStore.telemetry.isPlaying, (newIsPlaying) => {
  if (displayStore.telemetry.videoConfig?.type === 'local') {
    if (newIsPlaying)
      playVideoWithSound()
    else
      pauseVideo()
  }
})

watch(() => displayStore.telemetry.syncVideoToTime, (newVideoTime) => {
  if (displayStore.telemetry.videoConfig?.type === 'local' && newVideoTime !== undefined) {
    if (videoRef.value) {
      if (videoRef.value.readyState > 0) {
        seekVideo(newVideoTime)
      }
      else if (newVideoTime > 0) {
        if (onCanPlayHandler && videoRef.value)
          videoRef.value.removeEventListener('canplay', onCanPlayHandler)

        onCanPlayHandler = () => {
          if (videoRef.value && newVideoTime !== undefined) {
            seekVideo(newVideoTime)
            if (onCanPlayHandler && videoRef.value) {
              videoRef.value.removeEventListener('canplay', onCanPlayHandler)
              onCanPlayHandler = null
            }
          }
        }
        videoRef.value.addEventListener('canplay', onCanPlayHandler)
      }
    }
  }
})

watch(() => displayStore.telemetry.videoConfig?.source, (newSource, oldSource) => {
  if (videoRef.value) {
    if (newSource && newSource !== oldSource) {
      const newFullSourcePath = window.location.origin + newSource
      if (videoRef.value.currentSrc !== newFullSourcePath || !videoRef.value.hasAttribute('src')) {
        videoRef.value.src = newSource
        videoRef.value.load()
        isSeeking.value = false
        if (seekingTimeoutId)
          clearTimeout(seekingTimeoutId)
        showPlayButton.value = false
      }
    }
    else if (!newSource && oldSource) {
      videoRef.value.pause()
      videoRef.value.removeAttribute('src')
      videoRef.value.load()
      isSeeking.value = false
      if (seekingTimeoutId)
        clearTimeout(seekingTimeoutId)
      showPlayButton.value = false
    }
  }
}, { immediate: false })

watch(() => [
  displayStore.telemetry.simulationTime,
  displayStore.telemetry.altitude,
  displayStore.telemetry.speed,
  displayStore.telemetry.isPlaying,
  displayStore.telemetry.currentEventName,
  displayStore.isConnected,
], (newValues) => {
  const newIsConnected = newValues[5]
  if (!hasReceivedOnce.value && newIsConnected && (newValues[0] !== 0 || newValues[1] !== 0 || newValues[2] !== 0 || newValues[3] || newValues[4] !== null))
    hasReceivedOnce.value = true

  if (!newIsConnected)
    hasReceivedOnce.value = false
}, { deep: true, immediate: true })
</script>

<template>
  <Adapter>
    <div class="bg-black h-full w-full relative overflow-hidden">
      <video
        ref="videoRef"
        key="launch-video"
        playsinline
        class="h-full w-full left-0 top-0 absolute z-0 object-cover"
        preload="auto"
        @loadedmetadata="() => {
          if (displayStore.telemetry.syncVideoToTime !== undefined && videoRef && displayStore.telemetry.videoConfig?.type === 'local') {
            const initialSyncTime = Math.max(0, displayStore.telemetry.syncVideoToTime);
            if (Math.abs(videoRef!.currentTime - initialSyncTime) > SYNC_TOLERANCE) {
              isSeeking = false;
              seekVideo(initialSyncTime);
            }
          }
          if (displayStore.telemetry.isPlaying && videoRef?.paused) {
            playVideoWithSound();
          }
        }"
        @error="handleVideoError"
        @seeked="handleVideoSeeked"
        @stalled="handleVideoStalled"
        @waiting="handleVideoWaiting"
      >
        Your browser does not support the video tag.
      </video>
      <div
        v-if="showPlayButton"
        class="bg-black bg-opacity-50 flex flex-col cursor-pointer items-center inset-0 justify-center absolute z-20"
        @click="playVideoWithSound"
      >
        <svg class="text-white opacity-80 h-16 w-16 transition-opacity hover:opacity-100 md:h-24 md:w-24" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
        <p class="text-lg text-white mt-2 md:text-xl">
          点击播放视频
        </p>
      </div>
      <component
        :is="currentDashboardComponent"
        v-if="displayStore.isConnected"
        :telemetry="displayStore.telemetry"
        :has-received-once="hasReceivedOnce"
      />
      <div v-else class="flex items-center inset-0 justify-center absolute z-10">
        <p class="text-xl text-yellow-400 font-mono">
          等待来自控制面板的数据...
        </p>
      </div>
      <div class="text-xs text-gray-500 opacity-70 transition-opacity bottom-1 right-2 absolute z-20 hover:opacity-100">
        请确保
        <NuxtLink to="/" target="_blank" class="text-blue-400 hover:underline">
          控制面板
        </NuxtLink>
        已打开并运行。
      </div>
    </div>
  </Adapter>
</template>
