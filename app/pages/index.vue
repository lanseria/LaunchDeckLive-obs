<script setup lang="ts">
import { useDisplayStore } from '~/composables/store/display'

const displayStore = useDisplayStore()
const hasReceivedOnce = ref(false) // To know if we've ever gotten data

onMounted(() => {
  displayStore.initialize()
})

onUnmounted(() => {
  displayStore.dispose()
})

// Watch for the first time data is received to hide the "Waiting for data" message
watch(() => displayStore.telemetry.simulationTime, (newTime, oldTime) => {
  if (!hasReceivedOnce.value && (newTime !== 0 || displayStore.telemetry.altitude !== 0 || displayStore.telemetry.speed !== 0 || displayStore.telemetry.isPlaying)) {
    hasReceivedOnce.value = true
  }
  // If reset to 0 and was previously playing or had data
  if (newTime === 0 && displayStore.telemetry.altitude === 0 && displayStore.telemetry.speed === 0 && !displayStore.telemetry.isPlaying && hasReceivedOnce.value && (oldTime !== 0 || displayStore.isPlaying)) {
    // Potentially means a reset from control
  }
}, { immediate: true })

watch(() => displayStore.telemetry.isPlaying, (newIsPlaying) => {
  if (newIsPlaying || !newIsPlaying && hasReceivedOnce.value) { // If it starts playing, or if it stops and we had data before
    hasReceivedOnce.value = true
  }
}, { immediate: true })
</script>

<template>
  <div

    text-white font-mono bg-gray-900 flex flex-col h-screen w-screen select-none items-center justify-center
  >
    <div text-center>
      <h1 text-5xl font-bold tracking-wider mb-2>
        LAUNCHDECK DISPLAY
      </h1>
      <p v-if="!displayStore.isConnected && !hasReceivedOnce" text-lg text-yellow-400>
        Waiting for data from control panel...
      </p>
      <p v-if="displayStore.isConnected && !displayStore.telemetry.isPlaying && hasReceivedOnce" text-2xl text-red-400 font-semibold>
        SIMULATION PAUSED / STOPPED
      </p>
      <p v-if="displayStore.telemetry.isPlaying" text-2xl text-green-400 font-semibold animate-pulse>
        SIMULATION RUNNING
      </p>
    </div>

    <div grid="~ cols-1 md:cols-3 gap-8" text-3xl mt-12 text-center w="3/4 md:2/3">
      <div>
        <div text-xl text-gray-400>
          MET (T+)
        </div>
        <div text-6xl font-bold>
          {{ displayStore.telemetry.simulationTime.toFixed(0) }} s
        </div>
      </div>
      <div>
        <div text-xl text-gray-400>
          ALTITUDE
        </div>
        <div text-6xl font-bold>
          {{ displayStore.telemetry.altitude.toFixed(0) }} m
        </div>
      </div>
      <div>
        <div text-xl text-gray-400>
          SPEED
        </div>
        <div text-6xl font-bold>
          {{ displayStore.telemetry.speed.toFixed(0) }} m/s
        </div>
      </div>
    </div>
    <div text-sm text-gray-500 bottom-4 absolute>
      Ensure the <NuxtLink to="/control" target="_blank" class="text-blue-400 hover:underline">
        Control Panel
      </NuxtLink> is open and running.
    </div>
  </div>
</template>

<style scoped>
/* For a more classic digital look if desired */
/*
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
.font-orbitron {
  font-family: 'Orbitron', sans-serif;
}
*/
</style>
