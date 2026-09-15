/**
 * การจัดสถานะของหน่วยวิเคราะห์หนึ่งหน่วย — ย้ายมาจาก status() ที่ mockup/assets/core.js:34
 *
 * เป็นการ **ตีความ** ผลที่ calc-engine คำนวณมาแล้ว ไม่ใช่สูตรใหม่ จึงไม่ขัดกับข้อห้าม
 * "ห้ามมีสูตรสองชุด" — แต่ต้องอยู่ที่เดียวเพราะ W1, W2, W3, W5 และ W7 ใช้เกณฑ์เดียวกัน
 * ในการระบายสี ถ้าแยกกันเขียนจะเพี้ยนกันเอง
 */
import type { BreakEvenResult } from '@beps/calc-engine'

export type BreakEvenStatus =
  /** จำนวนนิสิตถึงจุดคุ้มทุนแล้ว */
  | 'ok'
  /** ยังไม่ถึงจุดคุ้มทุน แต่ยังมี CM เป็นบวก — เพิ่มนิสิตแล้วคุ้มได้ */
  | 'below'
  /** R ≤ AVC — เพิ่มนิสิตเท่าไรก็ไม่คุ้ม ต้องแก้ที่โครงสร้างต้นทุนหรืออัตราค่าธรรมเนียม */
  | 'no_breakeven'

export const breakEvenStatus = (result: BreakEvenResult): BreakEvenStatus => {
  if (result.qStarStatus === 'full_cost_recovery') return 'no_breakeven'

  if (result.qStar === null) return 'below'

  return result.q >= result.qStar ? 'ok' : 'below'
}

export const statusLabel: Record<BreakEvenStatus, string> = {
  ok: 'คุ้มทุน',
  below: 'ต่ำกว่าจุดคุ้มทุน',
  no_breakeven: 'ไม่มีจุดคุ้มทุน (R ≤ AVC)'
}

/** สีของ palette ที่ใช้แทนสถานะ — ให้ทุกหน้าใช้ชุดเดียวกัน */
export const statusColor: Record<BreakEvenStatus, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  below: 'warning',
  no_breakeven: 'error'
}
