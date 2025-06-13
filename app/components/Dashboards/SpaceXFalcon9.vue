<script setup lang="ts">
import Gauge from './Common/Gauge.vue'
import TimelineSvg from './Common/TimelineSvg.vue'
import TrapezoidGradient from './Common/TrapezoidGradient.vue'

const props = defineProps<{
  telemetry: TelemetryData
}>()
</script>

<template>
  <div class="relative h-full w-full select-none text-white font-saira">
    <!-- Center Clock and Mission Name -->
    <div class="fixed bottom-16px left-1/2 z-50 mx-auto max-w-md text-center font-400 -translate-x-1/2">
      <div class="text-42px leading-tight tabular-nums">
        {{ props.telemetry.timerClock }}
      </div>
      <div class="text-sm uppercase">
        {{ props.telemetry.vehicleName }} - {{ props.telemetry.missionName }}
      </div>
    </div>

    <!-- Timeline SVG -->
    <TimelineSvg
      class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
      :timestamps="props.telemetry.timestamps"
      :node-names="props.telemetry.nodeNames"
      :mission-duration="props.telemetry.missionDuration"
      :current-time-offset="props.telemetry.simulationTime"
      :svg-width="1920"
      :svg-height="200"
      :past-node-density-factor="3"
      :future-node-density-factor="1"
    />

    <!-- Left Gauges & Gradient -->
    <TrapezoidGradient class="absolute bottom-0 left-0 z-1" />
    <div class="absolute bottom-10px left-60px z-30 flex gap-4">
      <Gauge
        label="SPEED"
        unit="KM/H"
        :value="props.telemetry.speed_kmh"
        :max-value="30000"
      />
      <Gauge
        label="ALTITUDE"
        unit="KM"
        :value="props.telemetry.altitude_km"
        :max-value="700"
        :fraction-digits="1"
      />
    </div>

    <!-- Right Max-Q Info & Gradient -->
    <TrapezoidGradient class="absolute bottom-0 right-0 z-1" horizontal-flip />
    <div class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right">
      <div class="text-30px font-600">
        {{ props.telemetry.maxQTitle }}
      </div>
      <div>{{ props.telemetry.maxQLine1 }}</div>
      <div>{{ props.telemetry.maxQLine2 }}</div>
      <div>{{ props.telemetry.maxQLine3 }}</div>
    </div>
  </div>
</template>
