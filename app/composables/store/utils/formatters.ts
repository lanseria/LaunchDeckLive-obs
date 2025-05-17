export function formatMET(seconds: number): string {
  const isNegative = seconds < 0
  const absSeconds = Math.abs(seconds)

  const h = Math.floor(absSeconds / 3600)
  const m = Math.floor((absSeconds % 3600) / 60)
  const s = Math.floor(absSeconds % 60)

  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')

  const sign = isNegative ? '-' : '+'

  // 如果不需要显示小时位当小时为0时：
  // if (h === 0) {
  //   return `T${sign}${mm}:${ss}`;
  // }
  return `T${sign}${hh}:${mm}:${ss}`
}
