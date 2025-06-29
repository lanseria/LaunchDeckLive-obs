// server/api/obs/events.get.ts
import { addSSEConnection, getOBSState } from '~~/server/utils/obsState'

export default defineEventHandler((event) => {
  // 设置 SSE 必需的头部
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // 将当前连接添加到广播列表
  addSSEConnection(event)

  // 立即发送一次当前状态
  const currentState = getOBSState()
  event.node.res.write(`data: ${JSON.stringify(currentState)}\n\n`)

  // defineEventHandler 会保持连接开放，除非手动关闭
  // 当连接关闭时，obsState.ts 中的 'close' 事件监听器会自动处理清理工作
})
