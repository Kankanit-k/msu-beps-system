'use client'

// Component Imports
import InsightList from '@views/beps/shared/InsightList'
import type { Insight } from '@views/beps/shared/InsightList'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'
import type { UniversityTotals } from '@/server/beps/university'

// Data Imports
import { OUTLIER_MIN_Q } from '@/server/beps/faculties'

// Util Imports
import { toPerHeadRows } from './rows'
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ประเด็นสำคัญของ W4a — ย้ายจากส่วน insights ของ mockup/assets/page-perhead.js
 *
 * ข้อสังเกตเรื่อง Economies of Scale ใช้ **มัธยฐาน** ไม่ใช่ค่าเฉลี่ย เพราะกลุ่มคณะเล็ก
 * มีค่าผิดปกติสูงมากอยู่ไม่กี่ตัว ค่าเฉลี่ยจะถูกดึงจนไม่สะท้อนภาพกลุ่ม (ตาม mockup)
 */

const LARGE_FACULTY_Q = 3000
const SMALL_FACULTY_Q = 1000

const median = (values: number[]): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const half = Math.floor(sorted.length / 2)

  return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2
}

type Props = {
  totals: UniversityTotals
  faculties: FacultyBreakEven[]
}

const PerHeadInsights = ({ totals, faculties }: Props) => {
  const { revenueMode } = useBeps()

  const rows = toPerHeadRows(faculties, revenueMode)
  const universityResult = totals.byMode[revenueMode]
  const universityR = universityResult.r ?? 0
  const universityAtc = universityResult.atc ?? 0
  const diff = universityR - universityAtc

  const losing = rows.filter(row => row.diff < 0).sort((a, b) => a.diff - b.diff)
  const winning = rows.filter(row => row.diff >= 0).sort((a, b) => b.diff - a.diff)

  const large = rows.filter(row => row.faculty.q >= LARGE_FACULTY_Q)
  const small = rows.filter(row => row.faculty.q < SMALL_FACULTY_Q && row.faculty.q >= OUTLIER_MIN_Q)
  const largeMedian = median(large.map(row => row.atc))
  const smallMedian = median(small.map(row => row.atc))

  const items: Insight[] = [
    diff >= 0
      ? {
          tone: 'ok',
          content: (
            <>
              เฉลี่ยทั้งมหาวิทยาลัย <b>รายได้/หัว {fmtInt(universityR)} บ.</b> สูงกว่า{' '}
              <b>ต้นทุน/หัว {fmtInt(universityAtc)} บ.</b> อยู่ <b>+{fmtInt(diff)} บ./คน</b>
            </>
          )
        }
      : {
          tone: 'crit',
          content: (
            <>
              เฉลี่ยทั้งมหาวิทยาลัย <b>ขาดทุน {fmtInt(Math.abs(diff))} บ./คน</b> — รายได้/หัว {fmtInt(universityR)}{' '}
              ต่ำกว่าต้นทุน/หัว {fmtInt(universityAtc)} บ.
            </>
          )
        }
  ]

  if (losing.length > 0) {
    items.push({
      tone: losing.length >= 10 ? 'crit' : 'warn',
      content: (
        <>
          <b>
            {losing.length}/{rows.length} คณะมีต้นทุน/หัว สูงกว่ารายได้/หัว
          </b>{' '}
          — ขาดทุนต่อหัวมากสุด:{' '}
          {losing
            .slice(0, 3)
            .map(row => `${row.faculty.shortName} (−${fmtInt(Math.abs(row.diff))})`)
            .join(', ')}
        </>
      )
    })
  }

  if (winning.length > 0) {
    items.push({
      tone: 'ok',
      content: (
        <>
          คุ้มค่าที่สุดต่อหัว:{' '}
          <b>
            {winning[0].faculty.shortName} +{fmtInt(winning[0].diff)} บ./คน
          </b>{' '}
          (R {fmtInt(winning[0].r)} · ATC {fmtInt(winning[0].atc)})
        </>
      )
    })
  }

  if (large.length > 0 && small.length > 0 && smallMedian > largeMedian) {
    items.push({
      tone: 'info',
      content: (
        <>
          <b>Economies of Scale</b>: คณะใหญ่ (≥ {fmtInt(LARGE_FACULTY_Q)} คน) ต้นทุน/หัวมัธยฐาน{' '}
          <b>{fmtInt(largeMedian)}</b> · คณะเล็ก (&lt; {fmtInt(SMALL_FACULTY_Q)}) <b>{fmtInt(smallMedian)}</b> — สูงกว่า{' '}
          <b>{fmtDec(smallMedian / largeMedian)}×</b> เพราะต้นทุนคงที่กระจายบนนิสิตน้อย
        </>
      )
    })
  }

  for (const row of rows.filter(x => x.faculty.q < OUTLIER_MIN_Q)) {
    items.push({
      tone: 'crit',
      content: (
        <>
          <b>{row.faculty.name}</b> มีนิสิตเพียง <b>{fmtInt(row.faculty.q)} คน</b> แต่ต้นทุนรวม{' '}
          {fmtMillions(row.faculty.byMode[revenueMode].tc)} ลบ. → ต้นทุน/หัว {fmtInt(row.atc)} บ. (
          {universityAtc > 0 ? fmtDec(row.atc / universityAtc, 0) : '—'}× ค่าเฉลี่ย) — เป็นหน่วยวิจัย จึงกันออกจากกราฟ
        </>
      )
    })
  }

  return <InsightList title='ประเด็นสำคัญ — ต่อหัวนิสิต' items={items} />
}

export default PerHeadInsights
