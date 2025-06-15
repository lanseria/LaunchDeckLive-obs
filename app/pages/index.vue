<script setup lang="ts">
import { useControlStore } from '~/composables/store/control'

const controlStore = useControlStore()
const fileError = ref<string | null>(null)
const seekTimeInput = ref<string>('')
const seekError = ref<string | null>(null)

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
            if (jsonData && jsonData.missionName && jsonData.events) {
              controlStore.loadMissionSequence(jsonData)
            }
            else {
              throw new Error('JSON文件缺少 missionName 或 events 字段。')
            }
          }
        }
        catch (error: any) {
          console.error('Error parsing JSON file:', error)
          fileError.value = error.message || '解析JSON文件时出错。'
          target.value = ''
        }
      }
      reader.onerror = () => { fileError.value = '读取文件时出错。'; target.value = '' }
      reader.readAsText(file)
    }
    else {
      fileError.value = '文件类型无效。请上传 .json 文件。'; target.value = ''
    }
  }
}

function handleSeek() {
  seekError.value = null
  if (!controlStore.missionData) {
    seekError.value = '请先加载任务时序文件。'
    return
  }
  const time = Number.parseFloat(seekTimeInput.value)
  if (Number.isNaN(time)) {
    seekError.value = '请输入有效的数字。'
    return
  }
  controlStore.seekSimulation(time)
}

onMounted(controlStore.initialize)
onUnmounted(controlStore.dispose)
</script>

<template>
  <div class="p-4 font-sans md:p-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">
        LaunchDeck - 控制面板
      </h1>
      <DarkToggle />
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div class="flex flex-col space-y-6">
        <div class="border border-gray-300 rounded p-4 dark:border-gray-600">
          <h2 class="mb-2 text-xl font-semibold">
            任务时序
          </h2>
          <input type="file" accept=".json" class="mb-2" @change="handleFileUpload">
          <p v-if="controlStore.missionData">
            加载任务: <span class="font-bold">{{ controlStore.missionData.missionName }}</span>
          </p>
          <div v-if="fileError" class="text-red-500">
            {{ fileError }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button
            :disabled="!controlStore.missionData"
            class="rounded px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            :class="controlStore.isPlaying ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'"
            @click="controlStore.toggleLaunch"
          >
            {{ controlStore.isPlaying ? '暂停' : '开始/继续' }}
          </button>
          <button
            :disabled="!controlStore.missionData"
            class="rounded bg-red-500 px-4 py-2 text-white disabled:cursor-not-allowed hover:bg-red-600 disabled:opacity-50"
            @click="controlStore.resetSimulation"
          >
            重置
          </button>
        </div>

        <div class="border border-gray-300 rounded p-4 dark:border-gray-600">
          <h2 class="mb-2 text-xl font-semibold">
            快速跳转 (MET)
          </h2>
          <div class="flex items-center space-x-2">
            <input
              v-model="seekTimeInput"
              type="number"
              step="any"
              class="flex-grow border border-gray-300 rounded bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
              placeholder="输入秒数 (例如 -10 或 120.5)"
              @keyup.enter="handleSeek"
            >
            <button
              :disabled="!controlStore.missionData"
              class="rounded bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed hover:bg-blue-600 disabled:opacity-50"
              @click="handleSeek"
            >
              跳转
            </button>
          </div>
          <div v-if="seekError" class="mt-2 text-sm text-red-500">
            {{ seekError }}
          </div>
        </div>

        <div class="border border-gray-300 rounded p-4 dark:border-gray-600">
          <h2 class="mb-2 text-xl font-semibold">
            当前模拟状态
          </h2>
          <p>状态: <span class="font-bold" :class="controlStore.isPlaying ? 'text-green-600' : 'text-red-600'">{{ controlStore.isPlaying ? '运行中' : '暂停/停止' }}</span></p>
          <p>任务时间: <span class="font-bold">{{ controlStore.simulationTime.toFixed(2) }} s</span></p>
          <p>高度 (KM): <span class="font-bold">{{ controlStore.altitude.toFixed(1) }}</span></p>
          <p>速度 (KM/H): <span class="font-bold">{{ controlStore.speed.toFixed(0) }}</span></p>
        </div>
      </div>

      <div class="flex flex-col space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            显示效果预览 (已静音)
          </h2>
          <NuxtLink to="/control" target="_blank" class="text-sm text-blue-500 hover:underline">
            在新窗口打开 (有声)
          </NuxtLink>
        </div>
        <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
          <iframe
            src="/control?mute=1"
            title="Display Preview"
            frameborder="0"
            class="h-full w-full"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  </div>
</template>
