<script setup lang="ts">
// Vue/Nuxt imports - Nuxt auto-imports these
// import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
// import { useI18n } from '#imports';

// Our project's formatter
// import type { TelemetryData, MissionEvent } from '~/types/launchdeck'; // Global types

const props = defineProps<{
  telemetry: TelemetryData
}>()

const { t } = useI18n()

// --- Refs for SVG elements ---
const svgRef = ref<SVGSVGElement | null>(null)

// --- State mimicking React component's state ---
// These are a mix of user-configurable and internal state for the display
const userTimestampsInput = ref<string[]>(['0:05', '0:10', '0:30', '1:00', '1:10', '1:15', '1:30', '2:00']) // User input, string "M:SS"
const userNodeNames = ref<string[]>(['Startup', 'Liftoff', 'Max Q', 'MECO', 'S1 Detach', 'S2 Startup', 'SECO', 'Deploy'])
const userMissionTimeInput = ref<string>('2:30') // Total mission duration for the circle display, "M:SS"
const userLaunchTimeInput = ref<string>('0:10') // Countdown starts from T - this value (10 seconds) "M:SS" or just seconds for simplicity

const timerClockDisplay = ref<string>('T - 00:00:10') // Central countdown/countup display
const isCountdownActive = ref(false) // Tracks if countdown/countup is running

// --- Internal state for plotting, directly manipulated like in React ---
// These are in MINUTES for plotNodesOnCircle compatibility with React's logic
let plotTimestampsMin: number[] = [] // Array of event times in minutes, will be modified by startRotation
// We need to initialize and update this based on userTimestampsInput
// And also ensure it's reactive if we want Vue to pick up direct array manipulations
// For now, we'll manage it more imperatively.

// --- Timer IDs ---
let countdownTimerId: NodeJS.Timeout | null = null
let rotationIntervalId: NodeJS.Timeout | null = null

// --- SVG Constants (from React code) ---
const SVG_WIDTH = 1200
const SVG_HEIGHT = 1200
const CIRCLE_RADIUS = 576
const CENTER_X = SVG_WIDTH / 2
const CENTER_Y = SVG_HEIGHT / 2

// --- Helper: Convert "M:SS" or "S" string to float minutes ---
function convertInputTimeToFloatMinutes(timeStr: string): number {
  if (!timeStr)
    return 0
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':')
    const minutes = Number.parseInt(parts[0]!, 10)
    const seconds = Number.parseInt(parts[1]!, 10)
    if (isNaN(minutes) || isNaN(seconds))
      return 0
    return Number.parseFloat((minutes + (seconds / 60)).toFixed(4)) // More precision
  }
  // Assume it's seconds if no colon, convert to minutes
  const secondsOnly = Number.parseFloat(timeStr)
  return isNaN(secondsOnly) ? 0 : Number.parseFloat((secondsOnly / 60).toFixed(4))
}

