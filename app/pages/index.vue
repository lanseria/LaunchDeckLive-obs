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
const showPlayButton = ref(false) // 用于处理有声自动播放失败

// 使用 shallowRef 来存储当前仪表盘组件的引用
const currentDashboardComponent = shallowRef<any>(SpaceXFalcon9Dashboard) // 默认 SpaceX

// --- 视频同步优化相关状态 ---
const isSeeking = ref(false) // 寻址状态标志
let seekingTimeoutId: NodeJS.Timeout | null = null // 寻址超时定时器ID
const SYNC_TOLERANCE = 0.75 // 视频同步的容差（秒），可以调整
const SEEK_TIMEOUT_MS = 2000 // 寻址操作的超时时间（毫秒）
// ---

// --- 存储 onCanPlay 处理器的引用，以便移除 ---
let onCanPlayHandler: (() => void) | null = null
// ---

onMounted(() => {
  console.log('[INDEX.VUE] Mounted, initializing displayStore')
  displayStore.initialize()
  if (videoRef.value) {
    videoRef.value.addEventListener('seeked', handleVideoSeeked)
    videoRef.value.addEventListener('error', handleVideoError) // 添加错误监听
    videoRef.value.addEventListener('stalled', handleVideoStalled) // 监听卡顿
    videoRef.value.addEventListener('waiting', handleVideoWaiting) // 监听缓冲
  }
})

onBeforeUnmount(() => {
  // eslint-disable-next-line no-console
  console.log('[INDEX.VUE] BeforeUnmount, disposing displayStore')
  displayStore.dispose()
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.removeEventListener('seeked', handleVideoSeeked)
    videoRef.value.removeEventListener('error', handleVideoError)
    videoRef.value.removeEventListener('stalled', handleVideoStalled)
    videoRef.value.removeEventListener('waiting', handleVideoWaiting)
    if (onCanPlayHandler) { // 确保移除 canplay 监听器
      videoRef.value.removeEventListener('canplay', onCanPlayHandler)
      onCanPlayHandler = null
    }
    videoRef.value.removeAttribute('src')
    videoRef.value.load() // 可能会触发错误，但通常是安全的
  }
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
})

// --- 视频事件处理器 ---
function handleVideoSeeked() {
  // console.log(`[VIDEO EVENT] Seeked to: ${videoRef.value?.currentTime}. Resetting seeking flag.`);
  isSeeking.value = false
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
  seekingTimeoutId = null

  if (displayStore.telemetry.isPlaying && videoRef.value?.paused) {
    // console.log("[VIDEO EVENT] Attempting to play video after seeked event because it was paused.");
    playVideoWithSound()
  }
}

function handleVideoError(event: Event) {
  console.error('[VIDEO EVENT] Video Error:', event, videoRef.value?.error)
  isSeeking.value = false // 发生错误时重置寻址标志
  if (seekingTimeoutId)
    clearTimeout(seekingTimeoutId)
  showPlayButton.value = false // 视频错误时可能不适合显示播放按钮
}
function handleVideoStalled() {
  console.warn('[VIDEO EVENT] Video stalled (可能是网络问题或数据不足)')
  // 这里可以考虑显示一个缓冲指示器
}
function handleVideoWaiting() {
  console.warn('[VIDEO EVENT] Video waiting for data (buffering)')
  // 这里也可以考虑显示缓冲指示器
}
// ---

// --- 视频控制函数 ---
async function playVideoWithSound() {
  if (!videoRef.value || !displayStore.telemetry.videoConfig?.source)
    return // 如果没有视频源，则不操作

  try {
    showPlayButton.value = false
    // console.log("[VIDEO CONTROL] Attempting to play video...");
    await videoRef.value.play()
    // console.log("[VIDEO CONTROL] Video playing.");
  }
  catch (error: any) {
    console.error('[VIDEO CONTROL] Video play failed:', error.name, error.message)
    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
      showPlayButton.value = true
    }
  }
}

function pauseVideo() {
  if (videoRef.value) {
    videoRef.value.pause()
    // console.log("[VIDEO CONTROL] Video paused.");
    showPlayButton.value = false
    // 如果在暂停时正在寻址，也应该取消寻址状态（尽管不常见）
    // if (isSeeking.value) {
    //   isSeeking.value = false;
    //   if (seekingTimeoutId) clearTimeout(seekingTimeoutId);
    // }
  }
}

