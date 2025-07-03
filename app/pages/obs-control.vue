// --- File: app/pages/obs-control.vue ---
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
// 导入新的模态框组件
import TimelineEditorModal from '~/components/TimelineEditorModal.vue'

const dayjs = useDayjs()

// --- 默认配置 ---
function getDefaultConfig(): OBSConfig {
  return {
    missionName: 'Starlink Mission (OBS)',
    vehicle: 'Falcon 9',
    launchTime: dayjs().tz('Asia/Shanghai').format('YYYY-MM-DDTHH:mm:ss'),
    timeZone: 'Asia/Shanghai',
    msOffset: 0,
    events: [
      { time: -10, name: 'STARTUP' },
      { time: 0, name: 'LIFTOFF' },
      { time: 72, name: 'MAX-Q' },
      { time: 145, name: 'MECO' },
      { time: 195, name: 'FAIRING' },
      { time: 530, name: 'LANDING' },
    ],
    // 关键: 在这里也提供默认值
    timelineConfig: {
      missionDuration: 3600,
      pastNodeDensityFactor: 3,
      futureNodeDensityFactor: 1,
    },
  }
}

// --- 状态定义 ---
const config = ref<OBSConfig>(getDefaultConfig())
const isEditorModalOpen = ref(false)
const isTimelineEditorOpen = ref(false) // 新增状态
// ... (其他状态不变) ...
const saveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const fileError = ref<string | null>(null)
const timezones = ['Asia/Shanghai', 'UTC', 'America/New_York', 'Europe/London']
const host = ref('')
const obsLink = computed(() => `${host.value}/obs-display`)
const { copy, copied } = useClipboard({ source: obsLink, legacy: true })
onMounted(() => {
  host.value = window.location.origin
})

// --- 方法 ---
function openEditorModal() {
  isEditorModalOpen.value = true
}
function handleSaveEvents(newEventList: MissionEvent[]) {
  config.value.events = newEventList.map(({ time, name }) => ({ time, name }))
}
// 新增：保存时间轴配置的方法
function handleSaveTimelineConfig(newConfig: TimelineConfig) {
  if (config.value)
    config.value.timelineConfig = newConfig
}

// 修改：文件导入时，智能合并 timelineConfig
function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  fileError.value = null
  if (!file)
    return

  if (file.type !== 'application/json') {
    fileError.value = '文件类型无效。请上传 .json 文件。'
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const jsonData = JSON.parse(content) as Partial<OBSConfig>

      // ... (之前的校验不变) ...
      if (
        typeof jsonData.missionName !== 'string'
        || typeof jsonData.vehicle !== 'string'
        || typeof jsonData.launchTime !== 'string'
        || typeof jsonData.timeZone !== 'string'
        || !Array.isArray(jsonData.events)
      ) {
        throw new TypeError('JSON 文件格式不正确或缺少必要字段。')
      }

      const launchDateTime = dayjs(jsonData.launchTime).tz(jsonData.timeZone)
      if (!launchDateTime.isValid())
        throw new Error('JSON 文件中的日期时间格式无效。')

      // 使用默认配置作为基础，然后用导入的数据覆盖
      const defaultConfig = getDefaultConfig()
      config.value = {
        ...defaultConfig, // 保证所有字段都存在
        missionName: jsonData.missionName,
        vehicle: jsonData.vehicle,
        launchTime: launchDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        timeZone: jsonData.timeZone,
        msOffset: jsonData.msOffset ?? 0,
        events: jsonData.events.map(ev => ({ time: ev.time, name: ev.name })),
        // 智能合并: 如果导入的文件有 timelineConfig，就用它的，否则用默认的
        timelineConfig: jsonData.timelineConfig || defaultConfig.timelineConfig,
      }
    }
    catch (error: any) {
      fileError.value = error.message || '解析或加载 JSON 文件时出错。'
    }
  }
  reader.onerror = () => { fileError.value = '读取文件时出错。' }
  reader.readAsText(file)
  target.value = ''
}

