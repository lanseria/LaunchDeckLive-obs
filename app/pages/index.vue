<script setup lang="ts">
import { useControlStore } from '~/composables/store/control'

const controlStore = useControlStore()
const fileError = ref<string | null>(null)
const seekTimeInput = ref<string>('')
const seekError = ref<string | null>(null)

function handleMissionFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  fileError.value = null
  if (!file)
    return

  if (file.type === 'application/json') {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const jsonData = JSON.parse(content)
        if (jsonData && jsonData.missionName && jsonData.events) {
          controlStore.loadMissionSequence(jsonData)
        }
        else {
          throw new Error('JSON文件缺少 missionName 或 events 字段。')
        }
      }
      catch (error: any) {
        fileError.value = error.message || '解析JSON文件时出错。'
      }
    }
    reader.onerror = () => { fileError.value = '读取文件时出错。' }
    reader.readAsText(file)
  }
  else {
    fileError.value = '文件类型无效。请上传 .json 文件。'
  }
  target.value = '' // 清空 input，以便可以再次选择相同文件
}

function handleVideoFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    controlStore.setVideoFile(file)
  }
}

function handleSeek() {
  seekError.value = null
  if (!controlStore.missionData) {
    seekError.value = '请先加载任务。'
    return
  }
  const time = Number.parseFloat(seekTimeInput.value)
  if (Number.isNaN(time)) {
    seekError.value = '请输入有效的数字。'
    return
  }
  controlStore.seekSimulation(time)
}

function addEvent() {
  controlStore.missionData?.events.push({ time: 0, name: '新事件' })
}

function deleteEvent(index: number) {
  if (controlStore.missionData && controlStore.missionData.events.length > 1) {
    controlStore.missionData.events.splice(index, 1)
  }
}

// 确保可选对象存在以便 v-model 绑定
function ensureTelemetry(event: MissionEvent) {
  if (!event.telemetry)
    event.telemetry = {}
}
function ensureDisplayInfo(event: MissionEvent) {
  if (!event.displayInfo)
    event.displayInfo = {}
}

onMounted(controlStore.initialize)
onUnmounted(controlStore.dispose)
</script>

