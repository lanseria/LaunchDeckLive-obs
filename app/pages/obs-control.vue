<script setup lang="ts">
import { DateTime } from 'luxon'

// --- 默认配置 ---
function getDefaultConfig(): OBSConfig {
  return {
    missionName: 'Starlink Mission (OBS)',
    vehicle: 'Falcon 9',
    launchTime: DateTime.now().setZone('Asia/Shanghai').toFormat('yyyy-MM-dd\'T\'HH:mm:ss'),
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
  }
}

// --- 状态定义 ---
const config = ref<OBSConfig>(getDefaultConfig())

const isEditorModalOpen = ref(false)
const saveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const fileError = ref<string | null>(null)

// 时区列表
const timezones = ['Asia/Shanghai', 'UTC', 'America/New_York', 'Europe/London']

// --- 方法 ---
function openEditorModal() {
  isEditorModalOpen.value = true
}

function handleSaveEvents(newEventList: MissionEvent[]) {
  config.value.events = newEventList.map(({ time, name }) => ({ time, name }))
}

async function saveAndBroadcast() {
  saveStatus.value = 'saving'
  errorMessage.value = ''
  try {
    const launchDateTime = DateTime.fromISO(config.value.launchTime, { zone: config.value.timeZone })
    if (!launchDateTime.isValid)
      throw new Error(`无效的日期时间格式: ${launchDateTime.invalidReason || '未知错误'}`)

    await $fetch('/api/obs/config', {
      method: 'POST',
      body: {
        ...config.value,
        launchTime: launchDateTime.toISO(),
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

// --- 新增：导入/导出/重置功能 ---

/**
 * 加载默认配置
 */
function loadDefaultConfig() {
  config.value = getDefaultConfig()
  fileError.value = null
}

/**
 * 导出当前配置为 JSON 文件
 */

function exportConfig() {
  if (!config.value)
    return

  const configToExport = JSON.parse(JSON.stringify(toRaw(config.value)))

  const jsonString = JSON.stringify(configToExport, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // 使用任务名称作为文件名，更具可读性
  const filename = `${configToExport.missionName.replace(/\s/g, '_')}_${DateTime.now().toFormat('yyyyMMdd_HHmmss')}.json`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 处理文件导入
 */
function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  fileError.value = null
  if (!file)
    return

  if (file.type !== 'application/json') {
    fileError.value = '文件类型无效。请上传 .json 文件。'
    target.value = '' // 清空以便再次选择
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const jsonData = JSON.parse(content) as Partial<OBSConfig>

      // 更新数据校验
      if (
        typeof jsonData.missionName !== 'string'
        || typeof jsonData.vehicle !== 'string'
        || typeof jsonData.launchTime !== 'string'
        || typeof jsonData.timeZone !== 'string'
        || !Array.isArray(jsonData.events)
      ) {
        throw new TypeError('JSON 文件格式不正确或缺少 missionName, vehicle, launchTime, timeZone, events 等字段。')
      }

      const launchDateTime = DateTime.fromISO(jsonData.launchTime, { zone: jsonData.timeZone })
      if (!launchDateTime.isValid)
        throw new Error('JSON 文件中的日期时间格式无效。')

      // 更新合并逻辑
      config.value = {
        missionName: jsonData.missionName,
        vehicle: jsonData.vehicle,
        launchTime: launchDateTime.toFormat('yyyy-MM-dd\'T\'HH:mm:ss'),
        timeZone: jsonData.timeZone,
        msOffset: jsonData.msOffset ?? 0,
        events: jsonData.events.map(ev => ({ time: ev.time, name: ev.name })),
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

// 获取主机地址
const host = ref('')
onMounted(() => {
  host.value = window.location.origin
})
</script>

<template>
  <div class="p-4 font-sans md:p-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">
        LaunchDeck - OBS 控制面板
      </h1>
      <Footer />
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- 左侧：编辑器 -->
      <div class="flex flex-col space-y-6">
        <!-- 新增: 文件操作 -->
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

        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            事件序列 (仅时间轴)
          </h2>
          <button class="btn-primary" @click="openEditorModal">
            编辑事件 ({{ config.events.length }}个)
          </button>
        </div>
      </div>

      <!-- 右侧：控制和预览 -->
      <div class="flex flex-col space-y-6">
        <div class="border rounded-md p-4 dark:border-gray-600">
          <h2 class="mb-3 text-xl font-semibold">
            OBS 预览链接
          </h2>
          <p class="text-sm">
            在 OBS 的浏览器源中添加以下链接:
          </p>
          <input
            type="text"
            class="input-field w-full select-all bg-gray-100 dark:bg-gray-800"
            :value="`${host}/obs-display`"
            readonly
          >
          <p class="mt-2 text-sm">
            你可以添加 `?bg=RRGGBB` 参数来改变背景色，例如 `?bg=00ff00` (绿幕) 或 `?bg=0000ff` (蓝幕)。
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

    <!-- 复用 MissionEditorModal，它只会保存它能理解的字段 -->
    <MissionEditorModal
      v-if="isEditorModalOpen"
      :initial-events="config.events"
      @close="isEditorModalOpen = false"
      @save="handleSaveEvents"
    />
  </div>
</template>

<style scoped>
/* 偷懒复用 index.vue 的样式，但为这个页面添加一个额外的 btn-secondary */
.input-field {
  @apply block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600;
}
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply px-4 py-2 bg-gray-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-gray-700 hover:shadow-lg focus:bg-gray-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-800 active:shadow-lg transition duration-150 ease-in-out;
}
</style>
