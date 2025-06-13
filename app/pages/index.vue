<script setup lang="ts">
import { useControlStore } from '~/composables/store/control'

const controlStore = useControlStore()
const fileError = ref<string | null>(null)

// 仪表盘样式选项 - 直接使用中文
const dashboardStyles: { label: string, value: DashboardStyle }[] = [
  { label: 'SpaceX 猎鹰9号', value: 'SpaceXFalcon9' },
  { label: 'SpaceLen 1', value: 'SpaceLen1' },
]

const currentSelectedStyle = ref<DashboardStyle>(controlStore.selectedDashboardStyle)
const seekTimeInput = ref<string>('')
const seekError = ref<string | null>(null)

watch(currentSelectedStyle, (newStyle) => {
  controlStore.setDashboardStyle(newStyle)
})

watch(() => controlStore.selectedDashboardStyle, (storeStyle) => {
  if (currentSelectedStyle.value !== storeStyle)
    currentSelectedStyle.value = storeStyle
})

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
            if (jsonData
              && typeof jsonData.missionName === 'string'
              && typeof jsonData.vehicle === 'string'
              && Array.isArray(jsonData.events)
              && jsonData.events.every((ev: any) => typeof ev.time === 'number' && typeof ev.eventName === 'string')
            ) {
              controlStore.loadMissionSequence(jsonData)
            }
            else {
              fileError.value = 'JSON结构无效。应包含`missionName`, `vehicle`和带有`time`, `eventName`的`events`数组。'
              target.value = ''
            }
          }
        }
        catch (error) {
          console.error('Error parsing JSON file:', error)
          fileError.value = '解析JSON文件错误。请确保它是有效的JSON。'
          target.value = ''
        }
      }
      reader.onerror = () => {
        fileError.value = '读取文件错误。'
        target.value = ''
      }
      reader.readAsText(file)
    }
    else {
      fileError.value = '文件类型无效。请上传 .json 文件。'
      target.value = ''
    }
  }
}

function handleSeek() {
  seekError.value = null
  if (!controlStore.missionSequenceFile) {
    seekError.value = '请先加载任务时序文件。'
    return
  }
  const time = Number.parseFloat(seekTimeInput.value)
  if (Number.isNaN(time)) {
    seekError.value = '请输入一个有效的数字作为跳转时间。'
    return
  }
  controlStore.seekSimulation(time)
}

onMounted(() => {
  controlStore.initialize()
  currentSelectedStyle.value = controlStore.selectedDashboardStyle
})

onUnmounted(() => {
  controlStore.dispose()
})
</script>

<template>
  <div class="font-sans p-4 md:p-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">
        LaunchDeck - 控制面板
      </h1>
      <div class="flex items-center space-x-4">
        <DarkToggle />
      </div>
    </div>

    <div class="gap-8 grid grid-cols-1 lg:grid-cols-2">
      <div class="flex flex-col space-y-6">
        <!-- ... 控制选项 ... (这部分不变) -->
        <div class="p-4 border border-gray-300 rounded dark:border-gray-600">
          <h2 class="text-xl font-semibold mb-2">
            任务时序
          </h2>
          <input type="file" accept=".json" class="mb-2" @change="handleFileUpload">
          <p>加载任务: <span class="font-bold">{{ controlStore.loadedMissionName }}</span></p>
          <p>运载火箭: <span class="font-bold">{{ controlStore.loadedVehicleName }}</span></p>
          <div v-if="fileError" class="text-red-500">
            {{ fileError }}
          </div>
        </div>

        <div class="p-4 border border-gray-300 rounded dark:border-gray-600">
          <h2 class="text-xl font-semibold mb-2">
            选择仪表盘样式
          </h2>
          <select
            v-model="currentSelectedStyle"
            class="text-gray-900 p-2 border border-gray-300 rounded bg-white w-full dark:text-gray-100 focus:outline-none dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="style in dashboardStyles" :key="style.value" :value="style.value">
              {{ style.label }}
            </option>
          </select>
        </div>

        <div class="gap-4 grid grid-cols-3">
          <button
            :disabled="controlStore.isPlaying || !controlStore.missionSequenceFile"
            class="text-white px-4 py-2 rounded bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="controlStore.startSimulation"
          >
            开始
          </button>
          <button
            :disabled="!controlStore.isPlaying"
            class="text-white px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
            @click="controlStore.pauseSimulation"
          >
            暂停
          </button>
          <button
            :disabled="!controlStore.missionSequenceFile"
            class="text-white px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="controlStore.resetSimulation"
          >
            重置
          </button>
        </div>

        <div class="p-4 border border-gray-300 rounded dark:border-gray-600">
          <h2 class="text-xl font-semibold mb-2">
            快速跳转 (MET)
          </h2>
          <div class="flex items-center space-x-2">
            <input
              v-model="seekTimeInput"
              type="number"
              step="any"
              class="text-gray-900 p-2 border border-gray-300 rounded bg-white flex-grow dark:text-gray-100 focus:outline-none dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              placeholder="输入秒数 (例如 -10 或 120.5)"
              @keyup.enter="handleSeek"
            >
            <button
              :disabled="!controlStore.missionSequenceFile"
              class="text-white px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSeek"
            >
              跳转
            </button>
          </div>
          <div v-if="seekError" class="text-sm text-red-500 mt-2">
            {{ seekError }}
          </div>
        </div>

        <div class="p-4 border border-gray-300 rounded dark:border-gray-600">
          <h2 class="text-xl font-semibold mb-2">
            当前模拟状态:
          </h2>
          <p>状态: <span class="font-bold" :class="controlStore.isPlaying ? 'text-green-600' : 'text-red-600'">{{ controlStore.isPlaying ? '运行中' : '暂停/停止' }}</span></p>
          <p>任务经过时间 (T{{ controlStore.simulationTime < 0 ? '' : '+' }}): <span class="font-bold">{{ Math.abs(controlStore.simulationTime).toFixed(1) }} s</span></p>
          <p>高度: <span class="font-bold">{{ controlStore.altitude.toFixed(0) }} m</span></p>
          <p>速度: <span class="font-bold">{{ controlStore.speed.toFixed(0) }} m/s</span></p>
          <p>当前事件: <span class="text-blue-500 font-bold">{{ controlStore.currentEventName || '---' }}</span></p>
          <div v-if="controlStore.currentEventPayload">
            事件数据: <pre class="text-sm p-2 rounded bg-gray-100 dark:bg-gray-800">{{ controlStore.currentEventPayload }}</pre>
          </div>
        </div>
      </div>

      <!-- 右侧：显示效果预览 (使用 iframe) -->
      <div class="flex flex-col space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            显示效果预览
          </h2>
          <NuxtLink to="/control" target="_blank" class="text-sm text-blue-500 hover:underline">
            在新窗口打开完整显示
          </NuxtLink>
        </div>

        <!-- 预览容器 -->
        <div class="rounded-lg bg-black w-full aspect-video shadow-lg relative overflow-hidden">
          <iframe
            src="/control"
            title="LaunchDeck Display Preview"
            frameborder="0"
            class="h-full w-full left-0 top-0 absolute"
          />
        </div>
        <p class="text-sm text-gray-500 mt-4 text-center lg:text-left">
          预览区通过 iframe 嵌入了完整的显示页面，效果 100% 真实。
        </p>
      </div>
    </div>
  </div>
</template>
