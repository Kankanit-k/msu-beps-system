// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import CostKpis from '@views/beps/cost-structure/CostKpis'
import FacultyCostChart from '@views/beps/cost-structure/FacultyCostChart'
import FixedCostBreakdown from '@views/beps/cost-structure/FixedCostBreakdown'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getFaculties } from '@/server/beps/faculties'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W4b — โครงสร้างต้นทุน · ต้นฉบับ: mockup/W4b-cost.html + assets/page-cost.js
 *
 * ทุกตัวเลขในหน้านี้เป็นฝั่ง **ต้นทุน** ซึ่งไม่ขึ้นกับฐานรายได้ที่เลือกบน navbar
 * (สูตร 5a/5b เปลี่ยนเฉพาะฝั่งรายได้) หน้านี้จึงไม่มีอะไรเปลี่ยนเมื่อกดปุ่มสลับฐาน
 */
const CostStructurePage = () => {
  const totals = getUniversityTotals()
  const faculties = getFaculties()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='โครงสร้างต้นทุน'
          screen='W4'
          subtitle='ต้นทุนคงที่ (TFC) ไม่เปลี่ยนตามจำนวนนิสิต · ต้นทุนผันแปร (TVC) เปลี่ยนตามจำนวนนิสิต · AVC = TVC ÷ Q'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <DataCaveatAlert />
      </Grid>

      <CostKpis totals={totals} />

      <Grid size={{ xs: 12, lg: 8 }}>
        <FacultyCostChart faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <FixedCostBreakdown totals={totals} />
      </Grid>
    </Grid>
  )
}

export default CostStructurePage
