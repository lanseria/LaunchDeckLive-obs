<script setup lang="ts">
import { useI18n } from '#imports'
import { useDisplayStore } from '~/composables/store/display'

// 动态导入仪表盘组件
const SpaceXFalcon9Dashboard = defineAsyncComponent(() => import('~/components/Dashboards/SpaceXFalcon9.vue'))
const SpaceLen1Dashboard = defineAsyncComponent(() => import('~/components/Dashboards/SpaceLen1.vue'))

const displayStore = useDisplayStore()
const { t } = useI18n()

const hasReceivedOnce = ref(false)
const videoRef = useTemplateRef('videoRef')

// 使用 shallowRef 来存储当前仪表盘组件的引用
const currentDashboardComponent = shallowRef<any>(SpaceXFalcon9Dashboard) // 默认 SpaceX

// 监听 selectedDashboardStyle 的变化来切换组件
watch(() => displayStore.telemetry.selectedDashboardStyle, (newStyle) => {
  if (newStyle === 'SpaceXFalcon9') {
    currentDashboardComponent.value = SpaceXFalcon9Dashboard
  }
  else if (newStyle === 'SpaceLen1') {
    currentDashboardComponent.value = SpaceLen1Dashboard
  }
  else {
    currentDashboardComponent.value = SpaceXFalcon9Dashboard // 默认或回退
  }
}, { immediate: true })

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
        muted
        playsinline
        class="h-full w-full left-0 top-0 absolute z-0 object-cover"
        preload="auto"
        @loadedmetadata="() => {
          // 元数据加载后，如果 controlStore 发送了 syncVideoToTime，可以尝试同步
          if (displayStore.telemetry.syncVideoToTime !== undefined && videoRef && displayStore.telemetry.videoConfig?.type === 'local') {
            // console.log('Video metadata loaded, attempting initial sync to:', displayStore.telemetry.syncVideoToTime);
            videoRef!.currentTime = Math.max(0, displayStore.telemetry.syncVideoToTime);
            // 如果此时需要播放但浏览器阻止了，isPlaying watch 会处理后续的 .play() 尝试
          }
        }"
      >
        <source v-if="currentVideoSource" :src="currentVideoSource" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <!-- 动态仪表盘组件 -->
      <component
        :is="currentDashboardComponent"
        v-if="displayStore.isConnected"
        :telemetry="displayStore.telemetry"
        :has-received-once="hasReceivedOnce"
        :translated-current-event-name="translatedCurrentEventName"
      />
      <div v-else class="flex items-center inset-0 justify-center absolute z-10">
        <p class="text-xl text-yellow-400 font-mono">
          {{ t('waitingForData') }}
        </p>
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
