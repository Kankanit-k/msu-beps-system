// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import FacultyRevenueTable from '@views/beps/revenue/FacultyRevenueTable'
import RevenueCompositionChart from '@views/beps/revenue/RevenueCompositionChart'
import RevenueKpis from '@views/beps/revenue/RevenueKpis'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getFaculties } from '@/server/beps/faculties'
import { getUniversityTotals } from '@/server/beps/university'

/** W4c — รายได้รายคณะ · ต้นฉบับ: mockup/W4c-revenue.html + assets/page-revenue.js */
const RevenuePage = () => {
  const totals = getUniversityTotals()
  const faculties = getFaculties()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='รายได้รายคณะ'
          screen='W4'
          subtitle='องค์ประกอบรายได้ เงินแผ่นดิน + เงินรายได้ และส่วนเกิน/ขาดทุนของแต่ละคณะ'
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

      <RevenueKpis totals={totals} />

      <Grid size={{ xs: 12 }}>
        <RevenueCompositionChart faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FacultyRevenueTable faculties={faculties} />
      </Grid>
    </Grid>
  )
}

export default RevenuePage
