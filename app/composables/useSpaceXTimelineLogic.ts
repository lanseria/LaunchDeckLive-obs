// app/composables/useSpaceXTimelineLogic.ts
import { useStorage } from '@vueuse/core'

export interface AltitudePoint {
  time: number
  altitude: number
}

export function useSpaceXTimelineLogic() {
  const missionData = ref<MissionSequenceFile | null>(null)

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)
  const jumpTargetTimeRaw = ref<string | number>('')

  const manualAltitude = ref(0)
  const altitudeProfile = useStorage<AltitudePoint[]>('spacex_altitude_profile_v2', [])

  function calculateAltitudeFromProfile(targetTime: number): number {
    if (!altitudeProfile.value || altitudeProfile.value.length === 0)
      return manualAltitude.value
    const sortedProfile = [...altitudeProfile.value].sort((a, b) => a.time - b.time)
    if (sortedProfile.length === 0)
      return manualAltitude.value
    if (sortedProfile.length === 1)
      return sortedProfile[0]!.altitude
    if (targetTime <= sortedProfile[0]!.time)
      return sortedProfile[0]!.altitude
    if (targetTime >= sortedProfile[sortedProfile.length - 1]!.time)
      return sortedProfile[sortedProfile.length - 1]!.altitude

    for (let i = 0; i < sortedProfile.length - 1; i++) {
      const prevPoint = sortedProfile[i]!
      const nextPoint = sortedProfile[i + 1]!
      if (targetTime >= prevPoint.time && targetTime <= nextPoint.time) {
        if (prevPoint.time === nextPoint.time)
          return prevPoint.altitude
        const timeRatio = (targetTime - prevPoint.time) / (nextPoint.time - prevPoint.time)
        const interpolatedAltitude = prevPoint.altitude + (nextPoint.altitude - prevPoint.altitude) * timeRatio
        return Number.parseFloat(interpolatedAltitude.toFixed(1))
      }
    }
    return manualAltitude.value
  }

  const currentAltitude = computed<number>(() => calculateAltitudeFromProfile(currentTimeOffset.value))
  const initialCountdownOffset = computed(() => {
    const firstNegativeEventTime = missionData.value?.events.find(e => e.time < 0)?.time
    return firstNegativeEventTime ?? -60
  })

  let timerIntervalId: ReturnType<typeof setInterval> | null = null
  let targetT0TimestampMs: number | null = null
  let pauseTimeMs: number | null = null

  function formatTimeForClock(totalSeconds: number): string {
    const absValue = Math.abs(totalSeconds)
    let secondsForFormatting: number
    if (totalSeconds < 0)
      secondsForFormatting = Math.ceil(absValue)
    else secondsForFormatting = Math.floor(absValue)

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60
    const finalSign = (totalSeconds < 0 || (Object.is(totalSeconds, -0))) ? '-' : '+'
    return `T ${finalSign} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function updateTimer() {
    if (isPaused.value || !targetT0TimestampMs)
      return
    currentTimeOffset.value = (performance.now() - targetT0TimestampMs) / 1000
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
  }

  function _stopInternalTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId)
      timerIntervalId = null
    }
  }

  function _startInternalTimer() {
    _stopInternalTimer()
    if (!targetT0TimestampMs)
      return
    updateTimer()
    timerIntervalId = setInterval(updateTimer, 50)
  }

  function toggleLaunch() {
    if (!missionData.value)
      return
    if (!isStarted.value) {
      isStarted.value = true
      isPaused.value = false
      pauseTimeMs = null
      targetT0TimestampMs = performance.now() - (currentTimeOffset.value * 1000)
      _startInternalTimer()
    }
    else if (isPaused.value) {
      isPaused.value = false
      if (pauseTimeMs && targetT0TimestampMs) {
        targetT0TimestampMs += performance.now() - pauseTimeMs
      }
      pauseTimeMs = null
      _startInternalTimer()
    }
    else {
      isPaused.value = true
      pauseTimeMs = performance.now()
      _stopInternalTimer()
    }
  }

  function resetCoreTimer() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    targetT0TimestampMs = null
    pauseTimeMs = null
    currentTimeOffset.value = initialCountdownOffset.value
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
    jumpTargetTimeRaw.value = ''
  }

  function jumpToTime() {
    const targetSeconds = Number.parseFloat(String(jumpTargetTimeRaw.value))
    if (Number.isNaN(targetSeconds))
      return
    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)
    if (isStarted.value && !isPaused.value) {
      _stopInternalTimer()
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      _startInternalTimer()
    }
    else if (isStarted.value && isPaused.value) {
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
    }
    else {
      targetT0TimestampMs = null
    }
  }

  function loadMission(data: MissionSequenceFile) {
    missionData.value = data
    resetCoreTimer()
  }

  onBeforeUnmount(_stopInternalTimer)

  return {
    missionData,
    timerClock,
    isStarted,
    isPaused,
    currentTimeOffset,
    currentAltitude,
    jumpTargetTimeRaw,
    toggleLaunch,
    resetCoreTimer,
    jumpToTime,
    loadMission,
  }
}
