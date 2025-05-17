<script setup lang="ts">
import type { TelemetryData } from '~/composables/store/display'
import { useI18n } from '#imports'
import TelemetryItem from './Common/TelemetryItem.vue'

const props = defineProps<{
  telemetry: TelemetryData
  hasReceivedOnce: boolean
  translatedCurrentEventName: string
}>()

const { t } = useI18n()
</script>

<template>
  <!-- TODO: SpaceLen1 独特的仪表盘布局和样式 -->
  <!-- 例如，这里可以有不同的颜色主题、字体，或者遥测数据的不同排列方式 -->
  <div class="text-yellow-300 font-sans p-4 bg-blue-900 bg-opacity-75 select-none bottom-0 left-0 right-0 absolute z-10 backdrop-blur-md lg:p-8 md:p-6">
    <div class="mb-4 text-center md:mb-6">
      <h1 class="text-3xl font-black tracking-tighter mb-1 md:text-5xl">
        {{ props.telemetry.missionName?.toUpperCase() || t('displayPanelTitle') }} - SpaceLen
      </h1>
      <p class="text-md text-blue-200 mb-2 italic md:text-xl">
        {{ props.telemetry.vehicleName || t('standby') }}
      </p>
      <p v-if="!props.telemetry.isPlaying && props.hasReceivedOnce" class="text-xl text-orange-400 font-bold md:text-2xl">
        HOLDING COUNT
      </p>
      <p v-if="props.telemetry.isPlaying && props.hasReceivedOnce" class="text-xl text-lime-400 font-bold animate-pulse md:text-2xl">
        MISSION IN PROGRESS
      </p>
      <p v-if="!props.hasReceivedOnce" class="text-lg text-yellow-200 md:text-xl">
        {{ t('waitingForData') }}
      </p>
    </div>

    <div class="mb-4 text-center gap-4 grid grid-cols-1 md:mb-6 md:gap-8 md:grid-cols-3">
      <TelemetryItem
        :label="`MET (T${props.telemetry.simulationTime < 0 ? '' : '+'})`"
        :value="Math.abs(props.telemetry.simulationTime).toFixed(1)"
        unit="sec"
        label-class="text-blue-300"
        value-class="text-yellow-400"
        unit-class="text-yellow-500"
      />
      <TelemetryItem
        label="ALTITUDE"
        :value="props.telemetry.altitude.toFixed(0)"
        unit="meters"
        label-class="text-blue-300"
        value-class="text-yellow-400"
        unit-class="text-yellow-500"
      />
      <TelemetryItem
        label="VELOCITY"
        :value="props.telemetry.speed.toFixed(0)"
        unit="m/s"
        label-class="text-blue-300"
        value-class="text-yellow-400"
        unit-class="text-yellow-500"
      />
    </div>

    <div class="mt-4 pt-4 text-center border-t-2 border-blue-500">
      <div class="text-md text-blue-300 uppercase md:text-xl">
        {{ t('currentEvent') }}
      </div>
      <div class="text-2xl text-lime-300 font-bold flex h-10 truncate items-center justify-center md:text-4xl md:h-12">
        {{ props.translatedCurrentEventName }}
      </div>
      <div v-if="props.telemetry.currentEventPayload" class="text-sm text-blue-200 mt-1 p-1 rounded bg-blue-800 bg-opacity-60 max-w-full inline-block truncate md:text-base">
        Payload: {{ props.telemetry.currentEventPayload }}
      </div>
    </div>
  </div>
</template>
