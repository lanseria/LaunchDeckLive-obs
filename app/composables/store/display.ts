import { defineStore } from 'pinia'

const LAUNCHDECK_CHANNEL_NAME = 'launchdeck-data-channel'

interface TelemetryData {
  simulationTime: number
  altitude: number
  speed: number
  isPlaying: boolean
}

export const useDisplayStore = defineStore('display', {
  state: () => ({
    telemetry: {
      simulationTime: 0,
      altitude: 0,
      speed: 0,
      isPlaying: false, // To reflect control panel's state
    } as TelemetryData,
    _broadcastChannel: null as BroadcastChannel | null,
    isConnected: false,
  }),

  actions: {
    _initBroadcastChannel() {
      if (import.meta.client && !this._broadcastChannel) {
        this._broadcastChannel = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
        this._broadcastChannel.onmessage = (event) => {
          const data = event.data as TelemetryData
          this.telemetry = { ...data } // Update with received data
          if (!this.isConnected)
            this.isConnected = true
          // console.log('DisplayStore: Received data', this.telemetry)
        }
        this._broadcastChannel.onmessageerror = (event) => {
          console.error('DisplayStore: BroadcastChannel error', event)
        }
        console.log('DisplayStore: BroadcastChannel initialized and listening')
      }
    },
    _closeBroadcastChannel() {
      if (this._broadcastChannel) {
        this._broadcastChannel.close()
        this._broadcastChannel = null
        this.isConnected = false
        console.log('DisplayStore: BroadcastChannel closed')
      }
    },

    // Call this when the display component is mounted
    initialize() {
      this._initBroadcastChannel()
    },

    // Call this when the display component is unmounted
    dispose() {
      this._closeBroadcastChannel()
    },
  },
})
