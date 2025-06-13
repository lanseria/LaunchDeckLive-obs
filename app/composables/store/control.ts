import { LAUNCHDECK_CHANNEL_NAME, SIMULATION_INTERVAL_MS, SPEED_FACTOR } from '../utils/constants'

export const useControlStore = defineStore('control', () => {
  // const { locale, t } = useI18n() // REMOVED

  const simulationTime = ref(0)
  const altitude = ref(0)
  const speed = ref(0)
  const isPlaying = ref(false)
  const initialBoostDone = ref(false)
  const _intervalId = ref<NodeJS.Timeout | null>(null)
  const _broadcastChannel = ref<BroadcastChannel | null>(null)

  const missionSequenceFile = ref<MissionSequenceFile | null>(null)
  const currentEventName = ref<string | null>(null) // Renamed from currentEventNameKey
  const currentEventPayload = ref<Record<string, any> | null>(null)
  const _eventIndex = ref(0)

  const selectedDashboardStyle = ref<DashboardStyle>('SpaceLen1')

  const loadedMissionName = computed(() => missionSequenceFile.value?.missionName || 'N/A')
  const loadedVehicleName = computed(() => missionSequenceFile.value?.vehicle || 'N/A')

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
        simulationTime: toRaw(simulationTime.value),
        altitude: toRaw(altitude.value),
        speed: toRaw(speed.value),
        currentEventName: toRaw(currentEventName.value), // Renamed
        currentEventPayload: toRaw(currentEventPayload.value),
        isPlaying: toRaw(isPlaying.value),
        selectedDashboardStyle: toRaw(selectedDashboardStyle.value),
        missionName: toRaw(loadedMissionName.value),
        vehicleName: toRaw(loadedVehicleName.value),
        videoConfig: toRaw(missionSequenceFile.value?.videoConfig),
        syncVideoToTime: syncVideoToTimePayload,
        allEvents: toRaw(missionSequenceFile.value?.events) || [],
      }
      _broadcastChannel.value.postMessage(data)
    }
  }

  function setDashboardStyle(style: DashboardStyle) {
    selectedDashboardStyle.value = style
    _broadcastState({ forceVideoSync: isPlaying.value })
    // eslint-disable-next-line no-console
    console.log('Dashboard style changed to:', style)
  }

  function loadMissionSequence(sequenceData: MissionSequenceFile) {
    sequenceData.events.sort((a, b) => a.time - b.time)
    missionSequenceFile.value = sequenceData
    resetSimulation()
  }

  function _checkEvents() {
    if (!missionSequenceFile.value || !missionSequenceFile.value.events.length)
      return

    const nextEvent = missionSequenceFile.value.events[_eventIndex.value]
    if (nextEvent && simulationTime.value >= nextEvent.time) {
      currentEventName.value = nextEvent.eventName // Use new property
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
    _broadcastState()
  }

  function resetSimulation() {
    pauseSimulation()
    initialBoostDone.value = false
    const firstEventTime = missionSequenceFile.value?.events[0]?.time
    simulationTime.value = (firstEventTime !== undefined && firstEventTime < 0) ? firstEventTime : 0

    altitude.value = 0
    speed.value = 0
    currentEventName.value = null // Renamed
    currentEventPayload.value = null
    _eventIndex.value = 0

    if (missionSequenceFile.value?.videoConfig?.type === 'local' && missionSequenceFile.value.videoConfig.startTimeOffset !== undefined)
      simulationTime.value = missionSequenceFile.value.videoConfig.startTimeOffset
    else
      simulationTime.value = (firstEventTime !== undefined && firstEventTime < 0) ? firstEventTime : 0

    altitude.value = 0
    speed.value = 0
    currentEventName.value = null // Renamed
    currentEventPayload.value = null
    _eventIndex.value = 0

    _primeCurrentEventBasedOnTime()

    _broadcastState({ forceVideoSync: true })
    // eslint-disable-next-line no-console
    console.log(`Simulation reset. MET set to: ${simulationTime.value}s (video should be at 0s if local video exists)`)
  }

  function _primeCurrentEventBasedOnTime() {
    currentEventName.value = null // Renamed
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
    _broadcastState({ forceVideoSync: true })
    if (wasPlaying)
      startSimulation()
  }

  function initialize() {
    _initBroadcastChannel()
    _broadcastState({ forceVideoSync: false })
  }

  function dispose() {
    pauseSimulation()
    _closeBroadcastChannel()
  }

  // watch(locale, ...) // REMOVED

  return {
    simulationTime,
    altitude,
    speed,
    isPlaying,
    missionSequenceFile,
    currentEventName, // Renamed
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
