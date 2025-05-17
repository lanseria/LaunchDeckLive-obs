<script setup lang="ts">
import { useI18n } from '#imports' // Auto-imported
import { useControlStore } from '~/composables/store/control' // 假设你的 store 路径是这样

const controlStore = useControlStore()
const fileError = ref<string | null>(null)
const { t, locale, locales, setLocale } = useI18n()

// Type for locales from useI18n to ensure correct structure
interface I18nLocale {
  code: string
  name?: string
  // Add other properties if your locale objects have them (iso, file, etc.)
}
const availableLocales = computed(() => (locales.value as I18nLocale[]).filter(i => i.code))

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  fileError.value = null

  if (file) {
    if (file.type === 'application/json') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result
          if (typeof content === 'string') {
            const jsonData = JSON.parse(content)
            if (jsonData
              && typeof jsonData.missionName === 'object' // Check for new structure
              && typeof jsonData.vehicle === 'object'
              && Array.isArray(jsonData.events)
              && jsonData.events.every((ev: any) => typeof ev.time === 'number' && typeof ev.eventNameKey === 'string') // Check for eventNameKey
            ) {
              controlStore.loadMissionSequence(jsonData)
            }
            else {
              fileError.value = t('fileUploadError.invalidStructure')
              target.value = ''
            }
          }
        }
        catch (error) {
          console.error('Error parsing JSON file:', error)
          fileError.value = t('fileUploadError.parseError')
          target.value = ''
        }
      }
      reader.onerror = () => {
        fileError.value = t('fileUploadError.readError')
        target.value = ''
      }
      reader.readAsText(file)
    }
    else {
      fileError.value = t('fileUploadError.invalidType')
      target.value = ''
    }
  }
}

function getTranslatedEventName(key: string | null): string {
  if (!key)
    return t('noEvent')
  // For upcoming events before T-0
  if (controlStore.simulationTime < 0 && missionHasStartedButBeforeT0()) {
    // Check if this key is the *first* event in the sequence
    const firstEventKey = controlStore.missionSequenceFile?.events[0]?.eventNameKey
    if (key === firstEventKey) {
      return t('upcomingEventPrefix') + t(key)
    }
  }
  return t(key)
}

function missionHasStartedButBeforeT0(): boolean {
  return controlStore.missionSequenceFile !== null && controlStore.simulationTime < 0
}

onMounted(() => {
  controlStore.initialize()
})

onUnmounted(() => {
  controlStore.dispose()
})
</script>

<template>
  <div class="font-sans p-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold">
        {{ t('controlPanelTitle') }}
      </h1>
      <div class="flex items-center space-x-4">
        <div class="flex items-center">
          <label for="locale-select" class="text-sm text-gray-600 mr-2 dark:text-gray-300">{{ t('language') }}:</label>
          <select id="locale-select" v-model="locale" class="focus:outline-none text-gray-900 p-2 border border-gray-300 rounded bg-white dark:text-gray-100 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" @change="setLocale($event.target.value)">
            <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
              {{ loc.name || loc.code }}
            </option>
          </select>
        </div>
        <DarkToggle />
      </div>
    </div>

    <div class="mb-6 p-4 border border-gray-300 rounded">
      <h2 class="text-xl font-semibold mb-2">
        {{ t('missionSequence') }}
      </h2>
      <input type="file" accept=".json" class="mb-2" @change="handleFileUpload">
      <p>{{ t('loadMission') }} <span class="font-bold">{{ controlStore.loadedMissionName }}</span></p>
      <p>{{ t('vehicle') }} <span class="font-bold">{{ controlStore.loadedVehicleName }}</span></p>
      <div v-if="fileError" class="text-red-500">
        {{ fileError }}
      </div>
    </div>

    <div class="mb-6 gap-4 grid grid-cols-3">
      <button
        :disabled="controlStore.isPlaying || !controlStore.missionSequenceFile"
        class="text-white px-4 py-2 rounded bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="controlStore.startSimulation"
      >
        {{ t('start') }}
      </button>
      <button
        :disabled="!controlStore.isPlaying"
        class="text-white px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
        @click="controlStore.pauseSimulation"
      >
        {{ t('pause') }}
      </button>
      <button
        :disabled="!controlStore.missionSequenceFile"
        class="text-white px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="controlStore.resetSimulation"
      >
        {{ t('reset') }}
      </button>
    </div>

    <div class="p-4 border border-gray-300 rounded">
      <h2 class="text-xl font-semibold mb-2">
        {{ t('simulationState') }}
      </h2>
      <p>{{ t('status') }} <span class="font-bold" :class="controlStore.isPlaying ? 'text-green-600' : 'text-red-600'">{{ controlStore.isPlaying ? t('playing') : t('pausedStopped') }}</span></p>
      <p>{{ t('met') }} (T{{ controlStore.simulationTime < 0 ? '' : '+' }}): <span class="font-bold">{{ Math.abs(controlStore.simulationTime).toFixed(1) }} s</span></p>
      <p>{{ t('altitude') }}: <span class="font-bold">{{ controlStore.altitude.toFixed(0) }} m</span></p>
      <p>{{ t('speed') }}: <span class="font-bold">{{ controlStore.speed.toFixed(0) }} m/s</span></p>
      <p>{{ t('currentEvent') }} <span class="text-blue-500 font-bold">{{ getTranslatedEventName(controlStore.currentEventNameKey) }}</span></p>
      <div v-if="controlStore.currentEventPayload">
        {{ t('eventData') }} <pre class="text-sm p-2 rounded bg-gray-100">{{ controlStore.currentEventPayload }}</pre>
      </div>
    </div>
    <p class="text-sm text-gray-500 mt-4">
      {{ t('openDisplayPage', [t('displayPageLinkText')]) }}
      <NuxtLink to="/" target="_blank" class="text-blue-500 hover:underline">
        {{ t('displayPageLinkText') }}
      </NuxtLink>
    </p>
  </div>
</template>
