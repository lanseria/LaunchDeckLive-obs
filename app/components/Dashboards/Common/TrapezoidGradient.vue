<script lang="ts" setup>
const props = withDefaults(defineProps<{
  svgWidth?: number
  svgHeight?: number
  topWidth?: number
  bottomWidth?: number
  radius?: number
  color?: string
  horizontalFlip?: boolean
}>(), {
  svgWidth: 600,
  svgHeight: 180,
  topWidth: 370,
  bottomWidth: 550,
  radius: 0,
  color: 'black',
  horizontalFlip: false,
})

const gradientId = computed(() => `trapezoidVerticalGradient-${Math.random().toString(36).substring(2, 9)}`)
const effectiveRadius = computed(() => Math.min(props.radius, props.topWidth / 2, props.svgHeight / 2))

const pathD = computed(() => {
  const r = effectiveRadius.value
  const h = props.svgHeight
  const tw = props.topWidth
  const bw = props.bottomWidth

  return `M 0 0 L ${tw - r} 0 A ${r} ${r} 0 0 1 ${tw} ${r} L ${bw} ${h} L 0 ${h} Z`
})

const transform = computed(() => props.horizontalFlip ? `translate(${props.svgWidth}, 0) scale(-1, 1)` : '')
</script>

<template>
  <svg :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :style="{ stopColor: color, stopOpacity: 0.5 }" />
        <stop offset="30%" :style="{ stopColor: color, stopOpacity: 0.3 }" />
        <stop offset="70%" :style="{ stopColor: color, stopOpacity: 0.01 }" />
        <stop offset="100%" :style="{ stopColor: color, stopOpacity: 0 }" />
      </linearGradient>
    </defs>
    <path :d="pathD" :fill="`url(#${gradientId})`" :transform="transform" />
  </svg>
</template>
