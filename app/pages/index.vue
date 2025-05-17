<script setup lang="ts">
import { useI18n } from '#imports'
import { useDisplayStore } from '~/composables/store/display'

const displayStore = useDisplayStore()
const { t } = useI18n()

const hasReceivedOnce = ref(false)
const videoRef = useTemplateRef('videoRef')

onMounted(() => {
  displayStore.initialize()
})

onUnmounted(() => {
  displayStore.dispose()
})

watch(() => displayStore.telemetry.isPlaying, (newIsPlaying, oldIsPlaying) => {
  if (videoRef.value && displayStore.telemetry.videoConfig?.type === 'local') {
    if (newIsPlaying) {
      // 尝试播放，处理 Promise
      const playPromise = videoRef.value.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Video play failed:', error)
          // 浏览器可能因为用户未交互而不允许自动播放，此时可以显示一个播放按钮
        })
      }
    }
    else {
      videoRef.value.pause()
    }
  }
})

watch(() => displayStore.telemetry.syncVideoToTime, (newVideoTime) => {
  if (videoRef.value && displayStore.telemetry.videoConfig?.type === 'local' && newVideoTime !== undefined) {
    // 检查视频是否已准备好（readyState > 0），以及当前时间是否与目标时间显著不同
    // 避免在视频还未加载或微小差异时频繁设置 currentTime
    if (videoRef.value.readyState > 0 && Math.abs(videoRef.value.currentTime - newVideoTime) > 0.5) { // 0.5秒的容差
      // console.log(`Syncing video to: ${newVideoTime}, current: ${videoRef.value.currentTime}`);
      videoRef.value.currentTime = newVideoTime
    }
    else if (videoRef.value.readyState === 0 && newVideoTime > 0) {
      // 如果视频未加载但需要跳转，可以在 canplay 事件后再设置
      const onCanPlay = () => {
        if (videoRef.value && newVideoTime !== undefined) { // 再次检查 videoRef.value
          // console.log(`Syncing video (onCanPlay) to: ${newVideoTime}`);
          videoRef.value.currentTime = newVideoTime
          videoRef.value.removeEventListener('canplay', onCanPlay)
        }
      }
      videoRef.value.addEventListener('canplay', onCanPlay)
    }
  }
})

watch(() => [
  displayStore.telemetry.simulationTime,
  displayStore.telemetry.altitude,
  displayStore.telemetry.speed,
  displayStore.telemetry.isPlaying,
  displayStore.telemetry.currentEventNameKey,
  displayStore.isConnected,
], (newValues) => {
  const newTime = newValues[0]
  const newAltitude = newValues[1]
  const newSpeed = newValues[2]
  const newIsPlaying = newValues[3]
  const newEventNameKey = newValues[4]
  const newIsConnected = newValues[5]

  if (!hasReceivedOnce.value && newIsConnected && (
    newTime !== 0
    || newAltitude !== 0
    || newSpeed !== 0
    || newIsPlaying
    || newEventNameKey !== null
  )) {
    hasReceivedOnce.value = true
  }
  if (!newIsConnected) {
    hasReceivedOnce.value = false
  }
}, { deep: true, immediate: true })

const translatedCurrentEventName = computed(() => {
  const key = displayStore.telemetry.currentEventNameKey
  if (!key)
    return t('noEvent')
  return t(key)
})

// 当 videoConfig 变化时更新视频源
const currentVideoSource = computed(() => {
  return displayStore.telemetry.videoConfig?.type === 'local'
    ? displayStore.telemetry.videoConfig.source
    : null // 未来可以是直播流 URL
})

watch(() => [
  // ... (hasReceivedOnce 的 watch 依赖)
  displayStore.telemetry.videoConfig?.source, // 监听视频源变化
], (newValues) => {
  // ... (hasReceivedOnce 的逻辑)
  const newIsConnected = newValues[5] // 假设 isConnected 是第6个元素
  // ...
  if (newIsConnected && videoRef.value && displayStore.telemetry.videoConfig?.type === 'local') {
    if (currentVideoSource.value && videoRef.value.currentSrc !== window.location.origin + currentVideoSource.value) {
      // console.log("Loading new video source:", currentVideoSource.value)
      videoRef.value.load() // 如果源变化了，重新加载视频
    }
  }
}, { deep: true, immediate: true })
</script>

