<script setup lang="ts">
import { formatMET } from '~/composables/utils/formatters'
import NewEventTimeline from './Common/NewEventTimeline.vue'

const props = defineProps<{
  telemetry: TelemetryData
  hasReceivedOnce: boolean
}>()

const formattedMET = computed(() => formatMET(props.telemetry.simulationTime))
</script>

<template>
  <div class="text-white font-mono flex flex-col select-none inset-0 justify-end absolute z-10">
    <div class="p-3 bg-black bg-opacity-60 gap-x-4 grid grid-cols-[1fr_auto_1fr] items-center backdrop-blur-sm lg:p-6 md:p-4 md:gap-x-8">
      <!-- 左列: 高度 和 速度 -->
      <div class="text-left flex flex-col items-start space-y-2 md:space-y-3">
        <div>
          <div class="text-xs text-gray-400 uppercase md:text-sm">
            高度
          </div>
          <div class="text-lg font-bold lg:text-2xl md:text-xl">
            {{ props.telemetry.altitude.toFixed(0) }} <span class="text-sm md:text-base">m</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-400 uppercase md:text-sm">
            速度
          </div>
          <div class="text-lg font-bold lg:text-2xl md:text-xl">
            {{ props.telemetry.speed.toFixed(0) }} <span class="text-sm md:text-base">m/s</span>
          </div>
        </div>
      </div>

      <!-- 中间列: 任务名, 型号, MET -->
      <div class="py-2 text-center md:py-0">
        <h1 class="text-xl leading-tight tracking-wider font-bold lg:text-3xl md:text-2xl">
          {{ props.telemetry.missionName || 'LaunchDeck - 展示面板' }}
        </h1>
        <p class="text-xs text-gray-300 mb-1 md:text-sm md:mb-2">
          {{ props.telemetry.vehicleName || '待命中' }}
        </p>
        <div class="text-2xl text-sky-400 font-bold lg:text-4xl md:text-3xl">
          {{ formattedMET }}
        </div>
        <div class="text-xs mt-1 md:text-sm">
          <span v-if="!props.telemetry.isPlaying && props.hasReceivedOnce" class="text-red-400 font-semibold">
            模拟已暂停/停止
          </span>
          <span v-if="props.telemetry.isPlaying && props.hasReceivedOnce" class="text-green-400 font-semibold animate-pulse">
            模拟运行中
          </span>
          <span v-if="!props.hasReceivedOnce" class="text-yellow-400">
            等待来自控制面板的数据...
          </span>
        </div>
      </div>

      <!-- 右列: 事件时间轴 -->
      <div>
        <NewEventTimeline
          :events="telemetry.allEvents"
          :current-time="telemetry.simulationTime"
          :pixels-per-second="5"
          :focus-line-from-top="100"
          :timeline-height="200"
        />
      </div>
    </div>
  </div>
</template>
