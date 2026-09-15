// Type Imports
import type { CrossMetrics } from '@/server/beps/cross'

/**
 * นิยาม 9 ตัวชี้วัดที่ heatmap ของ W5 แสดง — ย้ายจาก HM ใน mockup/assets/page-cross.js
 *
 * `better` บอกว่าค่าสูงหรือต่ำถึงจะดี ซึ่งเป็นตัวกำหนดทิศของสีใน heatmap
 * (AVC และ AVC/R ยิ่งต่ำยิ่งดี — ถ้าไล่สีทิศเดียวกับตัวอื่นจะอ่านผิดทั้งคอลัมน์)
 */
export type HeatmapMetric = {
  key: keyof CrossMetrics
  label: string
  unit: string
  better: 'high' | 'low'
  format: (value: number) => string
}

const thaiInt = (value: number) => Math.round(value).toLocaleString('th-TH')
const thaiDec = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const HEATMAP_METRICS: HeatmapMetric[] = [
  { key: 'utilization', label: 'Utilization', unit: 'Q/Q* %', better: 'high', format: v => (v > 0 ? `${v}%` : '—') },
  { key: 'profitPct', label: 'กำไร %', unit: 'Profit', better: 'high', format: v => `${v >= 0 ? '+' : ''}${v}%` },
  { key: 'programsBreakingEvenPct', label: 'หลักสูตรคุ้ม', unit: '%', better: 'high', format: v => `${v}%` },
  { key: 'cm', label: 'CM/หัว', unit: 'บาท', better: 'high', format: thaiInt },
  { key: 'r', label: 'R/หัว', unit: 'บาท', better: 'high', format: thaiInt },
  { key: 'avc', label: 'AVC/หัว', unit: 'บาท', better: 'low', format: thaiInt },
  { key: 'avcToRevenue', label: 'AVC/R', unit: '%', better: 'low', format: v => (v >= 999 ? '—' : `${v}%`) },
  { key: 'fixedShare', label: 'TFC/TC', unit: '%', better: 'low', format: v => `${v}%` },
  {
    key: 'profitMillions',
    label: 'ส่วนเกิน',
    unit: 'ลบ.',
    better: 'high',
    format: v => `${v >= 0 ? '+' : '−'}${thaiDec(Math.abs(v))}`
  },
  { key: 'q', label: 'Q จริง', unit: 'คน', better: 'high', format: thaiInt }
]

/**
 * สีพื้นของเซลล์ heatmap — ไล่จากแดงอ่อน → เหลือง → เขียวอ่อน ตามอันดับในคอลัมน์
 *
 * ใช้ค่าต่ำสุด/สูงสุดของคอลัมน์เป็นกรอบ (min-max normalize) เหมือน mockup ไม่ใช่ค่าคงที่
 * จึงอ่านได้เสมอไม่ว่าชุดข้อมูลจะมีสเกลเท่าไร · คอลัมน์ที่ค่าทุกแถวเท่ากันจะเป็นสีกลาง
 */
export const heatmapColor = (value: number, metric: HeatmapMetric, column: number[]): string => {
  const min = Math.min(...column)
  const max = Math.max(...column)

  if (max === min) return 'rgb(241, 245, 249)'

  const normalized = (value - min) / (max - min)
  const score = metric.better === 'high' ? normalized : 1 - normalized

  /* ไล่สี 4 ช่วงตามที่ mockup ใช้ — คุมความอิ่มตัวไว้ให้ตัวหนังสือสีเข้มอ่านออกทุกเซลล์ */
  if (score < 0.25) {
    const t = score / 0.25

    return `rgb(252, ${Math.round(205 + 15 * t)}, ${Math.round(210 - 24 * t)})`
  }

  if (score < 0.5) {
    const t = (score - 0.25) / 0.25

    return `rgb(255, ${Math.round(220 + 23 * t)}, ${Math.round(186 + 5 * t)})`
  }

  if (score < 0.75) {
    const t = (score - 0.5) / 0.25

    return `rgb(${Math.round(255 - 46 * t)}, ${Math.round(243 - 7 * t)}, ${Math.round(191 + 22 * t)})`
  }

  const t = (score - 0.75) / 0.25

  return `rgb(${Math.round(209 - 21 * t)}, ${Math.round(236 - 4 * t)}, ${Math.round(213 + 6 * t)})`
}
