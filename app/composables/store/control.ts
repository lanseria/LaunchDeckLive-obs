import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'

export const useControlStore = defineStore('control', () => {
  // --- 核心状态 ---
  const missionData = ref<MissionSequenceFile | null>(null)
  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)

  // --- 私有计时器和通信变量 ---
  let _timerIntervalId: ReturnType<typeof setInterval> | null = null
  let _targetT0TimestampMs: number | null = null
  let _pauseTimeMs: number | null = null
  const _broadcastChannel = ref<BroadcastChannel | null>(null)

  // --- 关键修改点 1: 新增状态和定时器ID来管理临时显示信息 ---
  const activeDisplayInfo = ref<EventDisplayInfo>({})
  let _displayInfoTimeoutId: ReturnType<typeof setTimeout> | null = null
  const DISPLAY_INFO_DURATION_MS = 5000 // 信息显示 5 秒

  // --- 计算属性 ---
  const telemetryNodes = computed(() =>
    missionData.value?.events.filter(e => e.telemetry).sort((a, b) => a.time - b.time) ?? [],
  )

  // 这个计算属性不再直接用于广播，而是用于检测
  const displayInfoNodes = computed(() =>
    missionData.value?.events.filter(e => e.displayInfo).sort((a, b) => a.time - b.time) ?? [],
  )

  const getInterpolatedValue = (nodes: MissionEvent[], valueKey: 'speed_kmh' | 'altitude_km'): number => {
    if (nodes.length === 0)
      return 0
    const targetTime = currentTimeOffset.value
    if (targetTime <= nodes[0]!.time)
      return nodes[0]!.telemetry![valueKey] ?? 0
    if (targetTime >= nodes[nodes.length - 1]!.time)
      return nodes[nodes.length - 1]!.telemetry![valueKey] ?? 0
    for (let i = 0; i < nodes.length - 1; i++) {
      const prev = nodes[i]!; const next = nodes[i + 1]!
      if (targetTime >= prev.time && targetTime <= next.time) {
        const prevValue = prev.telemetry![valueKey] ?? 0; const nextValue = next.telemetry![valueKey] ?? 0
        if (prev.time === next.time)
          return prevValue
        const ratio = (targetTime - prev.time) / (next.time - prev.time)
        return prevValue + (nextValue - prevValue) * ratio
      }
    }
    return nodes[nodes.length - 1]!.telemetry![valueKey] ?? 0
  }

  const currentAltitude = computed(() => getInterpolatedValue(telemetryNodes.value, 'altitude_km'))
  const currentSpeed = computed(() => getInterpolatedValue(telemetryNodes.value, 'speed_kmh'))

  const initialCountdownOffset = computed(() => {
    if (missionData.value?.videoConfig?.type === 'local' && missionData.value.videoConfig.startTimeOffset !== undefined)
      return missionData.value.videoConfig.startTimeOffset
    const firstNegativeEventTime = missionData.value?.events.find(e => e.time < 0)?.time
    return firstNegativeEventTime ?? -60
  })

  // --- 核心方法 ---
  function _initBroadcastChannel() { /* ... 保持不变 ... */
    if (import.meta.client && !_broadcastChannel.value)
      _broadcastChannel.value = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
  }
  function formatTimeForClock(totalSeconds: number): string { /* ... 保持不变 ... */
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

    const rawMissionData = toRaw(missionData.value)
    const info = activeDisplayInfo.value // 直接使用带定时器逻辑的 ref

    const telemetryObject: TelemetryData = {
      simulationTime: currentTimeOffset.value,
      timerClock: timerClock.value,
      isPlaying: isStarted.value && !isPaused.value,
      missionName: rawMissionData.missionName,
      vehicleName: rawMissionData.vehicle,
      videoConfig: rawMissionData.videoConfig,
      syncVideoToTime: syncVideoToTimePayload,
      altitude_km: currentAltitude.value,
      speed_kmh: currentSpeed.value,
      timestamps: rawMissionData.events.map(e => e.time),
      nodeNames: rawMissionData.events.map(e => e.name),
      missionDuration: 2 * Math.max(...rawMissionData.events.map(e => Math.abs(e.time))),
      displayTitle: info.title ?? '',
      displayLine1: info.line1 ?? '',
      displayLine2: info.line2 ?? '',
      displayLine3: info.line3 ?? '',
    }

    _broadcastChannel.value.postMessage(telemetryObject)
  }

  // --- 关键修改点 2: 创建一个函数来检查并触发 displayInfo ---
  let _lastCheckedDisplayInfoIndex = -1
  function _checkAndTriggerDisplayInfo() {
    const nodes = displayInfoNodes.value
    if (nodes.length === 0)
      return

    // 寻找下一个应该检查的事件
    const nextIndexToCheck = _lastCheckedDisplayInfoIndex + 1
    if (nextIndexToCheck >= nodes.length)
      return // 所有事件都检查过了

    const nextNode = nodes[nextIndexToCheck]
    if (currentTimeOffset.value >= nextNode!.time) {
      // 触发！
      activeDisplayInfo.value = nextNode!.displayInfo ?? {}

      // 清除上一个定时器（如果有）
      if (_displayInfoTimeoutId) {
        clearTimeout(_displayInfoTimeoutId)
      }

      // 设置新的定时器来清空信息
      _displayInfoTimeoutId = setTimeout(() => {
        activeDisplayInfo.value = {}
      }, DISPLAY_INFO_DURATION_MS)

      // 更新检查点
      _lastCheckedDisplayInfoIndex = nextIndexToCheck
    }
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

      _checkAndTriggerDisplayInfo() // 在主循环中检查
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

  // --- 关键修改点 3: 重置和跳转时，也要重置 displayInfo 状态 ---
  function resetSimulation() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    _targetT0TimestampMs = null
    _pauseTimeMs = null
    currentTimeOffset.value = initialCountdownOffset.value
    timerClock.value = formatTimeForClock(currentTimeOffset.value)

    // 重置 displayInfo 状态
    activeDisplayInfo.value = {}
    if (_displayInfoTimeoutId)
      clearTimeout(_displayInfoTimeoutId)
    _lastCheckedDisplayInfoIndex = -1 // 重置检查点

    _updateAndBroadcast({ forceVideoSync: true })
  }

  function seekSimulation(targetSeconds: number) {
    if (Number.isNaN(targetSeconds))
      return
    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)

    // 重置并重新评估 displayInfo
    activeDisplayInfo.value = {}
    if (_displayInfoTimeoutId)
      clearTimeout(_displayInfoTimeoutId)
    _lastCheckedDisplayInfoIndex = -1

    // 找到跳转时间点之前最后一个应该显示的info
    for (let i = 0; i < displayInfoNodes.value.length; i++) {
      if (displayInfoNodes.value[i]!.time <= targetSeconds) {
        _lastCheckedDisplayInfoIndex = i
      }
      else {
        break
      }
    }
    // 注意：跳转时我们不主动显示信息，只设置检查点。信息将在下一次 _checkAndTriggerDisplayInfo 时触发。
    // 如果希望跳转后立即显示信息，可以在这里设置 activeDisplayInfo.value，但不设置定时器。

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

  function initialize() { /* ... 保持不变 ... */ _initBroadcastChannel() }
  function dispose() { /* ... 保持不变 ... */
    _stopInternalTimer()
    if (_displayInfoTimeoutId)
      clearTimeout(_displayInfoTimeoutId)
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
    speed: currentSpeed,
    loadMissionSequence,
    toggleLaunch,
    resetSimulation,
    seekSimulation,
    initialize,
    dispose,
  }
})
