import { useI18n } from '#imports' // Auto-imported by Nuxt i18n
import { defineStore } from 'pinia'

const LAUNCHDECK_CHANNEL_NAME = 'launchdeck-data-channel'
const SIMULATION_INTERVAL_MS = 100

const ALTITUDE_FACTOR = 100
const SPEED_FACTOR = 20

// 定义可选的仪表盘样式
export type DashboardStyle = 'SpaceXFalcon9' | 'SpaceLen1'

interface MultilingualName {
  en: string
  zh: string
  [key: string]: string // Allow other languages if needed
}

interface MissionEvent {
  time: number
  eventNameKey: string // Now a key for i18n
  payload?: Record<string, any>
}

export interface VideoConfig { // 新增
  type: 'local' | 'live'
  source: string
  startTimeOffset?: number // 对于本地视频，相对于 T-0 的偏移 (秒)
  liveStreamStartTime?: string // 对于直播流，预期的真实开始时间 (ISO string，未来)
}

interface MissionSequenceFile {
  missionName: MultilingualName
  vehicle: MultilingualName
  videoConfig?: VideoConfig // 可选的视频配置
  events: MissionEvent[]
}

interface TelemetryData {
  simulationTime: number
  altitude: number
  speed: number
  currentEventNameKey: string | null
  currentEventPayload?: Record<string, any> | null
  isPlaying: boolean
  selectedDashboardStyle: DashboardStyle
  allEvents: MissionEvent[] // 新增：任务中的所有事件
  missionName: string
  vehicleName: string
  videoConfig?: VideoConfig // 将视频配置也广播出去
  syncVideoToTime?: number // 告诉展示页视频应该播放到哪个时间点 (相对于视频自身的0秒)
}

