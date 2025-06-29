// server/api/obs/config.post.ts
import type { OBSConfig } from '~~/server/utils/obsState'
import { updateOBSState } from '~~/server/utils/obsState'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<OBSConfig>(event)

    // 在这里添加数据校验逻辑
    if (
      !body.missionName // 新增校验
      || !body.vehicle // 新增校验
      || !body.launchTime
      || !body.timeZone
      || body.events === undefined
    ) {
      throw new Error('Invalid OBS config data received. Missing required fields.')
    }

    // 更新状态并触发广播
    updateOBSState(body)

    return { success: true, message: 'OBS config updated and broadcasted.' }
  }
  catch (error: any) {
    console.error('Error updating OBS config:', error)
    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: ${error.message}`,
    })
  }
})
