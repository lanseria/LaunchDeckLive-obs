<script setup lang="ts">
import type { OBSConfig } from '~~/server/utils/obsState'
import { DateTime } from 'luxon' // 推荐使用 luxon 库来处理时区
import OBSDashboard from '~/components/Dashboards/OBS.vue'

// --- 页面配置 ---
definePageMeta({
  layout: 'none', // 使用一个不带任何额外元素的布局
})

const route = useRoute()
// 从 URL 获取背景色，方便 OBS 抠图，默认为绿色
const backgroundColor = computed(() => `#${(route.query.bg as string) || '00FF00'}`)

// --- 状态管理 ---
const obsConfig = ref<OBSConfig | null>(null)
const simulationTime = ref(0)
let timerId: ReturnType<typeof setInterval> | null = null

// --- 计时器逻辑 ---
function startTimer() {
  if (timerId)
    clearInterval(timerId)

  const update = () => {
    if (!obsConfig.value?.launchTime)
      return

    // 使用 Luxon 来处理时区，确保时间计算的准确性
    const launchDateTime = DateTime.fromISO(obsConfig.value.launchTime, { zone: obsConfig.value.timeZone })
    const now = DateTime.now()

    // 计算差值（单位：毫秒）
    const diffMs = now.toMillis() - launchDateTime.toMillis()
    // 应用偏移量并转换为秒
    simulationTime.value = (diffMs + (obsConfig.value.msOffset || 0)) / 1000
  }

  update()
  timerId = setInterval(update, 50) // 50ms 刷新一次，保证平滑
}

// --- SSE 连接 ---
onMounted(() => {
  const eventSource = new EventSource('/api/obs/events')

  eventSource.onmessage = (event) => {
    try {
      const newData = JSON.parse(event.data) as OBSConfig
      obsConfig.value = newData
      startTimer() // 每次收到新配置都重启计时器
    }
    catch (e) {
      console.error('Failed to parse SSE data:', e)
    }
  }

  eventSource.onerror = (err) => {
    console.error('EventSource failed:', err)
    eventSource.close()
  }

  onBeforeUnmount(() => {
    if (timerId)
      clearInterval(timerId)
    eventSource.close()
  })
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden" :style="{ backgroundColor }">
    <Adapter v-if="obsConfig">
      <OBSDashboard
        :simulation-time="simulationTime"
        :events="obsConfig.events"
        :mission-name="obsConfig.missionName"
        :vehicle="obsConfig.vehicle"
      />
    </Adapter>
    <div v-else class="h-full flex items-center justify-center text-xl text-white font-mono">
      正在连接到 LaunchDeck 服务器...
    </div>
  </div>
</template>
