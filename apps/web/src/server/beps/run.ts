/**
 * รอบคำนวณที่กำลังดูอยู่
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็นอ่าน allocation_run แถวล่าสุดที่ APPROVED
 * จาก apps/api โดยหน้าจอไม่ต้องแก้ (SA.md §11.2 — dashboard อ่านจาก run ที่อนุมัติแล้ว
 * เท่านั้น ไม่คำนวณสดตอนเปิดหน้า)
 */
import type { BepsRun } from '@/contexts/BepsContext'
import { RUN_FLOW, RUN_LOG, RUN_STATE, RUNS } from '@/data/fixtures/master-data'

export type RunSummary = {
  current: BepsRun
  availableYears: number[]
}

export const getCurrentRun = (): RunSummary => {
  const approved = RUNS.filter(r => r.state === 'APPROVED')
  const latest = approved[0] ?? RUNS[0]

  return {
    current: {
      id: latest.id,
      year: latest.year,
      calcAt: latest.at,
      state: latest.state as BepsRun['state'],
      basis: latest.basis,
      ruleVer: latest.rule
    },
    availableYears: [...new Set(RUNS.map(r => r.year))].sort((a, b) => b - a)
  }
}

export type RunState = keyof typeof RUN_STATE

export type AllocationRun = {
  id: number
  year: number
  /** ฐานจำนวนเงิน — ACTUAL | BUDGET */
  basis: string
  /** เวอร์ชันกติกาผังบัญชีที่ล็อกไว้กับ run */
  ruleVersion: string
  scope: string
  state: RunState
  stateLabel: string
  /** ผู้สั่งคำนวณ */
  requestedBy: string
  requestedAt: string
  /** ผู้อนุมัติ — null = ยังไม่อนุมัติ */
  approvedBy: string | null
  /** เวลาที่ใช้คำนวณ */
  duration: string
  /** ต้นทุนรวมที่ปันส่วนในรอบนี้ */
  tc: number
  /** ส่วนต่างตรวจยอดกลับต้นทาง (บาท) — 0 = ผ่าน */
  diff: number
  /** จำนวนรายการค้างตรวจที่พบในรอบนี้ */
  exceptionCount: number
}

/** ลำดับสถานะของรอบคำนวณ — DRAFT → RUNNING → CALCULATED → VALIDATED → APPROVED */
export const getRunFlow = (): { state: RunState; label: string }[] =>
  RUN_FLOW.map(state => ({ state: state as RunState, label: RUN_STATE[state as RunState].l }))

export const getRuns = (): AllocationRun[] =>
  RUNS.map(r => ({
    id: r.id,
    year: r.year,
    basis: r.basis,
    ruleVersion: r.rule,
    scope: r.scope,
    state: r.state as RunState,
    stateLabel: RUN_STATE[r.state as RunState].l,
    requestedBy: r.by,
    requestedAt: r.at,
    approvedBy: r.appr,
    duration: r.dur,
    tc: r.tc,
    diff: r.diff,
    exceptionCount: r.exc
  }))

export type RunLogEntry = {
  at: string
  /** คลาสไอคอน Remix ที่แทน emoji ของ mockup */
  icon: string
  tone: 'ok' | 'info' | 'warn' | 'error'
  text: string
}

/* mockup เก็บข้อความพร้อมแท็ก <b> ไว้ในสตริง — ที่นี่ถอดแท็กออกตั้งแต่ชั้นข้อมูล
   ไม่ส่ง HTML ดิบเข้าไปให้หน้าจอ render (จะต้องใช้ dangerouslySetInnerHTML โดยไม่จำเป็น) */
const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '')

/** emoji ของ mockup → ไอคอน Remix + โทนสี */
const LOG_ICON: Record<string, { icon: string; tone: RunLogEntry['tone'] }> = {
  '✅': { icon: 'ri-check-line', tone: 'ok' },
  '🧾': { icon: 'ri-file-list-3-line', tone: 'info' },
  '⚙️': { icon: 'ri-settings-3-line', tone: 'info' },
  '🚩': { icon: 'ri-flag-line', tone: 'warn' },
  '▶️': { icon: 'ri-play-line', tone: 'info' }
}

export const getRunLog = (): RunLogEntry[] =>
  RUN_LOG.map(entry => ({
    at: entry.t,
    icon: LOG_ICON[entry.ic]?.icon ?? 'ri-circle-line',
    tone: LOG_ICON[entry.ic]?.tone ?? 'info',
    text: stripTags(entry.h)
  }))
