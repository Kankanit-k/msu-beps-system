/**
 * รอบคำนวณที่กำลังดูอยู่
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็นอ่าน allocation_run แถวล่าสุดที่ APPROVED
 * จาก apps/api โดยหน้าจอไม่ต้องแก้ (SA.md §11.2 — dashboard อ่านจาก run ที่อนุมัติแล้ว
 * เท่านั้น ไม่คำนวณสดตอนเปิดหน้า)
 */
import type { BepsRun } from '@/contexts/BepsContext'
import { RUNS } from '@/data/fixtures/master-data'

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
