/**
 * ทะเบียนหลักสูตร (W16) — ตาราง `program` + `program_version`
 *
 * หลักการที่หน้านี้บังคับ: **ปรับปรุงหลักสูตร = สร้างรุ่นใหม่ ไม่ใช่แก้ทับของเดิม**
 * ทุกตารางในระบบอ้าง `program_version_id` ไม่ใช่ `program_id` ถ้าแก้ทับ
 * ตัวเลขจุดคุ้มทุนของปีเก่าจะเปลี่ยนตามไปด้วยโดยไม่มีใครรู้
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

import { FEES, PROG_FLOW, PROG_STATE, PROGRAM_LOG, PROGRAM_REG } from '@/data/fixtures/master-data'
import { RAW } from '@/data/fixtures/raw'
import { fmtInt } from '@/utils/beps-format'

export type ProgramState = keyof typeof PROG_STATE

export type ProgramVersion = {
  version: string
  from: string
  to: string | null
  note: string
  /** true = ร่างที่ยังไม่มีผล */
  isDraft: boolean
}

export type ReadinessCheck = {
  passed: boolean
  label: string
  detail: string
  /** เส้นทางที่ไปแก้เรื่องนี้ — null = แก้ในหน้านี้เอง */
  href: string | null
}

export type ProgramRegistryEntry = {
  code: string
  name: string
  faculty: string
  level: string
  degree: string
  isInternational: boolean
  state: ProgramState
  stateLabel: string
  /** true = สถานะนี้เข้าสู่การคำนวณจุดคุ้มทุน */
  includedInCalculation: boolean
  /** เหตุผลว่าทำไมสถานะนี้ถึงเข้า/ไม่เข้าการคำนวณ */
  stateReason: string
  versions: ProgramVersion[]
  /** จำนวนรับที่ประมาณการไว้ในข้อเสนอ — มีเฉพาะหลักสูตรที่ยังไม่เปิดสอน */
  proposedQ: number | null
  /** ผลจริงจากรอบคำนวณ — null = ยังไม่มีข้อมูลจริง (ยังไม่เปิดสอน) */
  actual: { q: number; byMode: Record<RevenueMode, BreakEvenResult> } | null
  readiness: ReadinessCheck[]
}

/** รุ่นที่มีผลอยู่จริง (ไม่ใช่ร่าง) — ใช้รุ่นล่าสุดที่ไม่ใช่ร่าง */
const liveVersion = (versions: ProgramVersion[]): ProgramVersion =>
  [...versions].reverse().find(v => !v.isDraft) ?? versions[0]

export const getProgramRegistry = (): ProgramRegistryEntry[] =>
  PROGRAM_REG.map(p => {
    const state = p.state as ProgramState
    const stateDef = PROG_STATE[state]

    const versions: ProgramVersion[] = p.vers.map(v => ({
      version: v.v,
      from: v.from,
      to: v.to,
      note: v.note,
      isDraft: 'draft' in v && Boolean(v.draft)
    }))

    /* จับคู่กับข้อมูลจริงใน RAW.PROGS เพื่อดึง Q และผลคำนวณของหลักสูตรที่เปิดสอนอยู่
       (ทะเบียนกับชุดตัวเลขเป็นคนละแหล่ง — ระบบจริงจะจับคู่ด้วย program_version_id) */
    const raw = RAW.PROGS.find(x => x.prog === p.prog && x.fac === p.fac && x.lvl === p.lvl) ?? null

    const actual = raw
      ? {
          q: raw.Q,
          byMode: calcBreakEvenBothModes(
            { q: raw.Q, governmentBudget: raw.st, incomeBudget: raw.own, tfc: raw.TFC, tvc: raw.TVC },
            DEFAULT_POLICY
          )
        }
      : null

    const fee = FEES.find(f => f.prog === p.prog && f.lvl === p.lvl) ?? null
    const live = liveVersion(versions)
    const proposedQ = 'proposedQ' in p ? ((p as { proposedQ?: number }).proposedQ ?? null) : null

    const readiness: ReadinessCheck[] = [
      {
        passed: Boolean(p.code),
        label: 'มีรหัสหลักสูตรจากระบบทะเบียน',
        detail: `program_code = ${p.code}`,
        href: null
      },
      {
        passed: true,
        label: 'ผูกหน่วยงานระดับการศึกษาแล้ว',
        detail: `${p.fac} — ${p.lvl}`,
        href: '/admin/master-data'
      },
      {
        passed: Boolean(live),
        label: 'มีรุ่นหลักสูตรที่มีผล',
        detail: live ? `รุ่น ${live.version} · มีผล ${live.from}` : 'ยังไม่มีรุ่นที่มีผล',
        href: null
      },
      {
        passed: fee?.status === 'APPROVED',
        label: 'มีอัตราค่าธรรมเนียมที่อนุมัติแล้ว',
        detail: fee
          ? fee.status === 'APPROVED'
            ? `${fmtInt(fee.rate)} บาท/ปี`
            : `มีอยู่แต่ยังไม่อนุมัติ (${fee.status})`
          : 'ยังไม่มีรายการค่าธรรมเนียม',
        href: '/admin/tuition'
      },
      {
        passed: Boolean(actual && actual.q > 0),
        label: 'มีจำนวนนิสิตจากระบบทะเบียน',
        detail: actual
          ? actual.q > 0
            ? `${fmtInt(actual.q)} คน ณ วันตัดยอด`
            : 'Q = 0 — คำนวณ R และ AVC ไม่ได้'
          : 'ยังไม่มีนิสิตลงทะเบียน',
        href: '/admin/cost-data'
      }
    ]

    return {
      code: p.code,
      name: p.prog,
      faculty: p.fac,
      level: p.lvl,
      degree: p.deg,
      isInternational: p.intl,
      state,
      stateLabel: stateDef.l,
      includedInCalculation: stateDef.calc,
      stateReason: stateDef.why,
      versions,
      proposedQ,
      actual,
      readiness
    }
  })

/** วงจรชีวิตหลักสูตร — ใช้วาดไทม์ไลน์บนหน้าจอ */
export const getProgramFlow = (): { state: ProgramState; label: string; description: string; inCalc: boolean }[] =>
  PROG_FLOW.map(step => ({
    state: step.k as ProgramState,
    label: step.l,
    description: step.d,
    inCalc: PROG_STATE[step.k as ProgramState].calc
  }))

export type ProgramLogEntry = { at: string; icon: string; tone: 'ok' | 'info' | 'warn' | 'error'; text: string }

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '')

const LOG_ICON: Record<string, { icon: string; tone: ProgramLogEntry['tone'] }> = {
  '➕': { icon: 'ri-add-line', tone: 'info' },
  '📤': { icon: 'ri-send-plane-line', tone: 'info' },
  '🔄': { icon: 'ri-refresh-line', tone: 'info' },
  '⏸': { icon: 'ri-pause-line', tone: 'warn' },
  '⏹': { icon: 'ri-stop-line', tone: 'error' }
}

export const getProgramLog = (): ProgramLogEntry[] =>
  PROGRAM_LOG.map(entry => ({
    at: entry.t,
    icon: LOG_ICON[entry.ic]?.icon ?? 'ri-circle-line',
    tone: LOG_ICON[entry.ic]?.tone ?? 'info',
    text: stripTags(entry.h)
  }))

export { liveVersion }
