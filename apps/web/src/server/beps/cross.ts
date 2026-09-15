/**
 * ตัวชี้วัดข้ามมิติระดับคณะ (W5 Cross Analysis)
 *
 * รวม 9 ตัวชี้วัดของแต่ละคณะไว้ที่เดียว แล้วให้หน้าจอเอาไปทำ heatmap · scatter ·
 * quadrant · ตารางจัดอันดับ — ทุกตัวมาจากผลของ @beps/calc-engine ไม่มีสูตรใหม่
 *
 * **Q* ระดับคณะที่ใช้ที่นี่คำนวณจากยอดรวมของคณะ (pooled)** ตรงกับค่าที่ prototype v8-1
 * เก็บไว้ใน RAW.FACS (ยืนยันด้วย raw.parity.test.ts) — ต่างจากวิธี sum_of_programs
 * ที่เป็นค่าหลักตาม DEFAULT_POLICY ระดับที่สูงกว่าหลักสูตร ดูส่วนต่างของสองวิธีได้ที่ W15
 */
import { calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'
import type { RevenueMode } from '@beps/calc-engine'

import { RAW } from '@/data/fixtures/raw'
import { shortOrgName } from '@/utils/beps-format'
import { breakEvenStatus } from './status'

export type CrossMetrics = {
  name: string
  shortName: string
  q: number
  /** จุดคุ้มทุน — 0 = ไม่มี (CM ≤ 0) */
  qStar: number
  /** true = มีจุดคุ้มทุนจริง (CM > 0) — คณะที่ CM ≤ 0 ถูกกันออกจากกราฟ แต่ยังอยู่ในตาราง */
  hasBreakEven: boolean
  /** Q ÷ Q* เป็นร้อยละ */
  utilization: number
  /** กำไรเป็นร้อยละของต้นทุนรวม (profit_pct_basis = TC) */
  profitPct: number
  r: number
  avc: number
  atc: number
  cm: number
  /** รายได้รวม (ล้านบาท) */
  trMillions: number
  /** ส่วนเกิน/ขาดทุน (ล้านบาท) */
  profitMillions: number
  /** AVC ต่อ R เป็นร้อยละ — ยิ่งต่ำยิ่งดี · 999 = คำนวณไม่ได้ */
  avcToRevenue: number
  /** TFC ต่อ TC เป็นร้อยละ */
  fixedShare: number
  programCount: number
  /** จำนวนหลักสูตรในคณะที่ถึงจุดคุ้มทุนแล้ว */
  programsBreakingEven: number
  programsBreakingEvenPct: number
  /** true = จำนวนนิสิตถึงจุดคุ้มทุนแล้ว */
  isOk: boolean
}

export const getCrossMetrics = (revenueMode: RevenueMode): CrossMetrics[] =>
  RAW.FACS.map(f => {
    const result = calcBreakEven(
      { q: f.Q, governmentBudget: f.st, incomeBudget: f.own, tfc: f.TFC, tvc: f.TVC, revenueMode },
      DEFAULT_POLICY
    )

    const r = result.r ?? 0
    const avc = result.avc ?? 0
    const cm = result.cm ?? 0
    const hasBreakEven = cm > 0 && result.qStar !== null && result.qStar > 0
    const qStar = hasBreakEven ? (result.qStar as number) : 0

    const programs = RAW.PROGS.filter(p => p.fac === f.name)

    const programsBreakingEven = programs.filter(p => {
      const programResult = calcBreakEven(
        { q: p.Q, governmentBudget: p.st, incomeBudget: p.own, tfc: p.TFC, tvc: p.TVC, revenueMode },
        DEFAULT_POLICY
      )

      return breakEvenStatus(programResult) === 'ok'
    }).length

    return {
      name: f.name,
      shortName: shortOrgName(f.name),
      q: result.q,
      qStar,
      hasBreakEven,
      utilization: hasBreakEven ? Math.round((result.q / qStar) * 100) : 0,
      profitPct: Number((result.profitPct ?? 0).toFixed(1)),
      r: Math.round(r),
      avc: Math.round(avc),
      atc: Math.round(result.atc ?? 0),
      cm: Math.round(cm),
      trMillions: result.tr / 1e6,
      profitMillions: result.profit / 1e6,
      avcToRevenue: r > 0 ? Number(((avc / r) * 100).toFixed(1)) : 999,
      fixedShare: result.tc > 0 ? Number(((result.tfc / result.tc) * 100).toFixed(1)) : 0,
      programCount: programs.length,
      programsBreakingEven,
      programsBreakingEvenPct: programs.length ? Math.round((programsBreakingEven / programs.length) * 100) : 0,
      isOk: hasBreakEven ? result.q >= qStar : false
    }
  })

/** ผลทั้ง 2 ฐานรายได้ — หน้าจอสลับได้โดยไม่ต้องขอข้อมูลใหม่ */
export const getCrossMetricsByMode = (): Record<RevenueMode, CrossMetrics[]> => ({
  with_government: getCrossMetrics('with_government'),
  without_government: getCrossMetrics('without_government')
})
