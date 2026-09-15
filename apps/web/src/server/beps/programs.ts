/**
 * ตัวเลขระดับหลักสูตร — ชั้นเดียวที่หน้าจอหลักสูตรเรียก
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 * สูตรทั้งหมดมาจาก @beps/calc-engine เท่านั้น (ดูเหตุผลใน university.ts)
 */
import { calcBreakEven, calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'
import type { RevenueMode } from '@beps/calc-engine'

import { RAW } from '@/data/fixtures/raw'
import { breakEvenStatus } from './status'

/** หลักสูตรที่ต้องใช้สูตร 7 (Full-Cost Recovery) เพราะ CM ≤ 0 */
export type FullCostRecoveryExample = {
  faculty: string
  /** ชื่อเต็มพร้อมระดับปริญญา เช่น "วท.ม. เคมี" */
  degree: string
  q: number
  /** ต้นทุนรวม */
  tc: number
  /** รายได้ต่อหัว */
  r: number
  /** จำนวนนิสิตขั้นต่ำเพื่อให้ครอบคลุมต้นทุนทั้งหมด */
  qStar: number
}

/**
 * ตัวอย่างหลักสูตรที่ AVC สูงกว่า R — ใช้ประกอบคำอธิบายสูตร 7 ใน W10
 *
 * เลือก **แถวที่ต้นทุนรวมสูงที่สุด** ในบรรดาหลักสูตรที่เข้าเงื่อนไข เพื่อให้ได้ตัวอย่าง
 * เดิมทุกครั้งที่เปิดหน้า (กฎตายตัว ไม่สุ่ม) และเป็นแถวที่เห็นผลกระทบชัดที่สุด
 * mockup ฝังตัวอย่างไว้ตายตัวใน HTML ที่นี่คำนวณจากชุดข้อมูลที่โหลดอยู่จริง —
 * พอสลับไปใช้ข้อมูลจริง ตัวอย่างจะเปลี่ยนตามเองโดยไม่ต้องแก้หน้าจอ
 */
export const getFullCostRecoveryExample = (
  revenueMode: RevenueMode = 'with_government'
): FullCostRecoveryExample | null => {
  const candidates = RAW.PROGS.map(p => ({
    program: p,
    result: calcBreakEven(
      { q: p.Q, governmentBudget: p.st, incomeBudget: p.own, tfc: p.TFC, tvc: p.TVC, revenueMode },
      DEFAULT_POLICY
    )
  }))
    .filter(({ result }) => result.qStarStatus === 'full_cost_recovery' && result.qStar !== null && result.r !== null)
    .sort((a, b) => b.result.tc - a.result.tc)

  const best = candidates[0]

  if (!best) return null

  return {
    faculty: best.program.fac,
    degree: best.program.deg,
    q: best.result.q,
    tc: best.result.tc,
    r: best.result.r as number,
    qStar: best.result.qStar as number
  }
}

/** จำนวนหลักสูตรแยกตามสถานะจุดคุ้มทุน — ใช้ในบทสรุปของ W1 และ W5 */
export type ProgramStatusCounts = {
  total: number
  ok: number
  below: number
  noBreakEven: number
}

export const getProgramStatusCounts = (): Record<RevenueMode, ProgramStatusCounts> => {
  const empty = (): ProgramStatusCounts => ({ total: RAW.PROGS.length, ok: 0, below: 0, noBreakEven: 0 })

  const counts: Record<RevenueMode, ProgramStatusCounts> = {
    with_government: empty(),
    without_government: empty()
  }

  for (const p of RAW.PROGS) {
    const byMode = calcBreakEvenBothModes(
      { q: p.Q, governmentBudget: p.st, incomeBudget: p.own, tfc: p.TFC, tvc: p.TVC },
      DEFAULT_POLICY
    )

    for (const mode of ['with_government', 'without_government'] as const) {
      const status = breakEvenStatus(byMode[mode])

      if (status === 'ok') counts[mode].ok += 1
      else if (status === 'below') counts[mode].below += 1
      else counts[mode].noBreakEven += 1
    }
  }

  return counts
}