// --- Helper: Convert total seconds to "HH:MM:SS" ---
function formatSecondsToHMS(totalSeconds: number, prefix: string = 'T - '): string {
  const isNegative = totalSeconds < 0
  if (isNegative && prefix === 'T - ') { // If already T-, don't double negative prefix
    totalSeconds = Math.abs(totalSeconds)
  }
  else if (isNegative) { // if T+ but seconds are negative (should not happen if logic is right)
    totalSeconds = Math.abs(totalSeconds)
    prefix = 'T - '
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${prefix}${hh}:${mm}:${ss}`
}

// --- Core SVG Plotting (Migrated and adapted from React) ---
function plotNodesOnCircle(
  numNodes: number,
  totalDurationMinutes: number, // Circle represents this total duration
  radius: number,
  eventTimesMinutes: number[], // Current times of events on the circle (these will "move")
  nodeNamesList: string[],
  svgEl: SVGSVGElement,
  svgW: number,
  svgH: number,
) {
  if (!svgEl || totalDurationMinutes <= 0)
    return

  // Clear previous SVG content
  while (svgEl.firstChild) {
    svgEl.removeChild(svgEl.firstChild)
  }

  const cx = svgW / 2
  const cy = svgH / 2

  // 1. Background Circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  bgCircle.setAttribute('cx', cx.toString())
  bgCircle.setAttribute('cy', cy.toString())
  bgCircle.setAttribute('r', radius.toString())
  bgCircle.setAttribute('stroke', '#ffffff')
  bgCircle.setAttribute('fill', 'none') // Important for visibility of nodes
  bgCircle.setAttribute('stroke-width', '1')
  svgEl.appendChild(bgCircle)

  // 2. "Current Time" Marker (at the original bottom, which becomes top after 180deg SVG rotation)
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  marker.setAttribute('stroke', '#ffffff')
  marker.setAttribute('stroke-width', '1') // React CSS has this for #marker too
  marker.setAttribute('x1', cx.toString())
  marker.setAttribute('y1', (cy + radius + 3).toString())
  marker.setAttribute('x2', cx.toString())
  marker.setAttribute('y2', (cy + radius - 3).toString())
  svgEl.appendChild(marker)

  // 3. Plot each event node
  for (let i = 0; i < numNodes; i++) {
    const t_i = eventTimesMinutes[i]! // Event's current time value (in minutes) on the "moving" timeline
    const name_i = nodeNamesList[i] || `Event ${i + 1}`

    // Angle calculation from React: 0 at bottom, clockwise for increasing time (before SVG rotation)
    // angle_rad = (2 * Math.PI * t_i / totalDurationMinutes) + (Math.PI / 2); (0 at Y-axis bottom, positive Y down)
    // This angle determines how far "around" the circle the node is, based on its current t_i
    let angle_rad = (t_i / totalDurationMinutes) * (2 * Math.PI) + (Math.PI / 2)

    const nodeX = cx + radius * Math.cos(angle_rad)
    const nodeY = cy + radius * Math.sin(angle_rad)

    // Node dot
    const nodeDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeDot.setAttribute('cx', nodeX.toString())
    nodeDot.setAttribute('cy', nodeY.toString())
    nodeDot.setAttribute('r', '5')
    nodeDot.setAttribute('stroke', '#ffffff')
    nodeDot.setAttribute('stroke-width', '1')
    nodeDot.setAttribute('fill', '#000000') // Black fill as in React example
    svgEl.appendChild(nodeDot)

    // Small white circle on node (React's logic)
    if ((cx + nodeX) >= cx && (cy + nodeY) <= (cy + radius)) { // This condition needs re-evaluation based on final coord system
      // The original React condition (centerX + x_i) >= (centerX) && (centerY + y_i) <= (centerY + r)
      // where x_i, y_i are offsets from center. So, nodeX >= centerX && nodeY <= centerY + r
      const nameCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      nameCircle.setAttribute('cx', nodeX.toString())
      nameCircle.setAttribute('cy', nodeY.toString())
      nameCircle.setAttribute('r', '2')
      nameCircle.setAttribute('fill', '#ffffff')
      svgEl.appendChild(nameCircle)
    }

    // Node name text
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    let textPosY = nodeY
    if ((numNodes % 2 !== 0) && (i === numNodes - 1)) {
      textPosY -= 15
    }
    else if (i % 2 === 0) {
      textPosY -= 15
    }
    else {
      textPosY += 25
    }
    textNode.setAttribute('x', nodeX.toString())
    textNode.setAttribute('y', textPosY.toString())
    // Text rotation: (angle_rad + PI/2) makes text perpendicular to radius, readable
    const textRotationDeg = (angle_rad + Math.PI / 2) * (180 / Math.PI)
    textNode.setAttribute('transform', `rotate(${textRotationDeg}, ${nodeX}, ${nodeY})`)
    textNode.setAttribute('fill', '#ffffff')
    textNode.setAttribute('font-size', '10')
    textNode.setAttribute('text-anchor', 'middle')
    textNode.textContent = name_i
    svgEl.appendChild(textNode)

    // Line connecting node to text
    const lineNode = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    let lineY1 = nodeY; let lineY2 = nodeY
    if ((numNodes % 2 !== 0) && (i === numNodes - 1)) {
      lineY1 -= 5; lineY2 -= 10
    }
    else if (i % 2 === 0) {
      lineY1 -= 5; lineY2 -= 10
    }
    else {
      lineY1 += 5; lineY2 += 10
    }
    lineNode.setAttribute('x1', nodeX.toString())
    lineNode.setAttribute('y1', lineY1.toString())
    lineNode.setAttribute('x2', nodeX.toString())
    lineNode.setAttribute('y2', lineY2.toString())
    lineNode.setAttribute('transform', `rotate(${textRotationDeg}, ${nodeX}, ${nodeY})`) // Also rotate the line
    lineNode.setAttribute('stroke', '#ffffff')
    lineNode.setAttribute('stroke-width', '1')
    svgEl.appendChild(lineNode)
  }
}

// --- Countdown and Rotation Logic (Migrated) ---
function startCountdown(initialMinutesStr: string, mode: 'dec' | 'inc') {
  if (countdownTimerId)
    clearInterval(countdownTimerId)

  // Use props.telemetry.simulationTime for the central display if already running from control panel
  // But this component has its own timer for the visual.
  // Let's use `timerClockDisplay` for this component's own countdown.
  let durationSeconds = convertInputTimeToFloatMinutes(initialMinutesStr) * 60
  if (mode === 'inc' && initialMinutesStr === '0')
    durationSeconds = 0 // Start T+ from 0

  let currentTimerSeconds = durationSeconds

  countdownTimerId = setInterval(() => {
    timerClockDisplay.value = formatSecondsToHMS(currentTimerSeconds, mode === 'dec' ? 'T - ' : 'T + ')

    if (mode === 'dec') {
      currentTimerSeconds--
      if (currentTimerSeconds < 0) {
        clearInterval(countdownTimerId!)
        countdownTimerId = null
        // Switch to T+ mode and start "rotation"
        startRotationAnimation()
        startCountdown('0', 'inc') // Start T+ count from 00:00:00
      }
    }
    else { // inc mode
      currentTimerSeconds++
      // T+ can run indefinitely or have a max based on missionTimeInput
    }
  }, 1000)
}

function startRotationAnimation() {
  if (rotationIntervalId)
    clearInterval(rotationIntervalId)

  // Initialize plotTimestampsMin from userTimestampsInput if not already done or if changed
  plotTimestampsMin = userTimestampsInput.value.map(t => convertInputTimeToFloatMinutes(t))

  const decrementPerIntervalMin = 0.001 // From React code (very small step)
  const intervalMS = 75 // From React code

  rotationIntervalId = setInterval(() => {
    // Decrement each timestamp to make them "move"
    plotTimestampsMin = plotTimestampsMin.map(t => t - decrementPerIntervalMin)

    if (svgRef.value) {
      plotNodesOnCircle(
        plotTimestampsMin.length,
        convertInputTimeToFloatMinutes(userMissionTimeInput.value), // Total duration represented by circle
        CIRCLE_RADIUS,
        plotTimestampsMin, // The "moving" timestamps
        userNodeNames.value,
        svgRef.value,
        SVG_WIDTH,
        SVG_HEIGHT,
      )
    }
  }, intervalMS)
}

// --- Event Handlers for UI ---
function handleStartStopClick() {
  isCountdownActive.value = !isCountdownActive.value
  if (isCountdownActive.value) {
    // Initialize plotTimestampsMin before starting, based on current user input
    plotTimestampsMin = userTimestampsInput.value.map(t => convertInputTimeToFloatMinutes(t))
    if (svgRef.value) { // Initial plot before countdown starts
      plotNodesOnCircle(
        plotTimestampsMin.length,
        convertInputTimeToFloatMinutes(userMissionTimeInput.value),
        CIRCLE_RADIUS,
        plotTimestampsMin,
        userNodeNames.value,
        svgRef.value,
        SVG_WIDTH,
        SVG_HEIGHT,
      )
    }
    startCountdown(userLaunchTimeInput.value, 'dec')
  }
  else {
    if (countdownTimerId)
      clearInterval(countdownTimerId)
    if (rotationIntervalId)
      clearInterval(rotationIntervalId)
    countdownTimerId = null
    rotationIntervalId = null
    // Optionally reset timerClockDisplay to T- of launch time input
    const launchTimeSec = convertInputTimeToFloatMinutes(userLaunchTimeInput.value) * 60
    timerClockDisplay.value = formatSecondsToHMS(launchTimeSec, 'T - ')
  }
}

// --- Lifecycle and Watchers ---
onMounted(() => {
  // Initial plot when component mounts, using default/loaded values
  // Convert initial userTimestampsInput to plotTimestampsMin
  plotTimestampsMin = userTimestampsInput.value.map(t => convertInputTimeToFloatMinutes(t))
  if (svgRef.value) {
    plotNodesOnCircle(
      plotTimestampsMin.length,
      convertInputTimeToFloatMinutes(userMissionTimeInput.value),
      CIRCLE_RADIUS,
      plotTimestampsMin,
      userNodeNames.value,
      svgRef.value,
      SVG_WIDTH,
      SVG_HEIGHT,
    )
  }
  // Set initial timer clock display based on T- launch time
  const initialLaunchTimeSec = convertInputTimeToFloatMinutes(userLaunchTimeInput.value) * 60
  timerClockDisplay.value = formatSecondsToHMS(initialLaunchTimeSec, 'T - ')
})

onBeforeUnmount(() => {
  if (countdownTimerId)
    clearInterval(countdownTimerId)
  if (rotationIntervalId)
    clearInterval(rotationIntervalId)
})

// Watch for changes in user inputs to replot if countdown is not active
watch([userTimestampsInput, userNodeNames, userMissionTimeInput], () => {
  if (!isCountdownActive.value && svgRef.value) {
    plotTimestampsMin = userTimestampsInput.value.map(t => convertInputTimeToFloatMinutes(t))
    plotNodesOnCircle(
      plotTimestampsMin.length,
      convertInputTimeToFloatMinutes(userMissionTimeInput.value),
      CIRCLE_RADIUS,
      plotTimestampsMin,
      userNodeNames.value,
      svgRef.value,
      SVG_WIDTH,
      SVG_HEIGHT,
    )
  }
}, { deep: true }) // deep watch for array/object changes

// Watch for changes in the main telemetry (from Pinia) to update the *central* MET if needed
// This component's timerClockDisplay is its own internal countdown/up.
// But props.telemetry.simulationTime is the global one. We can choose which to display centrally.
// For now, the central MET in *this* component is `timerClockDisplay`.
// The props.telemetry.missionName and vehicleName are used below the SVG.
</script>

<template>
  <div class="spacex-circle-timeline-replacer font-din-condensed text-white p-2 bg-[#111] flex flex-col h-full w-full select-none items-center justify-center">
    <!-- Controls (Simplified for this example) -->
    <div class="controls-area text-xs mb-3 flex items-end space-x-3">
      <div>
        <label for="launchTime" class="mb-1 block">Launch At (M:SS from now):</label>
        <input
          id="launchTime" v-model="userLaunchTimeInput" type="text" :disabled="isCountdownActive"
          class="p-1 text-center border border-gray-600 rounded bg-[#333] w-20"
        >
      </div>
      <div>
        <label for="missionDur" class="mb-1 block">Circle Represents (M:SS):</label>
        <input
          id="missionDur" v-model="userMissionTimeInput" type="text" :disabled="isCountdownActive"
          class="p-1 text-center border border-gray-600 rounded bg-[#333] w-20"
        >
      </div>
      <button
        class="text-sm px-3 py-1.5 rounded"
        :class="isCountdownActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
        @click="handleStartStopClick"
      >
        {{ isCountdownActive ? 'Stop Sim' : 'Start Sim' }}
      </button>
    </div>

    <!-- SVG Container for the Timeline -->
    <!-- Styles mimic React code's .timeline_wrapper and .canvas_wrapper combined -->
    <div
      class="timeline-display-area max-w-[600px] w-[calc(100vw-40px)] aspect-square relative"
    >
      <!-- The React #svg_wrapper had no explicit size, it contained the 1200x1200 SVG -->
      <!-- #mySvg was positioned top: 50px, left: 0 within it -->
      <!-- This effectively means the 1200x1200 SVG's top edge was 50px from #svg_wrapper's top -->
      <!-- To center a 1200x1200 SVG in a smaller viewport and rotate: tricky. -->
      <!-- Simpler: make the SVG responsive and let viewBox handle scaling. -->
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
        preserveAspectRatio="xMidYMid meet"
        class="h-full w-full transition-transform duration-75 left-0 top-0 absolute"
        style="transform: rotate(180deg);"
      >
        <!-- SVG content is dynamically generated by plotNodesOnCircle -->
      </svg>

      <!-- Central Countdown/Countup (like React's .timer_clock) -->
      <div
        class="text-3xl text-white font-bold absolute md:text-4xl"
        style="
          bottom: 10%; /* Adjust as per visual preference */
          left: 50%;
          transform: translateX(-50%);
          z-index: 10; /* Ensure it's above the SVG if SVG has fill */
        "
      >
        {{ timerClockDisplay }}
      </div>
    </div>

    <!-- Mission Info (below the SVG circle area) -->
    <div class="mt-3 text-center relative z-10">
      <h1 class="text-lg font-bold tracking-wider uppercase md:text-xl">
        {{ props.telemetry.missionName || 'MISSION NAME' }}
      </h1>
      <p class="text-xs text-gray-400 uppercase md:text-sm">
        {{ props.telemetry.vehicleName || 'VEHICLE' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.font-din-condensed {
  font-family: 'D-DIN Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif;
}
input[type='text'] {
  color: #fff;
}
/* Add any specific styles needed to closely match the React version's appearance */
/* The React CSS uses a lot of absolute positioning for .nodes li within #circle_wrapper */
/* Our dynamic SVG approach bypasses that HTML structure for the nodes. */

/* Styling for the "timeline-display-area" to clip and show part of the SVG */
.timeline-display-area {
  /* Based on React's .timeline_wrapper height and padding */
  /* height: 200px; */ /* This was in React, but seems too small for 1200px SVG */
  /* padding: 50px 0; */
  overflow: hidden; /* This is key to showing only part of the circle */
  background-color: #111; /* Match React bg */
  /* box-shadow and clip-path from React for full-bleed background effect */
  box-shadow: 0 0 0 100vmax #111;
  clip-path: inset(0 -100vmax);
}
</style>
