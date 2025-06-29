// --- File: app/components/TimelineEditorModal.vue ---
<script setup lang="ts">
// 定义 Timeline 配置的接口，与 props 保持一致
interface TimelineConfig {
  svgWidth: number
  svgHeight: number
  pastNodeDensityFactor: number
  futureNodeDensityFactor: number
}

const props = defineProps<{
  initialConfig: TimelineConfig
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', config: TimelineConfig): void
}>()

// 创建一个本地的、可编辑的配置副本
const editableConfig = ref<TimelineConfig>(JSON.parse(JSON.stringify(props.initialConfig)))

function handleSave() {
  emit('save', editableConfig.value)
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="handleClose">
      <div class="m-4 max-w-lg w-full flex flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h2 class="text-xl font-semibold">
            时间轴外观编辑器
          </h2>
          <button class="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700" @click="handleClose">
            ✕
          </button>
        </div>

        <!-- 内容区 -->
        <div class="p-4 space-y-4">
          <div>
            <label class="font-medium">SVG 宽度 (px)</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              整个时间轴组件的渲染宽度。
            </p>
            <input v-model.number="editableConfig.svgWidth" type="number" class="input-field w-full">
          </div>
          <div>
            <label class="font-medium">SVG 高度 (px)</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              时间轴可见区域的高度。
            </p>
            <input v-model.number="editableConfig.svgHeight" type="number" class="input-field w-full">
          </div>
          <div>
            <label class="font-medium">过去节点密度因子</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              控制已发生事件在时间轴上的间距。值越大，间距越小 (更密集)。
            </p>
            <input v-model.number="editableConfig.pastNodeDensityFactor" type="number" step="0.1" class="input-field w-full">
          </div>
          <div>
            <label class="font-medium">未来节点密度因子</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              控制未发生事件的间距。值越大，间距越小。
            </p>
            <input v-model.number="editableConfig.futureNodeDensityFactor" type="number" step="0.1" class="input-field w-full">
          </div>
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
/* 复用样式 */
.input-field {
  @apply block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600;
}
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded shadow-md hover:bg-blue-700;
}
.btn-secondary {
  @apply px-4 py-2 bg-gray-500 text-white font-medium text-sm rounded hover:bg-gray-600;
}
</style>
