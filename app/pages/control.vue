<script setup lang="ts">
import { useControlStore } from '~/composables/store/control'

const controlStore = useControlStore()

onMounted(() => {
  controlStore.initialize()
})

onUnmounted(() => {
  controlStore.dispose()
})
</script>

<template>
  <div font-sans p-8>
    <h1 text-3xl font-bold mb-6>
      LaunchDeck - Control Panel
    </h1>

    <div grid="~ cols-3 gap-4" mb-6>
      <button
        :disabled="controlStore.isPlaying"
        p="y-2 x-4"
        bg="green-500 hover:green-600"
        text-white
        rounded
        disabled:opacity-50
        @click="controlStore.startSimulation"
      >
        Start
      </button>
      <button
        :disabled="!controlStore.isPlaying"
        p="y-2 x-4"
        bg="yellow-500 hover:yellow-600"
        text-white
        rounded
        disabled:opacity-50
        @click="controlStore.pauseSimulation"
      >
        Pause
      </button>
      <button
        p="y-2 x-4"
        bg="red-500 hover:red-600"
        text-white
        rounded
        @click="controlStore.resetSimulation"
      >
        Reset
      </button>
    </div>

    <div border="1 gray-300" p-4 rounded>
      <h2 text-xl font-semibold mb-2>
        Current Simulation State:
      </h2>
      <p>Status: <span font-bold :class="controlStore.isPlaying ? 'text-green-600' : 'text-red-600'">{{ controlStore.isPlaying ? 'Playing' : 'Paused/Stopped' }}</span></p>
      <p>MET (T+): <span font-bold>{{ controlStore.simulationTime.toFixed(0) }} s</span></p>
      <p>Altitude: <span font-bold>{{ controlStore.altitude.toFixed(0) }} m</span></p>
      <p>Speed: <span font-bold>{{ controlStore.speed.toFixed(0) }} m/s</span></p>
    </div>
    <p text-sm text-gray-500 mt-4>
      Open <NuxtLink to="/" target="_blank" class="text-blue-500 hover:underline">
        Display Page
      </NuxtLink> in another tab/window.
    </p>
  </div>
</template>
