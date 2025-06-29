<!-- eslint-disable no-alert -->
<!-- File: app/components/MissionEditorModal.vue  -->
<script setup lang="ts">
// 定义 props 和 emits
const props = defineProps<{
  // 这里的 MissionEvent 类型是全局的，包含可选的 telemetry 和 displayInfo
  // 但我们在这个组件里不使用它们，这没有问题。
  initialEvents: MissionEvent[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  // 保存时，我们只传递事件的核心部分，或者传递完整的事件对象，由父组件决定如何处理
  (e: 'save', events: MissionEvent[]): void
}>()

// --- 核心逻辑：深度拷贝 props 到本地状态 ---
const editableEvents = ref<MissionEvent[]>([])

watch(() => props.initialEvents, (newEvents) => {
  // 深拷贝仍然是必要的，以防止直接修改 prop
  editableEvents.value = JSON.parse(JSON.stringify(newEvents))
}, { immediate: true, deep: true })

// --- 编辑器内部操作 ---
function addEvent() {
  // 只添加核心字段
  editableEvents.value.push({ time: 0, name: '新事件' })
}

function deleteEvent(index: number) {
  if (editableEvents.value.length > 1) {
    editableEvents.value.splice(index, 1)
  }
  else {
    alert('至少需要保留一个事件节点。')
  }
}

// 移除了 ensureTelemetry 和 ensureDisplayInfo 函数

// --- 保存和关闭 ---
function handleSave() {
  // 通过 emit 将修改后的数据副本传回给父组件
  // 即使 editableEvents 包含空的 telemetry/displayInfo, 父组件在接收时会正确处理
  emit('save', editableEvents.value)
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
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
            <!-- 移除了遥测和描述相关的按钮和编辑区域 -->
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
/* 样式保持不变 */
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
  @apply px-4 py-2 bg-gray-500 text-white font-medium text-sm rounded hover:bg-gray-600; /* 修改以匹配 obs-control 页面 */
}
</style>
