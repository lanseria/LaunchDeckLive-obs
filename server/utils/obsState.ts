// server/utils/obsState.ts
import type { H3Event } from 'h3'

// 定义 OBS 配置的数据结构
export interface OBSConfig {
  missionName: string // 新增
  vehicle: string // 新增
  launchTime: string
  timeZone: string
  msOffset: number
  events: { time: number, name: string }[]
}

// 默认状态
const defaultState: OBSConfig = {
  missionName: 'Starlink Mission (OBS)', // 新增
  vehicle: 'Falcon 9', // 新增
  launchTime: new Date().toISOString(),
  timeZone: 'Asia/Shanghai',
  msOffset: 0,
  events: [
    { time: -10, name: 'STARTUP' },
    { time: 0, name: 'LIFTOFF' },
    { time: 145, name: 'MECO' },
  ],
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
  // 向所有连接的客户端广播新状态
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
  console.log(`[SSE] New connection. Total: ${sseConnections.size}`)

  // 当连接关闭时，从集合中移除
  event.node.res.on('close', () => {
    sseConnections.delete(event)
    console.log(`[SSE] Connection closed. Total: ${sseConnections.size}`)
  })
}
