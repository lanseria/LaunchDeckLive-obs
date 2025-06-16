import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'
import { defaultFalcon9Mission } from './default-mission'

export const useControlStore = defineStore('control', () => {
  // --- 核心状态 ---
  const missionData = ref<MissionSequenceFile | null>(null)
  const videoBlobUrl = ref<string | null>(null) // 新增：存储视频的 blob URL
  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)

  // (其他私有变量和计算属性保持不变)
  let _timerIntervalId: ReturnType<typeof setInterval> | null = null
  let _targetT0TimestampMs: number | null = null
  let _pauseTimeMs: number | null = null
  const _broadcastChannel = ref<BroadcastChannel | null>(null)
  const activeDisplayInfo = ref<EventDisplayInfo>({})
  let _displayInfoTimeoutId: ReturnType<typeof setTimeout> | null = null
  const DISPLAY_INFO_DURATION_MS = 5000
  let _lastCheckedDisplayInfoIndex = -1
  const telemetryNodes = computed(() => missionData.value?.events.filter(e => e.telemetry).sort((a, b) => a.time - b.time) ?? [])
  const displayInfoNodes = computed(() => missionData.value?.events.filter(e => e.displayInfo).sort((a, b) => a.time - b.time) ?? [])

  // --- 逻辑函数 ---

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
  function formatTimeForClock(totalSeconds: number): string {
    const abs = Math.abs(totalSeconds)
    const secs = totalSeconds < 0 ? Math.ceil(abs) : Math.floor(abs)
    const h = String(Math.floor(secs / 3600)).padStart(2, '0')
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    const sign = (totalSeconds < 0 || Object.is(totalSeconds, -0)) ? '-' : '+'
    return `T ${sign} ${h}:${m}:${s}`
  }

  // 更新 _updateAndBroadcast 以使用 videoBlobUrl
  function _updateAndBroadcast(options?: { forceVideoSync?: boolean }) {
    if (!_broadcastChannel.value || !missionData.value)
      return

    // 动态构建 videoConfig 用于广播
    const dynamicVideoConfig: VideoConfig | undefined = videoBlobUrl.value
      ? {
          type: 'local',
          source: videoBlobUrl.value,
          startTimeOffset: missionData.value.videoConfig?.startTimeOffset ?? 0,
        }
      : undefined

    let syncVideoToTimePayload: number | undefined
    if (options?.forceVideoSync && dynamicVideoConfig) {
      const offset = dynamicVideoConfig.startTimeOffset || 0
      syncVideoToTimePayload = Math.max(0, currentTimeOffset.value - offset)
    }

    const rawMissionData = toRaw(missionData.value)
    const info = activeDisplayInfo.value

    const telemetryObject: TelemetryData = {
      simulationTime: currentTimeOffset.value,
      timerClock: timerClock.value,
      isPlaying: isStarted.value && !isPaused.value,
      missionName: rawMissionData.missionName,
      vehicleName: rawMissionData.vehicle,
      videoConfig: dynamicVideoConfig, // 使用动态构建的 videoConfig
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

  // --- 新增/修改的公共函数 ---
  function loadDefaultMission() {
    // 使用深拷贝加载默认数据
    missionData.value = JSON.parse(JSON.stringify(defaultFalcon9Mission))
    // 重置视频
    if (videoBlobUrl.value) {
      URL.revokeObjectURL(videoBlobUrl.value)
      videoBlobUrl.value = null
    }
    resetSimulation()
  }

  function loadMissionSequence(data: MissionSequenceFile) {
    missionData.value = data
    // 加载新文件时，必须清空旧视频并要求用户重新选择
    if (videoBlobUrl.value) {
      URL.revokeObjectURL(videoBlobUrl.value)
      videoBlobUrl.value = null
    }
    resetSimulation()
  }

  function setVideoFile(file: File) {
    // 清理上一个 blob URL 防止内存泄漏
    if (videoBlobUrl.value) {
      URL.revokeObjectURL(videoBlobUrl.value)
    }
    videoBlobUrl.value = URL.createObjectURL(file)
    // 设置视频后，强制广播一次状态，让预览窗口能加载视频
    _updateAndBroadcast({ forceVideoSync: true })
  }

  function exportMission() {
    if (!missionData.value)
      return

    // 创建一个干净的副本用于导出
    const missionToExport = JSON.parse(JSON.stringify(toRaw(missionData.value)))

    // 移除 videoConfig，因为 blob URL 是临时的
    // 或者可以保留 startTimeOffset
    if (missionToExport.videoConfig) {
      delete missionToExport.videoConfig.source
      delete missionToExport.videoConfig.type
      // 如果 videoConfig 只剩下 startTimeOffset，可以保留，否则整个删除
      if (Object.keys(missionToExport.videoConfig).length === 0) {
        delete missionToExport.videoConfig
      }
    }

    const jsonString = JSON.stringify(missionToExport, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${missionToExport.missionName.replace(/\s/g, '_') || 'mission'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // initialize 函数中加载默认数据
  function initialize() {
    _initBroadcastChannel()
    if (!missionData.value) { // 仅在首次初始化时加载
      loadDefaultMission()
    }
  }

  // (其他所有函数保持不变)
  const initialCountdownOffset = computed(() => (missionData.value?.videoConfig?.startTimeOffset) ?? -10) // 默认为 -10
  function _initBroadcastChannel() {
    if (import.meta.client && !_broadcastChannel.value)
      _broadcastChannel.value = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
  }
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

  function dispose() {
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
    videoBlobUrl, // 暴露给UI
    isPlaying: computed(() => isStarted.value && !isPaused.value),
    simulationTime: currentTimeOffset,
    altitude: currentAltitude,
    speed: currentSpeed,
    loadMissionSequence,
    setVideoFile, // 暴露给UI
    exportMission, // 暴露给UI
    toggleLaunch,
    resetSimulation,
    seekSimulation,
    initialize,
    dispose,
  }
})
