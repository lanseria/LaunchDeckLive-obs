<script setup lang="ts">
import { useControlStore } from '~/composables/store/control' // 假设你的 store 路径是这样

const controlStore = useControlStore()
const colorMode = useColorMode() // 获取 colorMode 实例

onMounted(() => {
  controlStore.initialize()
})

onUnmounted(() => {
  controlStore.dispose()
})

// 切换主题的函数
function toggleColorMode() {
  if (colorMode.preference === 'dark') {
    colorMode.preference = 'light'
  }
  else if (colorMode.preference === 'light') {
    colorMode.preference = 'system' // 或者直接 'dark'，取决于你想要的循环逻辑
  }
  else { // system or unknown
    colorMode.preference = 'dark'
  }
}
</script>

<template>
  <div font-sans p-8 class="text-gray-900 bg-white min-h-screen dark:text-gray-100 dark:bg-gray-800">
    <div class="mb-6 flex items-center justify-between">
      <h1 text-3xl font-bold>
        LaunchDeck - 控制面板
      </h1>
      <button
        p="y-2 x-4"
        border="~ gray-300 dark:gray-600"
        rounded
        aria-label="切换色彩模式"
        @click="toggleColorMode"
      >
        <!-- 你可以使用图标或者文字 -->
        <span v-if="colorMode.preference === 'dark'">☀️ 浅色</span>
        <span v-else-if="colorMode.preference === 'light'">🌙 深色</span>
        <span v-else>🌓 跟随系统 (当前: {{ colorMode.value }})</span>
      </button>
    </div>

    <div grid="~ cols-1 sm:cols-3 gap-4" mb-6>
      <button
        :disabled="controlStore.isPlaying"
        p="y-2 x-4"
        bg="green-500 hover:green-700"
        text-white
        rounded
        disabled:opacity-50
        @click="controlStore.startSimulation"
      >
        开始
      </button>
      <button
        :disabled="!controlStore.isPlaying"
        p="y-2 x-4"
        bg="yellow-500 hover:yellow-600"

        text-dark rounded dark:text-white disabled:opacity-50
        @click="controlStore.pauseSimulation"
      >
        暂停
      </button>
      <button
        p="y-2 x-4"
        bg="red-500 hover:red-700"
        text-white
        rounded
        @click="controlStore.resetSimulation"
      >
        重置
      </button>
    </div>

    <div border="1 gray-300 dark:border-gray-600" p-4 rounded class="bg-gray-50 dark:bg-gray-700">
      <h2 text-xl font-semibold mb-2>
        当前模拟状态:
      </h2>
      <p>状态: <span font-bold :class="controlStore.isPlaying ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ controlStore.isPlaying ? '运行中' : '暂停/停止' }}</span></p>
      <p>MET (T+): <span font-bold>{{ controlStore.simulationTime.toFixed(0) }} s</span></p>
      <p>高度: <span font-bold>{{ controlStore.altitude.toFixed(0) }} m</span></p>
      <p>速度: <span font-bold>{{ controlStore.speed.toFixed(0) }} m/s</span></p>
    </div>
    <p text-sm text-gray-500 mt-4 dark:text-gray-400>
      在另一个标签页/窗口打开 <NuxtLink to="/" target="_blank" class="text-blue-500 dark:text-blue-400 hover:underline">
        显示页面
      </NuxtLink>。
    </p>
  </div>
</template>

<style scoped>
/* 如果需要额外的样式可以在这里添加 */
</style>
