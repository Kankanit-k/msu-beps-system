/**
 * อัตราค่าธรรมเนียมการศึกษา (W8) — ตาราง `fee_schedule` + `fee_approval_log`
 *
 * อัตราหนึ่งรายการผูกกับ **หลักสูตร × ระดับ × ประเภทนิสิต** เพราะหลักสูตรเดียวกัน
 * คิดนิสิตไทยกับต่างชาติคนละอัตรา (ดู W17 ประเภทนิสิต) — และทุกอัตราต้องผ่านการอนุมัติ
 * ก่อนจึงจะถูกนำไปคำนวณ TR ได้ อัตราที่ยังเป็นร่างหรือรออนุมัติจะทำให้หลักสูตรติดธง
 * `NO_FEE` และถูกกันออกจากยอดรวม ไม่ใช่คำนวณด้วยค่า 0
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { FEE_LOG, FEE_STATUS, FEES } from '@/data/fixtures/master-data'

export type FeeStatus = keyof typeof FEE_STATUS

export type FeeSchedule = {
  faculty: string
  program: string
  level: string
  /** ประเภทนิสิต เช่น "ภาคปกติ · ไทย" */
  studentType: string
  /** อัตราปัจจุบัน (บาท/ปี) */
  rate: number
  /** อัตราเดิมก่อนปรับ — null = เป็นอัตราแรกของหลักสูตรนี้ */
  previousRate: number | null
  status: FeeStatus
  statusLabel: string
  /** ผู้อนุมัติ — null = ยังไม่อนุมัติ */
  approvedBy: string | null
  approvedAt: string | null
}

export const getFeeSchedules = (): FeeSchedule[] =>
  FEES.map(f => ({
    faculty: f.fac,
    program: f.prog,
    level: f.lvl,
    studentType: f.st,
    rate: f.rate,
    previousRate: f.prev,
    status: f.status as FeeStatus,
    statusLabel: FEE_STATUS[f.status as FeeStatus].l,
    approvedBy: f.by,
    approvedAt: f.at
  }))

export type FeeLogEntry = {
  at: string
  icon: string
  tone: 'ok' | 'info' | 'warn' | 'error'
  text: string
}

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '')

const LOG_ICON: Record<string, { icon: string; tone: FeeLogEntry['tone'] }> = {
  '✅': { icon: 'ri-check-line', tone: 'ok' },
  '📤': { icon: 'ri-send-plane-line', tone: 'info' },
  '📝': { icon: 'ri-edit-line', tone: 'info' },
  '➕': { icon: 'ri-add-line', tone: 'info' }
}

export const getFeeLog = (): FeeLogEntry[] =>
  FEE_LOG.map(entry => ({
    at: entry.t,
    icon: LOG_ICON[entry.ic]?.icon ?? 'ri-circle-line',
    tone: LOG_ICON[entry.ic]?.tone ?? 'info',
    text: stripTags(entry.h)
  }))
