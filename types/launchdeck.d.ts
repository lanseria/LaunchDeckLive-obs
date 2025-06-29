declare global {
  type DashboardStyle = 'SpaceXFalcon9'

  // 新增: 事件中的遥测数据快照
  interface EventTelemetry {
    speed_kmh?: number
    altitude_km?: number
  }

  // 新增: 事件中的显示信息
  interface EventDisplayInfo {
    title?: string
    line1?: string
    line2?: string
    line3?: string
  }

  // 任务事件结构
  interface MissionEvent {
    time: number
    name: string
    telemetry?: EventTelemetry // 可选的遥测数据
    displayInfo?: EventDisplayInfo // 可选的显示信息
  }

  interface VideoConfig {
    type: 'local' | 'live'
    source: string
    startTimeOffset?: number
  }

  // 统一的任务文件格式
  interface MissionSequenceFile {
    missionName: string
    vehicle: string
    videoConfig?: VideoConfig
    events: MissionEvent[]
  }

  // 核心遥测数据结构 (用于广播)
  interface TelemetryData {
    simulationTime: number
    timerClock: string
    isPlaying: boolean
    missionName: string
    vehicleName: string
    videoConfig?: VideoConfig
    syncVideoToTime?: number

    // --- 实时计算出的遥测数据 ---
    altitude_km: number
    speed_kmh: number

    // --- 时间轴 UI 数据 ---
    timestamps: number[]
    nodeNames: string[]
    missionDuration: number

    // --- 右下角显示信息 ---
    displayTitle: string
    displayLine1: string
    displayLine2: string
    displayLine3: string
  }
}

// 新增：时间轴配置类型
interface TimelineConfig {
  missionDuration?: number // 新增：时间轴总时长，设为可选以兼容旧配置
  pastNodeDensityFactor: number
  futureNodeDensityFactor: number
}

// 修改 OBSConfig
interface OBSConfig {
  missionName: string
  vehicle: string
  launchTime: string // ISO 8601
  timeZone: string
  msOffset: number
  events: { time: number, name: string }[]
  timelineConfig?: TimelineConfig // 新增：设为可选以兼容旧配置文件
}
export {}
