// types/launchdeck.d.ts
declare global {
  // OBS 时间轴外观配置
  interface TimelineConfig {
    missionDuration?: number // 时间轴总时长 (秒)
    pastNodeDensityFactor: number
    futureNodeDensityFactor: number
  }

  // OBS 任务事件结构
  interface MissionEvent {
    time: number
    name: string
  }

  // OBS 核心配置结构 (用于控制端与后端通信)
  interface OBSConfig {
    missionName: string
    vehicle: string
    launchTime: string // ISO 8601 格式的 UTC 时间字符串
    timeZone: string
    msOffset: number
    events: MissionEvent[]
    timelineConfig?: TimelineConfig
  }
}

export {}