// ... (saveAndBroadcast, loadDefaultConfig, exportConfig 等方法无需修改) ...
async function saveAndBroadcast() {
  saveStatus.value = 'saving'
  errorMessage.value = ''
  try {
    const launchDateTime = dayjs(config.value.launchTime).tz(config.value.timeZone, true)
    if (!launchDateTime.isValid())
      throw new Error('无效的日期时间格式。')

    await $fetch('/api/obs/config', {
      method: 'POST',
      body: {
        ...config.value,
        launchTime: launchDateTime.toISOString(),
      },
    })
    saveStatus.value = 'success'
    setTimeout(() => saveStatus.value = 'idle', 2000)
  }
  catch (error: any) {
    saveStatus.value = 'error'
    errorMessage.value = error.data?.statusMessage || error.message || '发生未知错误'
  }
}
function loadDefaultConfig() {
  config.value = getDefaultConfig()
  fileError.value = null
}
function exportConfig() {
  if (!config.value)
    return
  const configToExport = JSON.parse(JSON.stringify(toRaw(config.value)))
  const jsonString = JSON.stringify(configToExport, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const filename = `${configToExport.missionName.replace(/\s/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.json`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="p-4 font-sans md:p-8">
    <!-- ... (Header 和其他部分不变) ... -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">
        LaunchDeck - OBS 控制面板
      </h1>
      <Footer />
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- ... (左侧大部分不变) ... -->
      <div class="flex flex-col space-y-6">
        <!-- 文件操作 -->
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            文件操作
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label class="btn-primary cursor-pointer text-center">
              导入配置
              <input type="file" accept=".json" class="hidden" @change="handleFileImport">
            </label>
            <button class="btn-primary" @click="exportConfig">
              导出配置
            </button>
            <button class="btn-secondary" @click="loadDefaultConfig">
              加载默认
            </button>
          </div>
          <p v-if="fileError" class="mt-2 text-sm text-red-500">
            {{ fileError }}
          </p>
        </div>
        <!-- 基础信息 -->
        <div class="border rounded-md p-4 space-y-4 dark:border-gray-600">
          <h2 class="text-xl font-semibold">
            基础信息
          </h2>
          <div>
            <label class="text-sm font-medium">任务名称</label>
            <input v-model="config.missionName" type="text" class="input-field w-full">
          </div>
          <div>
            <label class="text-sm font-medium">运载工具</label>
            <input v-model="config.vehicle" type="text" class="input-field w-full">
          </div>
          <h2 class="text-xl font-semibold">
            发射时间设定
          </h2>
          <div>
            <label class="text-sm font-medium">发射时间 (YYYY-MM-DD HH:mm:ss)</label>
            <input v-model="config.launchTime" type="datetime-local" step="1" class="input-field w-full">
          </div>
          <div>
            <label class="text-sm font-medium">时区</label>
            <select v-model="config.timeZone" class="input-field w-full">
              <option v-for="tz in timezones" :key="tz" :value="tz">
                {{ tz }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">修正偏移 (毫秒)</label>
            <input v-model.number="config.msOffset" type="number" class="input-field w-full" placeholder="例如: -500 表示提前半秒">
          </div>
        </div>
        <!-- 修改: 事件序列与时间轴 -->
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            事件序列与时间轴
          </h2>
          <div class="flex gap-4">
            <button class="btn-primary flex-1" @click="openEditorModal">
              编辑事件 ({{ config.events.length }}个)
            </button>
            <button class="btn-secondary flex-1" @click="isTimelineEditorOpen = true">
              编辑时间轴外观
            </button>
          </div>
        </div>
      </div>
      <!-- ... (右侧不变) ... -->
      <div class="flex flex-col space-y-6">
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            OBS 预览链接
          </h2>
          <p class="text-sm">
            在 OBS 的浏览器源中添加以下链接:
          </p>
          <div class="mt-1 flex items-center gap-2">
            <input
              type="text"
              class="input-field flex-grow select-all bg-gray-100 dark:bg-gray-800"
              :value="obsLink"
              readonly
            >
            <button class="btn-primary" @click="copy()">
              {{ copied ? '已复制!' : '复制' }}
            </button>
          </div>
          <p class="mt-2 text-sm">
            你可以使用颜色选择器改变背景色，方便绿幕/蓝幕抠像。
          </p>
        </div>
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            保存与广播
          </h2>
          <button class="btn-primary w-full text-lg" :disabled="saveStatus === 'saving'" @click="saveAndBroadcast">
            <span v-if="saveStatus === 'idle'">保存并向 OBS 推送</span>
            <span v-if="saveStatus === 'saving'">保存中...</span>
            <span v-if="saveStatus === 'success'">推送成功! ✓</span>
            <span v-if="saveStatus === 'error'">推送失败 ✗</span>
          </button>
          <p v-if="saveStatus === 'error'" class="mt-2 text-sm text-red-500">
            {{ errorMessage }}
          </p>
        </div>
      </div>
    </div>

    <MissionEditorModal
      v-if="isEditorModalOpen"
      :initial-events="config.events"
      @close="isEditorModalOpen = false"
      @save="handleSaveEvents"
    />
    <!-- 新增: 放置新的模态框 -->
    <TimelineEditorModal
      v-if="isTimelineEditorOpen && config.timelineConfig"
      :initial-config="config.timelineConfig"
      @close="isTimelineEditorOpen = false"
      @save="handleSaveTimelineConfig"
    />
  </div>
</template>

<style scoped>
/* ... (样式不变) ... */
.input-field {
  @apply block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600;
}
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply px-4 py-2 bg-gray-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-gray-700 hover:shadow-lg focus:bg-gray-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-800 active:shadow-lg transition duration-150 ease-in-out;
}
input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 0.375rem; /* rounded-md */
}
</style>
