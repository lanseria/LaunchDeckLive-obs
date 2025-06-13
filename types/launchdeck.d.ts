declare global {
  type DashboardStyle = 'SpaceXFalcon9'

  interface MissionEvent {
    time: number
    name: string // 确保这里是 'name'
  }

  interface VideoConfig {
    type: 'local' | 'live'
    source: string
    startTimeOffset?: number
  }

  interface MissionSequenceFile {
    missionName: string
    vehicle: string
    videoConfig?: VideoConfig
    events: MissionEvent[]
    speed?: number
    altitude?: number
    maxQTitle?: string
    maxQLine1?: string
    maxQLine2?: string
    maxQLine3?: string
  }

  interface AltitudePoint {
    time: number
    altitude: number
  }

  interface TelemetryData {
    simulationTime: number
    timerClock: string
    isPlaying: boolean
    missionName: string
    vehicleName: string
    videoConfig?: VideoConfig
    syncVideoToTime?: number
    altitude_km: number
    speed_kmh: number
    timestamps: number[]
    nodeNames: string[] // 这个将包含正确的名称
    missionDuration: number
    maxQTitle: string
    maxQLine1: string
    maxQLine2: string
    maxQLine3: string
  }
}

export {}
