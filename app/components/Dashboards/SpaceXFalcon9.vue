<script setup lang="ts">
import SpaceXCircleTimeRotator from './Common/SpaceXCircleTimeRotator.vue'

const props = defineProps<{
  telemetry: TelemetryData // 包含 currentTime, allEvents, missionName 等
}>()
</script>

<template>
  <!-- SpaceXCircleTimeRotator 应该充满其父容器，并处理自己的内部布局 -->
  <SpaceXCircleTimeRotator
    :telemetry="props.telemetry"
  />
</template>
