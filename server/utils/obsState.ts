// server/utils/obsState.ts
import type { H3Event } from 'h3'

// 类型已在 'types/launchdeck.d.ts' 中全局定义，此处无需再定义

// 默认状态中加入 timelineConfig
const defaultState: OBSConfig = {
  missionName: 'Starlink Mission (OBS)',
  vehicle: 'Falcon 9',
  launchTime: new Date().toISOString(),
  timeZone: 'Asia/Shanghai',
  msOffset: 0,
  events: [
    { time: -10, name: 'STARTUP' },
    { time: 0, name: 'LIFTOFF' },
    { time: 145, name: 'MECO' },
  ],
  timelineConfig: {
    missionDuration: 3600,
    pastNodeDensityFactor: 3,
    futureNodeDensityFactor: 1,
  },
}

// 在内存中存储当前状态 (单例)
let currentState: OBSConfig = { ...defaultState }

// 存储所有活跃的 SSE 连接
const sseConnections = new Set<H3Event>()

/**
 * 更新 OBS 配置状态
 * @param newState 新的配置
 */
export function updateOBSState(newState: OBSConfig) {
  currentState = newState
  broadcastState()
}

/**
 * 获取当前的 OBS 配置
 * @returns 当前配置
 */
export function getOBSState(): OBSConfig {
  return currentState
}

/**
 * 向所有连接的客户端发送当前状态
 */
export function broadcastState() {
  const dataString = `data: ${JSON.stringify(currentState)}\n\n`
  for (const event of sseConnections) {
    try {
      event.node.res.write(dataString)
    }
    catch (e) {
      console.error('Failed to write to a closed SSE connection. Removing it.', e)
      sseConnections.delete(event)
    }
  }
}

/**
 * 添加一个新的 SSE 连接
 * @param event H3 事件对象
 */
export function addSSEConnection(event: H3Event) {
  sseConnections.add(event)

  // 当连接关闭时，从集合中移除
  event.node.res.on('close', () => {
    sseConnections.delete(event)
  })
}