<template>
  <Adapter>
    <div class="bg-black h-full w-full relative overflow-hidden">
      <!-- 背景视频 -->
      <video
        ref="videoRef"
        key="launch-video"
        loop
        muted
        playsinline
        class="h-full w-full left-0 top-0 absolute z-0 object-cover"
        preload="auto"
        @loadedmetadata="() => {
          // 元数据加载后，如果 controlStore 发送了 syncVideoToTime，可以尝试同步
          if (displayStore.telemetry.syncVideoToTime !== undefined && videoRef && displayStore.telemetry.videoConfig?.type === 'local') {
            // console.log('Video metadata loaded, attempting initial sync to:', displayStore.telemetry.syncVideoToTime);
            videoRef.currentTime = Math.max(0, displayStore.telemetry.syncVideoToTime);
            // 如果此时需要播放但浏览器阻止了，isPlaying watch 会处理后续的 .play() 尝试
          }
        }"
      >
        <source v-if="currentVideoSource" :src="currentVideoSource" type="video/mp4">
        Your browser does not support the video tag.
      </video>

      <!-- 仪表盘容器 (叠加在视频下方) -->
      <div class="text-white font-mono p-4 bg-black bg-opacity-70 select-none bottom-0 left-0 right-0 absolute z-10 backdrop-blur-sm lg:p-8 md:p-6">
        <div class="mb-4 text-center md:mb-6">
          <h1 class="text-2xl font-bold tracking-wider mb-1 md:text-4xl sm:text-3xl">
            {{ displayStore.telemetry.missionName || t('displayPanelTitle') }}
          </h1>
          <p class="text-sm text-gray-300 mb-2 md:text-lg sm:text-base">
            {{ displayStore.telemetry.vehicleName || t('standby') }}
          </p>
          <p v-if="!displayStore.isConnected || (!hasReceivedOnce && displayStore.isConnected)" class="text-base text-yellow-400 md:text-lg">
            {{ t('waitingForData') }}
          </p>
          <p v-if="displayStore.isConnected && !displayStore.telemetry.isPlaying && hasReceivedOnce" class="text-lg text-red-400 font-semibold md:text-xl">
            {{ t('simulationPausedStoppedFull') }}
          </p>
          <p v-if="displayStore.telemetry.isPlaying && hasReceivedOnce" class="text-lg text-green-400 font-semibold animate-pulse md:text-xl">
            {{ t('simulationRunningFull') }}
          </p>
        </div>

        <div class="mb-4 text-center gap-2 grid grid-cols-3 md:mb-6 md:gap-6 sm:gap-4">
          <div>
            <div class="text-xs text-gray-400 uppercase md:text-base sm:text-sm">
              {{ t('met') }} (T{{ displayStore.telemetry.simulationTime < 0 ? '' : '+' }})
            </div>
            <div class="text-2xl font-bold lg:text-5xl md:text-4xl sm:text-3xl">
              {{ Math.abs(displayStore.telemetry.simulationTime).toFixed(1) }} <span class="text-lg md:text-xl">s</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400 uppercase md:text-base sm:text-sm">
              {{ t('altitude') }}
            </div>
            <div class="text-2xl font-bold lg:text-5xl md:text-4xl sm:text-3xl">
              {{ displayStore.telemetry.altitude.toFixed(0) }} <span class="text-lg md:text-xl">m</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400 uppercase md:text-base sm:text-sm">
              {{ t('speed') }}
            </div>
            <div class="text-2xl font-bold lg:text-5xl md:text-4xl sm:text-3xl">
              {{ displayStore.telemetry.speed.toFixed(0) }} <span class="text-lg md:text-xl">m/s</span>
            </div>
          </div>
        </div>

        <div class="text-center">
          <div class="text-sm text-gray-400 uppercase md:text-lg sm:text-base">
            {{ t('currentEvent') }}
          </div>
          <div class="text-xl text-cyan-400 font-semibold flex h-8 truncate items-center justify-center md:text-3xl sm:text-2xl md:h-10">
            {{ translatedCurrentEventName }}
          </div>
          <div v-if="displayStore.telemetry.currentEventPayload" class="text-xs text-gray-300 mt-1 p-1 rounded bg-gray-800 bg-opacity-50 max-w-full inline-block truncate sm:text-sm">
            {{ t('eventData') }} {{ displayStore.telemetry.currentEventPayload }}
          </div>
        </div>
      </div>

      <div class="text-xs text-gray-500 opacity-70 transition-opacity bottom-1 right-2 absolute z-20 hover:opacity-100">
        {{ t('ensureControlOpen', [t('controlPanelLinkText')]) }}
        <NuxtLink to="/control" target="_blank" class="text-blue-400 hover:underline">
          {{ t('controlPanelLinkText') }}
        </NuxtLink>
      </div>
    </div>
  </Adapter>
</template>
