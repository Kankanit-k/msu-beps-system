'use client'

// Component Imports
import type { RevenueMode } from '@beps/calc-engine'

import InsightList from '@views/beps/shared/InsightList'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'
import type { ProgramStatusCounts } from '@/server/beps/programs'
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ประเด็นสำคัญของ W1 — ย้ายจาก `ov-ins` ของ mockup/assets/page-overview.js
 *
 * ตัวเลขทุกตัวในข้อความคำนวณจากชุดข้อมูลที่โหลดอยู่ (mockup ฝัง "20" และ "230" ไว้ตรงๆ
 * ในสองข้อความ ซึ่งจะผิดทันทีที่ข้อมูลเปลี่ยน)
 */

type Props = {
  totals: UniversityTotals
  faculties: FacultyBreakEven[]
  programStatusCounts: Record<RevenueMode, ProgramStatusCounts>
}

const OverviewInsights = ({ totals, faculties, programStatusCounts }: Props) => {
  const { revenueMode } = useBeps()
  const result = totals.byMode[revenueMode]
  const counts = programStatusCounts[revenueMode]

  const ranked = [...faculties].sort((a, b) => b.byMode[revenueMode].profit - a.byMode[revenueMode].profit)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const lossCount = faculties.filter(f => f.byMode[revenueMode].profit < 0).length

  /* หลักสูตรที่ "ยังไม่คุ้มทุน" นับรวมทั้งที่ยังไม่ถึง Q* และที่ไม่มีจุดคุ้มทุนเลย (R ≤ AVC)
     ตรงกับเกณฑ์ของ mockup ที่นับทุกแถวที่ status() ไม่ใช่ 'ok' */
  const notBreakingEven = counts.below + counts.noBreakEven

  return (
    <InsightList
      title='ประเด็นสำคัญ — ภาพรวม'
      items={[
        {
          tone: result.profit >= 0 ? 'ok' : 'crit',
          content: (
            <>
              ทั้งมหาวิทยาลัยมีนิสิต <b>{fmtInt(totals.q)}</b> คน {result.profit >= 0 ? 'มีส่วนเกิน' : 'ขาดทุนสุทธิ'}{' '}
              <b>{fmtMillions(Math.abs(result.profit))} ลบ.</b> (
              {result.tr > 0 ? fmtDec((result.profit / result.tr) * 100) : '—'}% ของรายได้) จุดคุ้มทุนรวมอยู่ที่{' '}
              <b>{result.qStar === null ? '—' : `${fmtInt(result.qStar)} คน`}</b>
            </>
          )
        },
        {
          tone: 'info',
          content: (
            <>
              คณะที่ทำส่วนเกินสูงสุดคือ <b>{best.shortName}</b> (+{fmtMillions(best.byMode[revenueMode].profit)} ลบ.)
              ขณะที่ <b>{worst.shortName}</b> ขาดทุนมากสุด ({fmtMillions(worst.byMode[revenueMode].profit)} ลบ.)
            </>
          )
        },
        {
          tone: lossCount > faculties.length / 2 ? 'crit' : 'warn',
          content: (
            <>
              มี <b>{lossCount} คณะ</b> จาก {faculties.length} ที่ยังไม่คุ้มทุนในฐานรายได้นี้ และ{' '}
              <b>{fmtInt(notBreakingEven)} หลักสูตร</b> จาก {fmtInt(counts.total)} ที่ Q ยังต่ำกว่าจุดคุ้มทุน
            </>
          )
        },
        {
          tone: 'info',
          content: (
            <>
              ต้นทุนคงที่คิดเป็น <b>{fmtDec(totals.fixedCostShare, 0)}%</b> ของต้นทุนรวม
              สะท้อนภาระโครงสร้างที่ต้องกระจายไปยังจำนวนนิสิตให้มากพอ
            </>
          )
        }
      ]}
    />
  )
}

export default OverviewInsights
