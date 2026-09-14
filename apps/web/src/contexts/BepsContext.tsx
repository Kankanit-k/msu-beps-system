'use client'

// React Imports
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// Type Imports
import type { RevenueMode } from '@beps/calc-engine'

/**
 * สถานะร่วมของทุกหน้าจอวิเคราะห์ — ปีงบประมาณ · รอบคำนวณ · ฐานรายได้
 *
 * ใน mockup สามอย่างนี้เป็นตัวแปร global (BM ที่ core.js:9 และ RUN ที่ :127) และทุกหน้า
 * ลงทะเบียน window.renderPage ไว้ให้ปุ่มสลับฐานเรียก re-render เอง ที่นี่แทนด้วย context
 * ปกติ — คอมโพเนนต์ที่อ่านค่าจะ re-render ให้เองเมื่อค่าเปลี่ยน
 *
 * SA.md §9.2 ข้อ 9 บังคับว่าทุกหน้าวิเคราะห์ต้องบอกได้ว่าตัวเลขที่เห็นมาจาก run ไหน
 * ค่าพวกนี้จึงต้องอยู่ที่เดียวและแสดงบน navbar ตลอดเวลา
 */

/** รอบคำนวณที่กำลังดูอยู่ — ตรงกับตาราง allocation_run */
export type BepsRun = {
  id: number
  year: number
  /** วันเวลาที่คำนวณเสร็จ */
  calcAt: string
  state: 'DRAFT' | 'RUNNING' | 'CALCULATED' | 'VALIDATED' | 'APPROVED' | 'FAILED' | 'CANCELLED'
  /** ฐานจำนวนเงินที่ใช้ — ACTUAL | COMMITTED | BUDGET */
  basis: string
  /** เวอร์ชันกติกาปันส่วนที่ใช้ */
  ruleVer: string
}

type BepsState = {
  /** ฐานรายได้ที่เลือกอยู่ — คุมสูตร 5a/5b ทั้งระบบ */
  revenueMode: RevenueMode
  setRevenueMode: (mode: RevenueMode) => void
  /** true = รวมเงินแผ่นดิน (ทางลัดของ revenueMode สำหรับปุ่ม toggle) */
  includesGovernment: boolean
  year: number
  setYear: (year: number) => void
  run: BepsRun
  /** ปีที่เลือกได้ — มาจากงวดที่มีผลคำนวณแล้ว */
  availableYears: number[]
}

const BepsStateContext = createContext<BepsState | null>(null)

type ProviderProps = {
  children: ReactNode
  run: BepsRun
  availableYears: number[]
  defaultRevenueMode?: RevenueMode
}

export const BepsProvider = ({
  children,
  run,
  availableYears,
  defaultRevenueMode = 'with_government'
}: ProviderProps) => {
  const [revenueMode, setRevenueMode] = useState<RevenueMode>(defaultRevenueMode)
  const [year, setYear] = useState<number>(run.year)

  const handleSetRevenueMode = useCallback((mode: RevenueMode) => setRevenueMode(mode), [])
  const handleSetYear = useCallback((next: number) => setYear(next), [])

  const value = useMemo<BepsState>(
    () => ({
      revenueMode,
      setRevenueMode: handleSetRevenueMode,
      includesGovernment: revenueMode === 'with_government',
      year,
      setYear: handleSetYear,
      run,
      availableYears
    }),
    [revenueMode, handleSetRevenueMode, year, handleSetYear, run, availableYears]
  )

  return <BepsStateContext.Provider value={value}>{children}</BepsStateContext.Provider>
}

export const useBeps = (): BepsState => {
  const ctx = useContext(BepsStateContext)

  if (!ctx) {
    throw new Error('useBeps ต้องเรียกภายใน <BepsProvider> — ดู src/app/(private)/layout.tsx')
  }

  return ctx
}

/** คำอธิบายฐานรายได้ที่เลือกอยู่ — ข้อความเดียวกับที่ mockup แสดงใต้ปุ่ม (core.js:58) */
export const revenueModeNote = (mode: RevenueMode): string =>
  mode === 'with_government'
    ? 'ฐานรายได้ = เงินแผ่นดิน + เงินรายได้ (สะท้อนต้นทุนจริงทั้งหมด)'
    : 'ฐานรายได้ = เงินรายได้/ค่าธรรมเนียมเท่านั้น (สะท้อนการเลี้ยงตัวเองของหลักสูตร)'