function seekVideo(targetTime: number) {
  if (!videoRef.value || isSeeking.value || videoRef.value.readyState === 0) {
    // console.log(`[VIDEO CONTROL] Seek ignored. isSeeking: ${isSeeking.value}, readyState: ${videoRef.value?.readyState}`);
    return
  }

  if (Math.abs(videoRef.value.currentTime - targetTime) <= SYNC_TOLERANCE) {
    // console.log(`[VIDEO CONTROL] Video already close to target: ${targetTime}. No seek needed.`);
    return
  }

  console.log(`[VIDEO CONTROL] Requesting seek to: ${targetTime} (current: ${videoRef.value.currentTime.toFixed(2)})`)
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

// ---

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

watch(() => displayStore.telemetry.isPlaying, (newIsPlaying) => {
  if (displayStore.telemetry.videoConfig?.type === 'local') {
    if (newIsPlaying) {
      playVideoWithSound()
    }
    else {
      pauseVideo()
    }
  }
})

watch(() => displayStore.telemetry.syncVideoToTime, (newVideoTime) => {
  if (displayStore.telemetry.videoConfig?.type === 'local' && newVideoTime !== undefined) {
    if (videoRef.value) { // 确保 videoRef 已挂载
      if (videoRef.value.readyState > 0) {
        seekVideo(newVideoTime)
      }
      else if (newVideoTime > 0) { // readyState 为 0，但期望跳转
        // 移除旧的监听器（如果有）
        if (onCanPlayHandler && videoRef.value) {
          videoRef.value.removeEventListener('canplay', onCanPlayHandler)
        }
        onCanPlayHandler = () => {
          if (videoRef.value && newVideoTime !== undefined) {
            console.log(`[VIDEO EVENT] Syncing video (onCanPlay) to: ${newVideoTime}`)
            seekVideo(newVideoTime) // 使用 seekVideo
            if (onCanPlayHandler && videoRef.value) { // 再次检查确保移除正确的引用
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
  // console.log('[INDEX.VUE] videoConfig.source watcher. New:', newSource, 'Old:', oldSource);
  if (videoRef.value) {
    if (newSource && newSource !== oldSource) {
      const newFullSourcePath = window.location.origin + newSource
      // 只有当 src 真的变了，或者 video 元素还没有 src 时才更新
      if (videoRef.value.currentSrc !== newFullSourcePath || !videoRef.value.hasAttribute('src')) {
        console.log(`[INDEX.VUE] Setting new video source and loading: ${newSource}`)
        videoRef.value.src = newSource
        videoRef.value.load()
        isSeeking.value = false // 新视频源加载，重置寻址状态
        if (seekingTimeoutId)
          clearTimeout(seekingTimeoutId)
        showPlayButton.value = false // 重置播放按钮状态
      }
    }
    else if (!newSource && oldSource) {
      console.log('[INDEX.VUE] Video source removed. Clearing video src.')
      videoRef.value.pause() // 先暂停
      videoRef.value.removeAttribute('src')
      videoRef.value.load() // 清空
      isSeeking.value = false
      if (seekingTimeoutId)
        clearTimeout(seekingTimeoutId)
      showPlayButton.value = false
    }
  }
}, { immediate: false }) // immediate: false 依然推荐

watch(() => [
  displayStore.telemetry.simulationTime,
  displayStore.telemetry.altitude,
  displayStore.telemetry.speed,
  displayStore.telemetry.isPlaying,
  displayStore.telemetry.currentEventNameKey,
  displayStore.isConnected,
], (newValues) => {
  const newIsConnected = newValues[5]
  // ... (hasReceivedOnce 逻辑)
  if (!hasReceivedOnce.value && newIsConnected && (newValues[0] !== 0 || newValues[1] !== 0 || newValues[2] !== 0 || newValues[3] || newValues[4] !== null)) {
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
</script>

<template>
  <Adapter>
    <div class="bg-black h-full w-full relative overflow-hidden">
      <!-- 背景视频 -->
      <video
        ref="videoRef"
        key="launch-video"
        playsinline
        class="h-full w-full left-0 top-0 absolute z-0 object-cover"
        preload="auto"
        @loadedmetadata="() => {
          // console.log('[VIDEO EVENT] LoadedMetadata. Duration:', videoRef?.duration);
          if (displayStore.telemetry.syncVideoToTime !== undefined && videoRef && displayStore.telemetry.videoConfig?.type === 'local') {
            // console.log('[VIDEO EVENT] Initial sync on loadedmetadata to:', displayStore.telemetry.syncVideoToTime);
            // 初始同步也应该通过 seekVideo，但要确保 isSeeking 不会阻止它
            const initialSyncTime = Math.max(0, displayStore.telemetry.syncVideoToTime);
            if (Math.abs(videoRef!.currentTime - initialSyncTime) > SYNC_TOLERANCE) {
              isSeeking = false; // 允许初始 seek
              seekVideo(initialSyncTime);
            }
          }
          // 如果此时需要播放但浏览器阻止了，isPlaying watch 会处理后续的 .play() 尝试
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
        <!-- ... 播放按钮 SVG 和文字 ... -->
        <svg class="text-white opacity-80 h-16 w-16 transition-opacity hover:opacity-100 md:h-24 md:w-24" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
        <p class="text-lg text-white mt-2 md:text-xl">
          {{ t('clickToPlayVideo') }}
        </p>
      </div>
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
      <!-- ... (底部控制台链接) ... -->
      <div class="text-xs text-gray-500 opacity-70 transition-opacity bottom-1 right-2 absolute z-20 hover:opacity-100">
        {{ t('ensureControlOpen', [t('controlPanelLinkText')]) }}
        <NuxtLink to="/control" target="_blank" class="text-blue-400 hover:underline">
          {{ t('controlPanelLinkText') }}
        </NuxtLink>
      </div>
    </div>
  </Adapter>
</template>
