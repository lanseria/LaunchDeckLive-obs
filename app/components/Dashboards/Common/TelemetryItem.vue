<script setup lang="ts">
defineProps({
  label: String,
  value: [String, Number],
  unit: String,
  labelClass: String,
  valueClass: String,
  unitClass: String,
})
</script>

<template>
  <div>
    <div class="text-xs text-gray-400 uppercase md:text-base sm:text-sm" :class="[labelClass]">
      {{ label }}
    </div>
    <div class="text-2xl font-bold lg:text-5xl md:text-4xl sm:text-3xl" :class="[valueClass]">
      {{ value }} <span v-if="unit" class="text-lg md:text-xl" :class="[unitClass]">{{ unit }}</span>
    </div>
  </div>
</template>
