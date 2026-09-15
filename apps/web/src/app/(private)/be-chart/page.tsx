// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import BreakEvenExplorer from '@views/beps/be-chart/BreakEvenExplorer'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getBreakEvenEntities } from '@/server/beps/entities'
import { getUniversityTotals } from '@/server/beps/university'

/** W3 — กราฟจุดคุ้มทุน · ต้นฉบับ: mockup/W3-chart.html + assets/page-chart.js */
const BreakEvenChartPage = () => {
  const catalog = getBreakEvenEntities()
  const totals = getUniversityTotals()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='กราฟจุดคุ้มทุน'
          screen='W3'
          subtitle='เส้นรายได้รวม (TR) ตัดกับต้นทุนรวม (TC) ที่จุดคุ้มทุน (Q*) — เลือกหน่วยวิเคราะห์ได้ 4 ระดับ'
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

      <BreakEvenExplorer catalog={catalog} totals={totals} />
    </Grid>
  )
}

export default BreakEvenChartPage
