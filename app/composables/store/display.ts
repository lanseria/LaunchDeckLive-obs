/* eslint-disable no-console */
import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'

export const useDisplayStore = defineStore('display', {
  state: () => ({
    telemetry: {
      // 初始状态可以更空一些，因为它会很快被填充
      simulationTime: 0,
      timerClock: 'T - 00:00:00',
      isPlaying: false,
      missionName: 'LaunchDeck',
      vehicleName: 'Standby',
      altitude_km: 0,
      speed_kmh: 0,
      timestamps: [],
      nodeNames: [],
      missionDuration: 3600,
      maxQTitle: '',
      maxQLine1: '',
      maxQLine2: '',
      maxQLine3: '',
    } as TelemetryData,
    _broadcastChannel: null as BroadcastChannel | null,
    isConnected: false,
  }),

  actions: {
    _initBroadcastChannel() {
      if (import.meta.client && !this._broadcastChannel) {
        this._broadcastChannel = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)

        // 消息处理器
        this._broadcastChannel.onmessage = (event) => {
          // 忽略我们自己发送的请求消息
          if (typeof event.data === 'string' && event.data === 'request-state') {
            return
          }

          const data = event.data as TelemetryData
          this.telemetry = { ...data }
          if (!this.isConnected)
            this.isConnected = true
        }

        this._broadcastChannel.onmessageerror = (event) => {
          console.error('DisplayStore: BroadcastChannel error', event)
          this.isConnected = false
        }

        console.log('[DISPLAY] BroadcastChannel initialized. Requesting initial state...')
        // --- 关键修改点: 初始化后立即请求当前状态 ---
        this._broadcastChannel.postMessage('request-state')
      }
    },
    _closeBroadcastChannel() {
      if (this._broadcastChannel) {
        this._broadcastChannel.close()
        this._broadcastChannel = null
        this.isConnected = false
        console.log('[DISPLAY] BroadcastChannel closed.')
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
