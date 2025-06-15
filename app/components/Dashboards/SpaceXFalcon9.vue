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
        {{ props.telemetry.missionName }}
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

    <!-- Right Info & Gradient -->
    <TrapezoidGradient class="absolute bottom-0 right-0 z-1" horizontal-flip />

    <!-- 关键修改点: 用 Transition 包裹信息区域 -->
    <Transition name="fade-slide">
      <!-- v-if 指令确保在没有标题时，整个 div 从 DOM 中移除，从而触发过渡 -->
      <div
        v-if="props.telemetry.displayTitle"
        class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right"
      >
        <div class="text-30px font-600">
          {{ props.telemetry.displayTitle }}
        </div>
        <div>{{ props.telemetry.displayLine1 }}</div>
        <div>{{ props.telemetry.displayLine2 }}</div>
        <div>{{ props.telemetry.displayLine3 }}</div>
      </div>
    </Transition>
  </div>
</template>

<!-- 关键修改点: 添加 style 块来定义过渡动画 -->
<style scoped>
/*
  定义一个名为 "fade-slide" 的过渡效果
  它结合了淡入淡出（opacity）和从右侧滑入/滑出（transform）的效果
*/

/* --- 进入动画 --- */
.fade-slide-enter-from {
  /* 初始状态：完全透明，并向右偏移20像素 */
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-enter-active {
  /* 过渡过程：在 0.5 秒内平滑过渡所有变化的属性 */
  /* ease-out 缓动函数使动画在结尾时变慢，效果更自然 */
  transition: all 0.5s ease-out;
}

/* .fade-slide-enter-to 默认是 opacity: 1; transform: translateX(0); 无需定义 */

/* --- 离开动画 --- */
.fade-slide-leave-to {
  /* 结束状态：完全透明，并向右偏移20像素 */
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-active {
  /* 过渡过程：在 0.5 秒内平滑过渡所有变化的属性 */
  /* ease-in 缓动函数使动画在开始时变慢 */
  transition: all 0.5s ease-in;
}
</style>
