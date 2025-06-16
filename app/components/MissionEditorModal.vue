<script setup lang="ts">
// 定义 props 和 emits
const props = defineProps<{
  initialEvents: MissionEvent[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', events: MissionEvent[]): void
}>()

// --- 核心逻辑：深度拷贝 props 到本地状态 ---
// ref() 会自动进行深层响应式处理
const editableEvents = ref<MissionEvent[]>([])

// 使用 watch 来响应 props 的变化，确保每次打开弹窗都加载最新的数据
watch(() => props.initialEvents, (newEvents) => {
  // 使用 JSON.parse(JSON.stringify(...)) 是一个简单可靠的深拷贝方法
  editableEvents.value = JSON.parse(JSON.stringify(newEvents))
}, { immediate: true, deep: true })

// --- 编辑器内部操作 ---
function addEvent() {
  editableEvents.value.push({ time: 0, name: '新事件' })
}

function deleteEvent(index: number) {
  if (editableEvents.value.length > 1) {
    editableEvents.value.splice(index, 1)
  }
  else {
    // 可以给用户一个提示，至少需要一个事件
    alert('至少需要保留一个事件节点。')
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

// --- 保存和关闭 ---
function handleSave() {
  // 通过 emit 将修改后的数据副本传回给父组件
  emit('save', editableEvents.value)
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <!-- 使用 Teleport 将弹窗渲染到 body 的顶层，避免 z-index 问题 -->
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="handleClose">
      <div class="m-4 max-w-2xl w-full flex flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h2 class="text-xl font-semibold">
            事件序列编辑器
          </h2>
          <button class="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700" @click="handleClose">
            ✕
          </button>
        </div>

        <!-- 滚动内容区 -->
        <div class="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          <div v-for="(event, index) in editableEvents" :key="index" class="border rounded-md bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
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
            <div v-if="event.telemetry" class="mt-2 rounded bg-gray-100 p-2 space-y-2 dark:bg-gray-700/50">
              <div class="flex items-center gap-2 text-sm">
                <label>速度(km/h):</label> <input v-model.number="event.telemetry.speed_kmh" type="number" class="input-field w-full">
              </div>
              <div class="flex items-center gap-2 text-sm">
                <label>高度(km):</label> <input v-model.number="event.telemetry.altitude_km" type="number" step="0.1" class="input-field w-full">
              </div>
            </div>
            <!-- 描述信息编辑器 -->
            <div v-if="event.displayInfo" class="mt-2 rounded bg-gray-100 p-2 text-sm space-y-2 dark:bg-gray-700/50">
              <input v-model="event.displayInfo.title" placeholder="标题" class="input-field w-full">
              <input v-model="event.displayInfo.line1" placeholder="描述行 1" class="input-field w-full">
              <input v-model="event.displayInfo.line2" placeholder="描述行 2" class="input-field w-full">
              <input v-model="event.displayInfo.line3" placeholder="描述行 3" class="input-field w-full">
            </div>
          </div>
          <button class="btn-primary w-full" @click="addEvent">
            添加新事件
          </button>
        </div>

        <!-- 弹窗底部 -->
        <div class="flex justify-end border-t p-4 space-x-4 dark:border-gray-700">
          <button class="btn-secondary" @click="handleClose">
            取消
          </button>
          <button class="btn-primary" @click="handleSave">
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 偷懒复用 index.vue 的样式，或者在这里定义独立的样式 */
.input-field {
  @apply block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600;
}
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 focus:bg-blue-700 focus:outline-none;
}
.btn-danger {
  @apply px-2 py-2 bg-red-600 text-white font-medium text-xs rounded hover:bg-red-700;
}
.btn-secondary {
  @apply px-2 py-1 bg-gray-500 text-white font-medium text-xs rounded hover:bg-gray-600 transition;
}
</style>
