import { LAUNCHDECK_CHANNEL_NAME, SIMULATION_INTERVAL_MS, SPEED_FACTOR } from '../utils/constants'

export const useControlStore = defineStore('control', () => {
  const simulationTime = ref(0)
  const altitude = ref(0)
  const speed = ref(0)
  const isPlaying = ref(false)
  const initialBoostDone = ref(false)
  const _intervalId = ref<NodeJS.Timeout | null>(null)
  const _broadcastChannel = ref<BroadcastChannel | null>(null)

  const missionSequenceFile = ref<MissionSequenceFile | null>(null)
  const currentEventName = ref<string | null>(null)
  const currentEventPayload = ref<Record<string, any> | null>(null)
  const _eventIndex = ref(0)

  const selectedDashboardStyle = ref<DashboardStyle>('SpaceLen1')

  const loadedMissionName = computed(() => missionSequenceFile.value?.missionName || 'N/A')
  const loadedVehicleName = computed(() => missionSequenceFile.value?.vehicle || 'N/A')

  function _initBroadcastChannel() {
    if (import.meta.client && !_broadcastChannel.value)
      _broadcastChannel.value = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
  }

  function _closeBroadcastChannel() {
    if (_broadcastChannel.value) {
      _broadcastChannel.value.close()
      _broadcastChannel.value = null
    }
  }

  function _broadcastState(options?: { forceVideoSync?: boolean }) {
    if (_broadcastChannel.value) {
      let syncVideoToTimePayload: number | undefined
      // **核心改动**: 只有在明确要求时才计算和发送 syncVideoToTime
      if (options?.forceVideoSync && missionSequenceFile.value?.videoConfig?.type === 'local' && missionSequenceFile.value.videoConfig.startTimeOffset !== undefined) {
        const calculatedVideoTime = simulationTime.value - missionSequenceFile.value.videoConfig.startTimeOffset
        syncVideoToTimePayload = Math.max(0, calculatedVideoTime)
      }

      const data: TelemetryData = {
        simulationTime: toRaw(simulationTime.value),
        altitude: toRaw(altitude.value),
        speed: toRaw(speed.value),
        currentEventName: toRaw(currentEventName.value),
        currentEventPayload: toRaw(currentEventPayload.value),
        isPlaying: toRaw(isPlaying.value),
        selectedDashboardStyle: toRaw(selectedDashboardStyle.value),
        missionName: toRaw(loadedMissionName.value),
        vehicleName: toRaw(loadedVehicleName.value),
        videoConfig: toRaw(missionSequenceFile.value?.videoConfig),
        syncVideoToTime: syncVideoToTimePayload, // 可能为 undefined
        allEvents: toRaw(missionSequenceFile.value?.events) || [],
      }
      _broadcastChannel.value.postMessage(data)
    }
  }

  function setDashboardStyle(style: DashboardStyle) {
    selectedDashboardStyle.value = style
    _broadcastState() // 切换样式不需要同步视频
  }

  function loadMissionSequence(sequenceData: MissionSequenceFile) {
    sequenceData.events.sort((a, b) => a.time - b.time)
    missionSequenceFile.value = sequenceData
    resetSimulation() // reset 会强制同步视频
  }

  function _checkEvents() {
    if (!missionSequenceFile.value || !missionSequenceFile.value.events.length)
      return

    const nextEvent = missionSequenceFile.value.events[_eventIndex.value]
    if (nextEvent && simulationTime.value >= nextEvent.time) {
      currentEventName.value = nextEvent.eventName
      currentEventPayload.value = nextEvent.payload || null
      _eventIndex.value++
    }
  }

  function startSimulation() {
    if (isPlaying.value)
      return
    if (!missionSequenceFile.value) {
      // eslint-disable-next-line no-alert
      alert('请先加载任务时序文件')
      return
    }
    _initBroadcastChannel()
    isPlaying.value = true

    if (_intervalId.value)
      clearInterval(_intervalId.value)

    // **关键**: 开始时强制同步一次视频
    _broadcastState({ forceVideoSync: true })

    _intervalId.value = setInterval(() => {
      const deltaTime = SIMULATION_INTERVAL_MS / 1000
      simulationTime.value += deltaTime

      if (simulationTime.value >= 0 && altitude.value === 0 && speed.value === 0 && !initialBoostDone.value) {
        altitude.value += SPEED_FACTOR * deltaTime * 0.5
        speed.value += SPEED_FACTOR * deltaTime * 2
        if (simulationTime.value > 2)
          initialBoostDone.value = true
      }
      else if (simulationTime.value >= 0) {
        altitude.value += speed.value * deltaTime
      }
      else {
        altitude.value = 0
        speed.value = 0
      }
      _checkEvents()
      // **关键**: 正常循环时不再发送视频同步指令
      _broadcastState()
    }, SIMULATION_INTERVAL_MS)
  }

  function pauseSimulation() {
    if (!isPlaying.value)
      return
    isPlaying.value = false
    if (_intervalId.value) {
      clearInterval(_intervalId.value)
      _intervalId.value = null
    }
    // **关键**: 暂停时也广播一次状态，确保 isPlaying=false 被发送
    _broadcastState({ forceVideoSync: false }) // 暂停不需要强制视频seek
  }

  function resetSimulation() {
    pauseSimulation()
    initialBoostDone.value = false
    _eventIndex.value = 0
    currentEventPayload.value = null

    if (missionSequenceFile.value?.videoConfig?.type === 'local' && missionSequenceFile.value.videoConfig.startTimeOffset !== undefined) {
      simulationTime.value = missionSequenceFile.value.videoConfig.startTimeOffset
    }
    else {
      const firstEventTime = missionSequenceFile.value?.events[0]?.time
      simulationTime.value = (firstEventTime !== undefined && firstEventTime < 0) ? firstEventTime : 0
    }

    altitude.value = 0
    speed.value = 0

    _primeCurrentEventBasedOnTime()

    // **关键**: 重置时强制同步视频到新的起点
    _broadcastState({ forceVideoSync: true })
    // eslint-disable-next-line no-console
    console.log(`Simulation reset. MET set to: ${simulationTime.value}s`)
  }

  function _primeCurrentEventBasedOnTime() {
    currentEventName.value = null
    if (!missionSequenceFile.value || !missionSequenceFile.value.events.length)
      return

    let lastPassedEvent: MissionEvent | null = null
    for (let i = 0; i < missionSequenceFile.value.events.length; i++) {
      const event = missionSequenceFile.value.events[i]
      if (event!.time <= simulationTime.value) {
        lastPassedEvent = event!
        _eventIndex.value = i + 1
      }
      else {
        break
      }
    }

    if (lastPassedEvent)
      currentEventName.value = lastPassedEvent.eventName
  }

  function seekSimulation(targetMET: number) {
    if (!missionSequenceFile.value)
      return
    const wasPlaying = isPlaying.value
    if (wasPlaying)
      pauseSimulation()

    simulationTime.value = targetMET
    _primeCurrentEventBasedOnTime()
    // **关键**: 手动跳转时强制同步视频
    _broadcastState({ forceVideoSync: true })
    if (wasPlaying)
      startSimulation()
  }

  function initialize() {
    _initBroadcastChannel()
    _broadcastState() // 初始广播
  }

  function dispose() {
    pauseSimulation()
    _closeBroadcastChannel()
  }

  return {
    simulationTime,
    altitude,
    speed,
    isPlaying,
    missionSequenceFile,
    currentEventName,
    currentEventPayload,
    loadedMissionName,
    loadedVehicleName,
    selectedDashboardStyle,
    loadMissionSequence,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    seekSimulation,
    initialize,
    dispose,
    setDashboardStyle,
  }
})