export const useControlStore = defineStore('control', () => {
  const { locale, t } = useI18n()

  const simulationTime = ref(0)
  const altitude = ref(0)
  const speed = ref(0)
  const isPlaying = ref(false)
  const initialBoostDone = ref(false)
  const _intervalId = ref<NodeJS.Timeout | null>(null)
  const _broadcastChannel = ref<BroadcastChannel | null>(null)

  const missionSequenceFile = ref<MissionSequenceFile | null>(null)
  const currentEventNameKey = ref<string | null>(null)
  const currentEventPayload = ref<Record<string, any> | null>(null)
  const _eventIndex = ref(0)

  const selectedDashboardStyle = ref<DashboardStyle>('SpaceXFalcon9') // 新增：默认样式

  const loadedMissionName = computed(() => {
    if (!missionSequenceFile.value)
      return 'N/A'
    return missionSequenceFile.value.missionName[locale.value as 'en' | 'zh'] || missionSequenceFile.value.missionName.en
  })

  const loadedVehicleName = computed(() => {
    if (!missionSequenceFile.value)
      return 'N/A'
    return missionSequenceFile.value.vehicle[locale.value as 'en' | 'zh'] || missionSequenceFile.value.vehicle.en
  })

  function _initBroadcastChannel() {
    if (import.meta.client && !_broadcastChannel.value) {
      _broadcastChannel.value = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
    }
  }

  function _closeBroadcastChannel() {
    if (_broadcastChannel.value) {
      _broadcastChannel.value.close()
      _broadcastChannel.value = null
    }
  }

  function _broadcastState(options?: { forceVideoSync?: boolean }) { // 添加 options
    if (_broadcastChannel.value) {
      let syncVideoToTimePayload: number | undefined
      if (missionSequenceFile.value?.videoConfig?.type === 'local' && missionSequenceFile.value.videoConfig.startTimeOffset !== undefined) {
        const calculatedVideoTime = simulationTime.value - missionSequenceFile.value.videoConfig.startTimeOffset
        if (options?.forceVideoSync || isPlaying.value) {
          syncVideoToTimePayload = Math.max(0, calculatedVideoTime)
        }
      }
      const data: TelemetryData = {
        simulationTime: simulationTime.value,
        altitude: altitude.value,
        speed: speed.value,
        currentEventNameKey: currentEventNameKey.value,
        currentEventPayload: currentEventPayload.value,
        isPlaying: isPlaying.value,
        selectedDashboardStyle: selectedDashboardStyle.value, // 发送选择的样式
        missionName: loadedMissionName.value,
        vehicleName: loadedVehicleName.value,
        videoConfig: toRaw(missionSequenceFile.value?.videoConfig), // 传递视频配置
        syncVideoToTime: syncVideoToTimePayload, // 传递视频同步时间
        allEvents: toRaw(missionSequenceFile.value?.events) || [], // 发送所有事件
      }
      _broadcastChannel.value.postMessage(data)
    }
  }

  // 新增 action 用于改变仪表盘样式
  function setDashboardStyle(style: DashboardStyle) {
    selectedDashboardStyle.value = style
    _broadcastState({ forceVideoSync: isPlaying.value }) // 广播状态，如果正在播放也同步视频
    // eslint-disable-next-line no-console
    console.log('Dashboard style changed to:', style)
  }

  function loadMissionSequence(sequenceData: MissionSequenceFile) {
    sequenceData.events.sort((a, b) => a.time - b.time)
    missionSequenceFile.value = sequenceData
    resetSimulation() // 这会调用 _broadcastState
    // _broadcastState({ forceVideoSync: true }); // 确保加载新任务时视频配置被发送，并在重置后同步一次
  }

  function _checkEvents() {
    if (!missionSequenceFile.value || !missionSequenceFile.value.events.length)
      return

    const nextEvent = missionSequenceFile.value.events[_eventIndex.value]
    if (nextEvent && simulationTime.value >= nextEvent.time) {
      currentEventNameKey.value = nextEvent.eventNameKey // Store the key
      currentEventPayload.value = nextEvent.payload || null
      _eventIndex.value++
    }
  }

  function startSimulation() {
    if (isPlaying.value)
      return
    if (!missionSequenceFile.value) {
      // eslint-disable-next-line no-alert
      alert(t('fileUploadError.noMissionLoaded')) // 假设你添加了这个i18n key
      return
    }
    _initBroadcastChannel()
    isPlaying.value = true

    if (_intervalId.value)
      clearInterval(_intervalId.value)

    // 首次开始时，强制同步一次视频时间 (此时 simulationTime 对应视频0秒)
    _broadcastState({ forceVideoSync: true })

    _intervalId.value = setInterval(() => {
      const deltaTime = SIMULATION_INTERVAL_MS / 1000
      simulationTime.value += deltaTime // MET 正常递增

      if (simulationTime.value >= 0 && altitude.value === 0 && speed.value === 0 && !initialBoostDone.value) {
        // 这是一个非常简化的方式来模拟初始推力，实际应该更复杂
        altitude.value += SPEED_FACTOR * deltaTime * 0.5 // 模拟加速
        speed.value += SPEED_FACTOR * deltaTime * 2
        if (simulationTime.value > 2)
          initialBoostDone.value = true // 假设初始推力阶段短
      }
      else if (simulationTime.value >= 0) {
        altitude.value += speed.value * deltaTime
        // speed.value -= 9.8 * deltaTime; // 简单重力，如果没推力
      }
      else {
        altitude.value = 0
        speed.value = 0
      }
      _checkEvents()
      _broadcastState()
    }, SIMULATION_INTERVAL_MS)
    // _broadcastState({ forceVideoSync: true }); // 再次确保状态广播，isPlaying已经是true
  }

  function pauseSimulation() {
    if (!isPlaying.value)
      return
    isPlaying.value = false
    if (_intervalId.value) {
      clearInterval(_intervalId.value)
      _intervalId.value = null
    }
    _broadcastState() // isPlaying 为 false，syncVideoToTime 不会计算除非 forceVideoSync
  }

  function resetSimulation() {
    pauseSimulation()
    initialBoostDone.value = false // 重置辅助状态
    const firstEventTime = missionSequenceFile.value?.events[0]?.time
    simulationTime.value = (firstEventTime !== undefined && firstEventTime < 0) ? firstEventTime : 0

    altitude.value = 0
    speed.value = 0
    currentEventNameKey.value = null
    currentEventPayload.value = null
    _eventIndex.value = 0

    // 核心修改：设置 simulationTime，使其在视频0秒时对应任务的 videoStartTimeOffset
    if (missionSequenceFile.value?.videoConfig?.type === 'local' && missionSequenceFile.value.videoConfig.startTimeOffset !== undefined) {
      simulationTime.value = missionSequenceFile.value.videoConfig.startTimeOffset
    }
    else {
      // 如果没有视频配置或不是本地视频，则默认重置到 T-0
      // 或者你可以选择第一个事件的时间（如果为负）
      const firstEventTime = missionSequenceFile.value?.events[0]?.time
      simulationTime.value = (firstEventTime !== undefined && firstEventTime < 0) ? firstEventTime : 0
    }

    altitude.value = 0
    speed.value = 0
    currentEventNameKey.value = null
    currentEventPayload.value = null
    _eventIndex.value = 0

    _primeCurrentEventBasedOnTime() // 新建一个辅助函数来处理

    _broadcastState({ forceVideoSync: true }) // 强制视频同步到新的初始点
    // eslint-disable-next-line no-console
    console.log(`Simulation reset. MET set to: ${simulationTime.value}s (video should be at 0s if local video exists)`)
  }

  function _primeCurrentEventBasedOnTime() {
    currentEventNameKey.value = null // 先清除
    if (!missionSequenceFile.value || !missionSequenceFile.value.events.length)
      return

    // 找到第一个时间大于等于当前 simulationTime 的事件，或者最后一个已过的事件
    let nextEventIndex = -1
    let lastPassedEventKey: string | null = null

    for (let i = 0; i < missionSequenceFile.value.events.length; i++) {
      const event = missionSequenceFile.value.events[i]
      if (event!.time <= simulationTime.value) {
        lastPassedEventKey = event!.eventNameKey // 记录最后一个已发生或正在发生的事件
        _eventIndex.value = i + 1 // 下一个事件的索引
      }
      else if (nextEventIndex === -1) {
        nextEventIndex = i // 第一个未到时间的事件
      }
    }

    // 如果 simulationTime 刚好是某个事件的时间，或者已超过，则 currentEventNameKey 应该是该事件
    if (lastPassedEventKey) {
      currentEventNameKey.value = lastPassedEventKey
    }
    // 如果所有事件都还没到，且 simulationTime 是负数（T- 状态），显示“即将进行”第一个事件
    else if (nextEventIndex !== -1 && simulationTime.value < missionSequenceFile.value.events[nextEventIndex]!.time) {
      // 这里可以考虑是否显示 "Upcoming"，或者让 display 页面处理
      // 为简单起见，如果 simulationTime < 0 且有下一个事件，则可能是 Upcoming
      // currentEventNameKey.value = missionSequenceFile.value.events[nextEventIndex].eventNameKey; // 或者不设置，让 display 根据 MET < 0 显示
    }
    // _eventIndex 已经被上面的循环正确设置了，指向下一个要检查的事件
  }

  function seekSimulation(targetMET: number) {
    if (!missionSequenceFile.value)
      return
    const wasPlaying = isPlaying.value
    if (wasPlaying)
      pauseSimulation()

    simulationTime.value = targetMET
    _primeCurrentEventBasedOnTime() // 使用新函数更新事件状态
    _broadcastState({ forceVideoSync: true })
    if (wasPlaying)
      startSimulation()
  }

  function initialize() {
    _initBroadcastChannel()
    _broadcastState({ forceVideoSync: false }) // 发送包含默认样式在内的初始状态
  }

  function dispose() {
    pauseSimulation()
    _closeBroadcastChannel()
  }

  watch(locale, () => {
    // 当语言变化时，如果任务已加载，重新广播状态以更新翻译后的mission/vehicle name
    if (missionSequenceFile.value) {
      _broadcastState({ forceVideoSync: isPlaying.value }) // 如果在播放，也同步视频
    }
  })

  return {
    simulationTime,
    altitude,
    speed,
    isPlaying,
    missionSequenceFile,
    currentEventNameKey,
    currentEventPayload,
    loadedMissionName,
    loadedVehicleName,
    selectedDashboardStyle, // 暴露给 control.vue 读取
    loadMissionSequence,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    seekSimulation,
    initialize,
    dispose,
    setDashboardStyle, // 暴露给 control.vue 调用
  }
})
