<script setup lang="ts">
import OBSDashboard from '~/components/Dashboards/OBS.vue'

const dayjs = useDayjs()
definePageMeta({
  layout: 'none',
})
const obsConfig = ref<OBSConfig | null>(null)
const simulationTime = ref(0)
let timerId: ReturnType<typeof setInterval> | null = null
function startTimer() {
  if (timerId)
    clearInterval(timerId)

  const update = () => {
    if (!obsConfig.value?.launchTime)
      return

    const launchDateTime = dayjs(obsConfig.value.launchTime).tz(obsConfig.value.timeZone)
    const now = dayjs()

    const diffMs = now.diff(launchDateTime)
    simulationTime.value = (diffMs + (obsConfig.value.msOffset || 0)) / 1000
  }
  update()
  timerId = setInterval(update, 50)
}
onMounted(() => {
  const eventSource = new EventSource('/api/obs/events')
  eventSource.onmessage = (event) => {
    try {
      const newData = JSON.parse(event.data) as OBSConfig
      obsConfig.value = newData
      startTimer()
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
  <div class="h-screen w-screen overflow-hidden">
    <Adapter v-if="obsConfig">
      <OBSDashboard
        :simulation-time="simulationTime"
        :events="obsConfig.events"
        :mission-name="obsConfig.missionName"
        :vehicle="obsConfig.vehicle"
        :timeline-config="obsConfig.timelineConfig"
      />
    </Adapter>
    <div v-else class="h-full flex items-center justify-center text-xl text-white font-mono">
      正在连接到 LaunchDeck 服务器...
    </div>
  </div>
</template>
