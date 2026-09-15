'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * KPI รายได้ 4 ตัวของ W4c — ย้ายจาก .kpis ของ mockup/W4c-revenue.html
 *
 * เงินแผ่นดินและเงินรายได้แสดงค่าจริงเสมอทั้ง 2 ฐาน สิ่งที่เปลี่ยนคือ TR และ R ต่อหัว
 * ซึ่งฐาน "ไม่รวมเงินแผ่นดิน" นับเฉพาะเงินรายได้ (สูตร 5b)
 */

type Props = {
  totals: UniversityTotals
}

const RevenueKpis = ({ totals }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()
  const result = totals.byMode[revenueMode]

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label={includesGovernment ? 'รายได้รวม (TR)' : 'เงินรายได้ (ค่าธรรมเนียม)'}
          value={fmtMillions(result.tr)}
          unit='ล้านบาท'
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='งบประมาณเงินแผ่นดิน'
          value={fmtMillions(totals.governmentBudget)}
          unit={includesGovernment ? 'ล้านบาท' : 'ล้านบาท · ไม่ถูกนับในฐานนี้'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='งบประมาณเงินรายได้'
          value={fmtMillions(totals.incomeBudget)}
          unit='ล้านบาท'
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='รายได้เฉลี่ยต่อหัว (R)'
          value={result.r === null ? '—' : fmtInt(result.r)}
          unit='บาท/คน'
          color='success.main'
        />
      </Grid>
    </>
  )
}

export default RevenueKpis
