import { useStorage } from '@vueuse/core'
import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'

export const useControlStore = defineStore('control', () => {
  const missionData = ref<MissionSequenceFile | null>(null)
  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)
  const altitudeProfile = useStorage<AltitudePoint[]>('spacex_altitude_profile_v3', [])

  let _timerIntervalId: ReturnType<typeof setInterval> | null = null
  let _targetT0TimestampMs: number | null = null
  let _pauseTimeMs: number | null = null
  const _broadcastChannel = ref<BroadcastChannel | null>(null)

  const initialCountdownOffset = computed(() => {
    const firstNegativeEventTime = missionData.value?.events.find(e => e.time < 0)?.time
    return firstNegativeEventTime ?? -60
  })

  const currentAltitude = computed(() => {
    const profile = altitudeProfile.value
    if (!profile || profile.length === 0)
      return missionData.value?.altitude ?? 0

    const sortedProfile = [...profile].sort((a, b) => a.time - b.time)
    const targetTime = currentTimeOffset.value

    if (sortedProfile.length === 0)
      return 0
    if (targetTime <= sortedProfile[0]!.time)
      return sortedProfile[0]!.altitude
    if (targetTime >= sortedProfile[sortedProfile.length - 1]!.time)
      return sortedProfile[sortedProfile.length - 1]!.altitude

    for (let i = 0; i < sortedProfile.length - 1; i++) {
      const prev = sortedProfile[i]!; const next = sortedProfile[i + 1]!
      if (targetTime >= prev.time && targetTime <= next.time) {
        if (prev.time === next.time)
          return prev.altitude
        const ratio = (targetTime - prev.time) / (next.time - prev.time)
        return Number.parseFloat((prev.altitude + (next.altitude - prev.altitude) * ratio).toFixed(1))
      }
    }
    return missionData.value?.altitude ?? 0
  })

  function _initBroadcastChannel() {
    if (import.meta.client && !_broadcastChannel.value)
      _broadcastChannel.value = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
  }

  function formatTimeForClock(totalSeconds: number): string {
    const abs = Math.abs(totalSeconds)
    const secs = totalSeconds < 0 ? Math.ceil(abs) : Math.floor(abs)
    const h = String(Math.floor(secs / 3600)).padStart(2, '0')
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    const sign = (totalSeconds < 0 || Object.is(totalSeconds, -0)) ? '-' : '+'
    return `T ${sign} ${h}:${m}:${s}`
  }

  function _updateAndBroadcast(options?: { forceVideoSync?: boolean }) {
    if (!_broadcastChannel.value || !missionData.value)
      return

    let syncVideoToTimePayload: number | undefined
    if (options?.forceVideoSync && missionData.value.videoConfig?.type === 'local') {
      const offset = missionData.value.videoConfig.startTimeOffset || 0
      syncVideoToTimePayload = Math.max(0, currentTimeOffset.value - offset)
    }

    // --- 关键修改点 ---
    // 1. 先构建一个包含响应式引用的临时对象
    const rawMissionData = toRaw(missionData.value) // 对整个 missionData 对象使用 toRaw

    const telemetryObject: TelemetryData = {
      simulationTime: currentTimeOffset.value, // 原始类型，无需 toRaw
      timerClock: timerClock.value, // 原始类型，无需 toRaw
      isPlaying: isStarted.value && !isPaused.value, // 原始类型，无需 toRaw
      missionName: rawMissionData.missionName,
      vehicleName: rawMissionData.vehicle,
      videoConfig: rawMissionData.videoConfig, // 从 toRaw 后的对象中取
      syncVideoToTime: syncVideoToTimePayload, // 原始类型
      altitude_km: currentAltitude.value, // 原始类型
      speed_kmh: rawMissionData.speed ?? 0,
      // 2. 确保 map 使用正确的 key 'name'
      timestamps: rawMissionData.events.map(e => e.time),
      nodeNames: rawMissionData.events.map(e => e.name), // 确认使用 e.name
      missionDuration: 2 * Math.max(...rawMissionData.events.map(e => Math.abs(e.time))),
      maxQTitle: rawMissionData.maxQTitle ?? '',
      maxQLine1: rawMissionData.maxQLine1 ?? '',
      maxQLine2: rawMissionData.maxQLine2 ?? '',
      maxQLine3: rawMissionData.maxQLine3 ?? '',
    }

    // 3. postMessage 发送纯净的对象
    _broadcastChannel.value.postMessage(telemetryObject)
  }

  function _stopInternalTimer() {
    if (_timerIntervalId) {
      clearInterval(_timerIntervalId)
      _timerIntervalId = null
    }
  }

  function _startInternalTimer() {
    _stopInternalTimer()
    if (!_targetT0TimestampMs)
      return

    const timerLoop = () => {
      if (isPaused.value || !_targetT0TimestampMs)
        return
      currentTimeOffset.value = (performance.now() - _targetT0TimestampMs) / 1000
      timerClock.value = formatTimeForClock(currentTimeOffset.value)
      _updateAndBroadcast()
    }
    timerLoop()
    _timerIntervalId = setInterval(timerLoop, 50)
  }

  function loadMissionSequence(data: MissionSequenceFile) {
    missionData.value = data
    resetSimulation()
  }

  function toggleLaunch() {
    if (!missionData.value)
      return
    if (!isStarted.value) {
      isStarted.value = true; isPaused.value = false; _pauseTimeMs = null
      _targetT0TimestampMs = performance.now() - (currentTimeOffset.value * 1000)
      _startInternalTimer()
    }
    else if (isPaused.value) {
      isPaused.value = false
      if (_pauseTimeMs && _targetT0TimestampMs)
        _targetT0TimestampMs += performance.now() - _pauseTimeMs
      _pauseTimeMs = null
      _startInternalTimer()
    }
    else {
      isPaused.value = true
      _pauseTimeMs = performance.now()
      _stopInternalTimer()
    }
    _updateAndBroadcast()
  }

  function resetSimulation() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    _targetT0TimestampMs = null
    _pauseTimeMs = null
    currentTimeOffset.value = initialCountdownOffset.value
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
    _updateAndBroadcast({ forceVideoSync: true })
  }

  function seekSimulation(targetSeconds: number) {
    if (Number.isNaN(targetSeconds))
      return
    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)

    if (isStarted.value && !isPaused.value) {
      _stopInternalTimer()
      _targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      _startInternalTimer()
    }
    else {
      _targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
    }
    _updateAndBroadcast({ forceVideoSync: true })
  }

  function initialize() {
    _initBroadcastChannel()
  }

  function dispose() {
    _stopInternalTimer()
    if (_broadcastChannel.value) {
      _broadcastChannel.value.close()
      _broadcastChannel.value = null
    }
  }

  return {
    missionData,
    isPlaying: computed(() => isStarted.value && !isPaused.value),
    simulationTime: currentTimeOffset,
    altitude: currentAltitude,
    speed: computed(() => missionData.value?.speed ?? 0),
    loadMissionSequence,
    toggleLaunch,
    resetSimulation,
    seekSimulation,
    initialize,
    dispose,
  }
})
