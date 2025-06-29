<script setup lang="ts">
const props = defineProps<{
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  svgWidth?: number
  svgHeight?: number
  pastNodeDensityFactor?: number
  futureNodeDensityFactor?: number
}>()

const svgEl = useTemplateRef<SVGSVGElement>('svgEl')

const effectiveSvgWidth = computed(() => props.svgWidth || 3600)
const effectiveSvgHeight = computed(() => props.svgHeight || 200)

const exposedArcAngleDeg = 64
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)
const circleRadius = computed(() => effectiveSvgWidth.value / 2)
const distCenterToChord = computed(() => circleRadius.value * Math.cos(exposedArcAngleRad / 2))
const circleCenterY = computed(() => effectiveSvgHeight.value + distCenterToChord.value)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)

function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

function plotNodesOnCircle() {
  const svg = svgEl.value
  if (!svg)
    return

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  const currentTimelineTime = props.currentTimeOffset ?? 0

  svg.innerHTML = ''

  const mainArcRadius = currentCircleRadius
  const angleSpan = Math.PI / 2
  const startAngle = -Math.PI / 2 - angleSpan / 2
  const endAngle = -Math.PI / 2 + angleSpan / 2
  const arcDrawingFlags = '0 0 1'

  const innerArcOffsetFromMain = 45
  const outerArcOffsetFromMain = 45
  const innerArcFillColor = 'rgba(0, 0, 0, 0.7)'
  const innerArcStrokeColor = '#808080'
  const innerArcStrokeWidth = '2'
  const outerArcFillColor = 'rgba(0, 0, 0, 0.3)'

  // 1. Outer Decorative Arc
  const outerDecoArcRadius = currentCircleRadius + outerArcOffsetFromMain
  if (outerDecoArcRadius > 0) {
    const x1_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(startAngle)
    const y1_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(startAngle)
    const x2_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(endAngle)
    const y2_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(endAngle)
    const outerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    outerArcPath.setAttribute('d', `M ${x1_outer} ${y1_outer} A ${outerDecoArcRadius} ${outerDecoArcRadius} ${arcDrawingFlags} ${x2_outer} ${y2_outer} Z`)
    outerArcPath.setAttribute('fill', outerArcFillColor)
    outerArcPath.setAttribute('stroke', 'none')
    svg.appendChild(outerArcPath)
  }

  // 2. Inner Decorative Arc
  const innerDecoArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (innerDecoArcRadius > 0) {
    const x1_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(startAngle)
    const y1_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(startAngle)
    const x2_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(endAngle)
    const y2_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(endAngle)
    const innerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcPath.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner} Z`)
    innerArcPath.setAttribute('fill', innerArcFillColor)
    innerArcPath.setAttribute('stroke', innerArcStrokeColor)
    innerArcPath.setAttribute('stroke-width', innerArcStrokeWidth)
    svg.appendChild(innerArcPath)
  }

  const x1_bg = currentCircleCenterX + mainArcRadius * Math.cos(startAngle)
  const y1_bg = currentCircleCenterY + mainArcRadius * Math.sin(startAngle)
  const x2_bg = currentCircleCenterX + mainArcRadius * Math.cos(endAngle)
  const y2_bg = currentCircleCenterY + mainArcRadius * Math.sin(endAngle)

  const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  bgArc.setAttribute('d', `M ${x1_bg} ${y1_bg} A ${mainArcRadius} ${mainArcRadius} 0 0 1 ${x2_bg} ${y2_bg}`)
  bgArc.setAttribute('stroke', '#aaaaaa')
  bgArc.setAttribute('stroke-width', '2')
  bgArc.setAttribute('fill', 'none')
  svg.appendChild(bgArc)

  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 3))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 3))
  markerLine.setAttribute('stroke', '#FFF')
  markerLine.setAttribute('stroke-width', '2')
  svg.appendChild(markerLine)

  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2
  const nodeDotRadius = 6.5
  const nodeOuterRadius = 6.5
  const nodeInnerDotRadiusSmall = 3
  const textOffsetFromNodeEdge = 18
  const lineToTextGap = 7

  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 1.0)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 1.0)
  const animationStartTime = -8
  const animationDuration = 7
  const animationEndTime = animationStartTime + animationDuration

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `事件 ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

    let applicableDensityFactor: number
    if (currentTimelineTime < animationStartTime) {
      applicableDensityFactor = safePastDensityFactor
    }
    else if (currentTimelineTime >= animationStartTime && currentTimelineTime <= animationEndTime) {
      const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration
      const easedProgress = easeInOutSine(linearProgress)
      applicableDensityFactor = safePastDensityFactor * (1 - easedProgress) + safeFutureDensityFactor * easedProgress
    }
    else {
      applicableDensityFactor = safeFutureDensityFactor
    }

    const angularOffsetBase = (timeRelativeToNow / halfMissionDuration) * Math.PI
    const angularOffset = angularOffsetBase / applicableDensityFactor
    const angleRad = angularOffset - (Math.PI / 2)

    const nodeCenterX = currentCircleCenterX + mainArcRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + mainArcRadius * Math.sin(angleRad)

    if (!(nodeCenterY >= -nodeOuterRadius && nodeCenterY <= effectiveSvgHeight.value + nodeOuterRadius))
      continue

    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeOuterRadius))
    nodeOuterCircle.setAttribute('fill', '#000')
    nodeOuterCircle.setAttribute('stroke', '#FFF')
    nodeOuterCircle.setAttribute('stroke-width', '1.8')
    svg.appendChild(nodeOuterCircle)

    if (timeRelativeToNow <= 0) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(nodeInnerDotRadiusSmall))
      innerDotPast.setAttribute('fill', '#FFF')
      svg.appendChild(innerDotPast)
    }

    const isOutsideText = i % 2 === 0
    const textDirectionMultiplier = isOutsideText ? 1 : -1
    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad)
    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
    if (lineLength < 1)
      continue

    const lineEndX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.cos(angleRad)
    const lineEndY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.sin(angleRad)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(lineStartX)); line.setAttribute('y1', String(lineStartY))
    line.setAttribute('x2', String(lineEndX)); line.setAttribute('y2', String(lineEndY))
    line.setAttribute('stroke', '#ccc'); line.setAttribute('stroke-width', '2')
    svg.appendChild(line)

    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.setAttribute('x', String(textCenterX)); textElement.setAttribute('y', String(textCenterY))
    const textRotationDeg = angleRad * (180 / Math.PI) + 90
    textElement.setAttribute('transform', `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`)
    textElement.setAttribute('text-anchor', 'middle')
    textElement.setAttribute('dominant-baseline', isOutsideText ? 'text-after-edge' : 'text-before-edge')
    textElement.setAttribute('fill', '#fff'); textElement.setAttribute('font-size', '10px')
    textElement.setAttribute('font-family', 'Saira'); textElement.setAttribute('font-weight', '500')

    const words = eventName.split(' '); const numLines = words.length; const lineHeightEm = 1.2
    if (numLines > 0) {
      words.forEach((word, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspan.setAttribute('x', String(textCenterX)); tspan.textContent = word
        if (index === 0)
          tspan.setAttribute('dy', `${-((numLines - 1) / 2) * lineHeightEm}em`)
        else tspan.setAttribute('dy', `${lineHeightEm}em`)
        textElement.appendChild(tspan)
      })
    }
    svg.appendChild(textElement)
  }
}

onMounted(plotNodesOnCircle)
watch(
  () => [props.timestamps, props.nodeNames, props.missionDuration, props.currentTimeOffset, effectiveSvgWidth.value, effectiveSvgHeight.value, props.pastNodeDensityFactor, props.futureNodeDensityFactor],
  plotNodesOnCircle,
  { deep: true },
)
</script>

<template>
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <!-- eslint-disable-next-line vue/html-self-closing -->
    <svg ref="svgEl" class="w-full" :width="effectiveSvgWidth" :height="effectiveSvgHeight"></svg>
  </div>
</template>
