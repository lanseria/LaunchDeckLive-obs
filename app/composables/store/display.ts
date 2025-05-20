import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'

export const useDisplayStore = defineStore('display', {
  state: () => ({
    telemetry: {
      simulationTime: 0,
      altitude: 0,
      speed: 0,
      currentEventNameKey: null, // Store the key
      currentEventPayload: null,
      isPlaying: false,
      missionName: '',
      vehicleName: '',
      videoConfig: undefined, // 初始化
      syncVideoToTime: undefined, // 初始化
      allEvents: [], // 初始化为空数组
      selectedDashboardStyle: 'SpaceLen1', // 与 controlStore 默认值一致
    } as TelemetryData,
    _broadcastChannel: null as BroadcastChannel | null,
    isConnected: false,
  }),

  actions: {
    _initBroadcastChannel() {
      if (import.meta.client && !this._broadcastChannel) {
        this._broadcastChannel = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME) // Ensure same name
        this._broadcastChannel.onmessage = (event) => {
          const data = event.data as TelemetryData
          // console.log('[DISPLAY] Received broadcast. New videoConfig.source:', data.videoConfig?.source)
          this.telemetry = { ...data } // 更新所有数据
          // console.log("Display received:", data); // 调试用
          if (!this.isConnected)
            this.isConnected = true
        }
        this._broadcastChannel.onmessageerror = (event) => {
          console.error('DisplayStore: BroadcastChannel error', event)
          this.isConnected = false // Assume connection lost on error
        }
        // eslint-disable-next-line no-console
        console.log('DisplayStore: BroadcastChannel initialized and listening')
      }
    },
    _closeBroadcastChannel() {
      if (this._broadcastChannel) {
        this._broadcastChannel.close()
        this._broadcastChannel = null
        this.isConnected = false
        // eslint-disable-next-line no-console
        console.log('DisplayStore: BroadcastChannel closed')
      }
    },
    initialize() {
      this._initBroadcastChannel()
    },
    dispose() {
      this._closeBroadcastChannel()
    },
  },
})
