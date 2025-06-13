import { LAUNCHDECK_CHANNEL_NAME } from '../utils/constants'

export const useDisplayStore = defineStore('display', {
  state: () => ({
    telemetry: {
      simulationTime: 0,
      altitude: 0,
      speed: 0,
      currentEventName: null, // Renamed from currentEventNameKey
      currentEventPayload: null,
      isPlaying: false,
      missionName: '',
      vehicleName: '',
      videoConfig: undefined,
      syncVideoToTime: undefined,
      allEvents: [],
      selectedDashboardStyle: 'SpaceLen1',
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
          this.telemetry = { ...data }
          if (!this.isConnected)
            this.isConnected = true
        }
        this._broadcastChannel.onmessageerror = (event) => {
          console.error('DisplayStore: BroadcastChannel error', event)
          this.isConnected = false
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