<template>
  <div class="p-4 font-sans md:p-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">
        LaunchDeck - 任务编辑器
      </h1>
      <Footer />
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- 左侧：编辑器 -->
      <div v-if="controlStore.missionData" class="flex flex-col space-y-6">
        <!-- 任务导入/导出 -->
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            任务文件
          </h2>
          <div class="flex gap-4">
            <label class="btn-primary flex-1 cursor-pointer text-center">
              导入 JSON
              <input type="file" accept=".json" class="hidden" @change="handleMissionFileImport">
            </label>
            <button class="btn-primary flex-1" @click="controlStore.exportMission">
              导出 JSON
            </button>
          </div>
          <p v-if="fileError" class="mt-2 text-sm text-red-500">
            {{ fileError }}
          </p>
        </div>

        <!-- 基础信息编辑器 -->
        <div class="border rounded-md p-4 space-y-4 dark:border-gray-600">
          <h2 class="text-xl font-semibold">
            基础信息
          </h2>
          <div>
            <label class="text-sm font-medium">任务名称</label>
            <input v-model="controlStore.missionData.missionName" type="text" class="input-field w-full">
          </div>
          <div>
            <label class="text-sm font-medium">运载工具</label>
            <input v-model="controlStore.missionData.vehicle" type="text" class="input-field w-full">
          </div>
        </div>

        <!-- 视频配置 -->
        <div class="border rounded-md p-4 space-y-4 dark:border-gray-600">
          <h2 class="text-xl font-semibold">
            视频配置
          </h2>
          <label class="btn-primary w-full cursor-pointer text-center">
            {{ controlStore.videoBlobUrl ? '更换视频' : '选择视频文件' }}
            <input type="file" accept="video/*" class="hidden" @change="handleVideoFileSelect">
          </label>
          <div v-if="!controlStore.videoBlobUrl" class="text-sm text-yellow-500 font-semibold">
            请选择一个视频文件以启动模拟。
          </div>
          <div>
            <label class="text-sm font-medium">视频起始偏移 (秒)</label>
            <input v-model.number="controlStore.missionData.videoConfig!.startTimeOffset" type="number" class="input-field w-full">
          </div>
        </div>

        <!-- 事件编辑器 -->
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            事件序列
          </h2>
          <div class="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
            <div v-for="(event, index) in controlStore.missionData.events" :key="index" class="border rounded-md bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <div class="flex items-center gap-2">
                <input v-model.number="event.time" type="number" placeholder="时间(s)" class="input-field w-20">
                <input v-model="event.name" type="text" placeholder="事件名称" class="input-field flex-grow">
                <button class="btn-danger p-2" @click="deleteEvent(index)">
                  ✕
                </button>
              </div>
              <div class="mt-2 flex gap-2 text-xs">
                <button class="btn-secondary" @click="ensureTelemetry(event)">
                  {{ event.telemetry ? '编辑' : '添加' }}遥测
                </button>
                <button class="btn-secondary" @click="ensureDisplayInfo(event)">
                  {{ event.displayInfo ? '编辑' : '添加' }}描述
                </button>
              </div>
              <!-- 遥测数据编辑器 -->
              <div v-if="event.telemetry" class="mt-2 rounded bg-gray-100 p-2 space-y-2 dark:bg-gray-900/50">
                <div class="flex items-center gap-2 text-sm">
                  <label>速度(km/h):</label> <input v-model.number="event.telemetry.speed_kmh" type="number" class="input-field w-full">
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <label>高度(km):</label> <input v-model.number="event.telemetry.altitude_km" type="number" step="0.1" class="input-field w-full">
                </div>
              </div>
              <!-- 描述信息编辑器 -->
              <div v-if="event.displayInfo" class="mt-2 rounded bg-gray-100 p-2 text-sm space-y-2 dark:bg-gray-900/50">
                <input v-model="event.displayInfo.title" placeholder="标题" class="input-field w-full">
                <input v-model="event.displayInfo.line1" placeholder="描述行 1" class="input-field w-full">
                <input v-model="event.displayInfo.line2" placeholder="描述行 2" class="input-field w-full">
                <input v-model="event.displayInfo.line3" placeholder="描述行 3" class="input-field w-full">
              </div>
            </div>
          </div>
          <button class="btn-primary mt-4 w-full" @click="addEvent">
            添加新事件
          </button>
        </div>
      </div>

      <!-- 右侧：预览和控制 -->
      <div class="flex flex-col space-y-6">
        <div class="border rounded-md p-4 dark:border-gray-600">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              显示效果预览
            </h2>
            <NuxtLink to="/control" target="_blank" class="text-sm text-blue-500 hover:underline">
              在新窗口打开
            </NuxtLink>
          </div>
          <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
            <iframe src="/control?mute=1" title="Display Preview" frameborder="0" class="h-full w-full" allow="autoplay" />
          </div>
        </div>

        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            模拟控制
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <button
              :disabled="!controlStore.videoBlobUrl"
              class="btn-primary text-lg"
              @click="controlStore.toggleLaunch"
            >
              {{ controlStore.isPlaying ? '暂停' : '开始/继续' }}
            </button>
            <button
              class="btn-danger text-lg"
              @click="controlStore.resetSimulation"
            >
              重置
            </button>
          </div>
        </div>

        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-2 text-xl font-semibold">
            快速跳转 (MET)
          </h2>
          <div class="flex items-center space-x-2">
            <input v-model="seekTimeInput" type="number" step="any" class="input-field flex-grow" placeholder="秒" @keyup.enter="handleSeek">
            <button class="btn-primary" @click="handleSeek">
              跳转
            </button>
          </div>
          <p v-if="seekError" class="mt-2 text-sm text-red-500">
            {{ seekError }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-field {
  @apply block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600;
}
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-danger {
  @apply px-4 py-2 bg-red-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-red-700 hover:shadow-lg focus:bg-red-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-red-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply px-2 py-1 bg-gray-500 text-white font-medium text-xs rounded hover:bg-gray-600 transition;
}
</style>
