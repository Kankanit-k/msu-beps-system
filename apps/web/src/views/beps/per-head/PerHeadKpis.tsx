'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtInt, withSign } from '@/utils/beps-format'

/**
 * KPI ต่อหัว 4 ตัวของ W4a — ย้ายจาก .kpis ของ mockup/W4a-perhead.html
 *
 * ATC และ AVC ไม่เปลี่ยนตามฐานรายได้ — เปลี่ยนเฉพาะ R ทำให้ส่วนต่าง R − ATC
 * และจำนวนคณะที่ R ≥ ATC เปลี่ยนตามไปด้วย
 */

type Props = {
  totals: UniversityTotals
  faculties: FacultyBreakEven[]
}

const PerHeadKpis = ({ totals, faculties }: Props) => {
  const { revenueMode } = useBeps()
  const result = totals.byMode[revenueMode]

  const r = result.r ?? 0
  const atc = result.atc ?? 0
  const diff = r - atc

  const coveredCount = faculties.filter(f => {
    const res = f.byMode[revenueMode]

    return res.r !== null && res.atc !== null && res.r >= res.atc
  }).length

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='รายได้ต่อหัว (R)'
          value={fmtInt(r)}
          unit='บาท/คน · เฉลี่ยทั้งมหาวิทยาลัย'
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ต้นทุนรวมต่อหัว (ATC)' value={fmtInt(atc)} unit='บาท/คน · TC ÷ Q' color='warning.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ส่วนต่าง R − ATC'
          value={withSign(diff, fmtInt)}
          unit={diff >= 0 ? 'บาท/คน · กำไรต่อหัว' : 'บาท/คน · ขาดทุนต่อหัว'}
          color={diff >= 0 ? 'success.main' : 'error.main'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='คณะที่ R ≥ ATC'
          value={`${coveredCount}/${faculties.length}`}
          unit='คณะ · รายได้/หัว คุ้มต้นทุน/หัว'
          color='success.main'
        />
      </Grid>
    </>
  )
}

export default PerHeadKpis
