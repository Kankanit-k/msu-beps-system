// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'

// Type Imports
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * KPI ต้นทุน 4 ตัวของ W4b — ย้ายจาก .kpis ของ mockup/W4b-cost.html
 *
 * ต้นทุนไม่ขึ้นกับฐานรายได้ (สูตร 5 เปลี่ยนเฉพาะฝั่งรายได้) การ์ดชุดนี้จึงไม่ต้องอ่าน
 * context และเป็น server component ได้ทั้งก้อน
 */

type Props = {
  totals: UniversityTotals
}

const CostKpis = ({ totals }: Props) => {
  const { tc, tfc, tvc, avc } = totals.byMode.with_government

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ต้นทุนรวม (TC)' value={fmtMillions(tc)} unit='ล้านบาท' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ต้นทุนคงที่ (TFC)'
          value={fmtMillions(tfc)}
          unit={`ล้านบาท · ${fmtDec(totals.fixedCostShare, 0)}% ของ TC`}
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ต้นทุนผันแปร (TVC)'
          value={fmtMillions(tvc)}
          unit={`ล้านบาท · ${fmtDec(totals.variableCostShare, 0)}% ของ TC`}
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ต้นทุนผันแปร/หัว (AVC)' value={avc === null ? '—' : fmtInt(avc)} unit='บาท/คน' />
      </Grid>
    </>
  )
}

export default CostKpis
