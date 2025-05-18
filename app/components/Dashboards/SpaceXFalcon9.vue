<script setup lang="ts">
import type { TelemetryData } from '~/composables/store/display'
import { useI18n } from '#imports'
import { formatMET } from '~/composables/utils/formatters'
import EventTimeline from './Common/EventTimeline.vue' // 引入时间轴组件

const props = defineProps<{
  telemetry: TelemetryData
  hasReceivedOnce: boolean
}>()

const { t } = useI18n()

const formattedMET = computed(() => formatMET(props.telemetry.simulationTime))
</script>

<template>
  <div class="text-white font-mono flex flex-col select-none inset-0 justify-end absolute z-10">
    <!-- 主仪表盘区域，使用 Grid 实现三列布局 -->
    <!-- 调整 padding 和背景透明度 -->
    <div class="p-3 bg-black bg-opacity-60 gap-x-4 grid grid-cols-[1fr_auto_1fr] items-center backdrop-blur-sm lg:p-6 md:p-4 md:gap-x-8">
      <!-- 左列: 高度 和 速度 -->
      <div class="text-left flex flex-col items-start space-y-2 md:space-y-3">
        <div>
          <div class="text-xs text-gray-400 uppercase md:text-sm">
            {{ t('altitude') }}
          </div>
          <div class="text-lg font-bold lg:text-2xl md:text-xl">
            {{ props.telemetry.altitude.toFixed(0) }} <span class="text-sm md:text-base">m</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-400 uppercase md:text-sm">
            {{ t('speed') }}
          </div>
          <div class="text-lg font-bold lg:text-2xl md:text-xl">
            {{ props.telemetry.speed.toFixed(0) }} <span class="text-sm md:text-base">m/s</span>
          </div>
        </div>
      </div>

      <!-- 中间列: 任务名, 型号, MET -->
      <div class="py-2 text-center md:py-0">
        <h1 class="text-xl font-bold leading-tight tracking-wider lg:text-3xl md:text-2xl">
          {{ props.telemetry.missionName || t('displayPanelTitle') }}
        </h1>
        <p class="text-xs text-gray-300 mb-1 md:text-sm md:mb-2">
          {{ props.telemetry.vehicleName || t('standby') }}
        </p>
        <!-- MET 颜色调整 -->
        <div class="text-2xl text-sky-400 font-bold lg:text-4xl md:text-3xl">
          {{ formattedMET }}
        </div>
        <!-- 状态信息可以放在MET下方或完全移除，SpaceX界面通常很简洁 -->
        <div class="text-xs mt-1 md:text-sm">
          <span v-if="!props.telemetry.isPlaying && props.hasReceivedOnce" class="text-red-400 font-semibold">
            {{ t('simulationPausedStoppedFull') }}
          </span>
          <span v-if="props.telemetry.isPlaying && props.hasReceivedOnce" class="text-green-400 font-semibold animate-pulse">
            {{ t('simulationRunningFull') }}
          </span>
          <!-- 修正: 只有未接收到数据且已连接时显示 -->
          <span v-if="!props.hasReceivedOnce " class="text-yellow-400">
            {{ t('waitingForData') }}
          </span>
        </div>
      </div>

      <!-- 右列: 事件时间轴 -->
      <div>
        <!-- 增加一些上边距对齐 -->
        <EventTimeline
          :events="telemetry.allEvents"
          :current-time="telemetry.simulationTime"
          :max-visible-events="3"
        />
        <!--  例如，最多显示7条事件 -->
        <!-- 不再需要单独显示 currentEventName 和 payload，时间轴组件会处理 -->
      </div>
    </div>
  </div>
</template>
