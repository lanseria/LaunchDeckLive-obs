import { defineStore } from 'pinia'

const LAUNCHDECK_CHANNEL_NAME = 'launchdeck-data-channel'
const SIMULATION_INTERVAL_MS = 1000 // Update every second

// Constants for simple simulation
const ALTITUDE_FACTOR = 100 // meters per second of MET (Mission Elapsed Time)
const SPEED_FACTOR = 20 // m/s per second of MET

interface TelemetryData {
  simulationTime: number
  altitude: number
  speed: number
  isPlaying: boolean // Also send isPlaying state
}

export const useControlStore = defineStore('control', {
  state: () => ({
    simulationTime: 0, // Mission Elapsed Time (MET) in seconds
    altitude: 0, // in meters
    speed: 0, // in m/s
    isPlaying: false,
    _intervalId: null as ReturnType<typeof setInterval> | null,
    _broadcastChannel: null as BroadcastChannel | null,
  }),

  actions: {
    _initBroadcastChannel() {
      if (import.meta.client && !this._broadcastChannel) {
        this._broadcastChannel = new BroadcastChannel(LAUNCHDECK_CHANNEL_NAME)
        // eslint-disable-next-line no-console
        console.log('ControlStore: BroadcastChannel initialized')
      }
    },

    _closeBroadcastChannel() {
      if (this._broadcastChannel) {
        this._broadcastChannel.close()
        this._broadcastChannel = null
        // eslint-disable-next-line no-console
        console.log('ControlStore: BroadcastChannel closed')
      }
    },

    _broadcastState() {
      if (this._broadcastChannel) {
        const data: TelemetryData = {
          simulationTime: this.simulationTime,
          altitude: this.altitude,
          speed: this.speed,
          isPlaying: this.isPlaying,
        }
        this._broadcastChannel.postMessage(data)
      }
    },

    startSimulation() {
      if (this.isPlaying)
        return
      this._initBroadcastChannel() // Ensure channel is open

      this.isPlaying = true
      if (this._intervalId)
        clearInterval(this._intervalId) // Clear any existing

      this._intervalId = setInterval(() => {
        this.simulationTime += 1 // Increment time by 1 second
        // Simple simulation logic
        this.altitude = this.simulationTime * ALTITUDE_FACTOR
        this.speed = this.simulationTime * SPEED_FACTOR
        this._broadcastState()
      }, SIMULATION_INTERVAL_MS)
      this._broadcastState() // Broadcast initial start state
      // eslint-disable-next-line no-console
      console.log('Simulation started')
    },

    pauseSimulation() {
      if (!this.isPlaying)
        return
      this.isPlaying = false
      if (this._intervalId) {
        clearInterval(this._intervalId)
        this._intervalId = null
      }
      this._broadcastState() // Broadcast paused state
      // eslint-disable-next-line no-console
      console.log('Simulation paused')
    },

    resetSimulation() {
      this.pauseSimulation() // Ensure interval is cleared and isPlaying is false
      this.simulationTime = 0
      this.altitude = 0
      this.speed = 0
      // isPlaying is already false from pauseSimulation
      this._broadcastState() // Broadcast reset state
      // eslint-disable-next-line no-console
      console.log('Simulation reset')
    },

    // Call this when the control component is mounted
    initialize() {
      this._initBroadcastChannel()
      // Optionally broadcast current state if needed on init
      // this._broadcastState();
    },

    // Call this when the control component is unmounted
    dispose() {
      this.pauseSimulation() // Stop simulation if active
      this._closeBroadcastChannel()
    },
  },
})
