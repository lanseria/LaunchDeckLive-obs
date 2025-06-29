<script setup lang="ts">
// 该组件将隐式使用全局定义的 TimelineConfig 类型
const props = defineProps<{
  initialConfig: TimelineConfig
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', config: TimelineConfig): void
}>()

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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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
          <!-- 新增: 时间轴总时长 -->
          <div>
            <label class="font-medium">时间轴总时长 (秒)</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              定义时间轴的显示范围。例如，填入 1200 会让时间轴大致表示 T-600s 到 T+600s 的范围。
            </p>
            <input v-model.number="editableConfig.missionDuration" type="number" step="60" class="input-field w-full">
          </div>
          <!-- 移除: svgWidth 和 svgHeight -->

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
/* 样式保持不变 */
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
