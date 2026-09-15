/**
 * แหล่งข้อมูลต้นทางและผลตรวจความพร้อมก่อนสั่งคำนวณ (W9)
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api ที่อ่านตาราง
 * `source_dataset` และ `import_batch` จริง
 *
 * ลิงก์ "ไปแก้" ของ mockup ชี้ไปยังไฟล์ .html — ที่นี่แปลงเป็นเส้นทางจริงของแอป
 * ตั้งแต่ชั้นข้อมูล เพื่อไม่ให้หน้าจอต้องรู้จักชื่อไฟล์ของ mockup
 */
import { IMPORT_LOG, SOURCES, SRC_STATE, VALIDATIONS } from '@/data/fixtures/master-data'

export type SourceState = keyof typeof SRC_STATE

export type CostDataSource = {
  key: string
  name: string
  note: string
  /** วิธีรับข้อมูล เช่น API รายวัน */
  mode: string
  rowCount: number
  /** ยอดเงินรวมของแหล่งนี้ — null = แหล่งที่ไม่ได้ให้ยอดเงิน (เช่น จำนวนนิสิต) */
  amount: number | null
  /** เวลาซิงก์ล่าสุด — null = ยังไม่เคยซิงก์ */
  syncedAt: string | null
  state: SourceState
  stateLabel: string
}

export type ValidationSeverity = 'block' | 'warn' | 'info'

export type ValidationIssue = {
  severity: ValidationSeverity
  title: string
  count: number
  unit: string
  impact: string
  owner: string
  /** เส้นทางในแอปที่ไปแก้เรื่องนี้ */
  href: string
}

/** ชื่อไฟล์ของ mockup → เส้นทางจริง (ดู src/data/navigation/bepsNav.ts) */
const MOCKUP_ROUTE: Record<string, string> = {
  'W8-tuition.html': '/admin/tuition',
  'W13-exceptions.html': '/admin/exceptions',
  'W14-account-rules.html': '/admin/university/account-rules',
  'W15-settings.html': '/admin/university/settings',
  'W16-programs.html': '/admin/programs'
}

export const getCostDataSources = (): CostDataSource[] =>
  SOURCES.map(s => ({
    key: s.key,
    name: s.name,
    note: s.note,
    mode: s.mode,
    rowCount: s.rows,
    amount: s.amount,
    syncedAt: s.at,
    state: s.state as SourceState,
    stateLabel: SRC_STATE[s.state as SourceState].l
  }))

export const getValidationIssues = (): ValidationIssue[] =>
  VALIDATIONS.map(v => ({
    severity: v.sev as ValidationSeverity,
    title: v.title,
    count: v.n,
    unit: v.unit,
    impact: v.impact,
    owner: v.owner,
    href: MOCKUP_ROUTE[v.go] ?? '/overview'
  }))

export type ImportLogKind = 'OK' | 'FILE' | 'FAIL' | 'BATCH'

export type ImportLogEntry = {
  at: string
  kind: ImportLogKind
  text: string
}

export const getImportLog = (): ImportLogEntry[] => IMPORT_LOG
