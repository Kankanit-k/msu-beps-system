// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import EfficiencyScatter from '@views/beps/per-head/EfficiencyScatter'
import PerHeadBarChart from '@views/beps/per-head/PerHeadBarChart'
import PerHeadInsights from '@views/beps/per-head/PerHeadInsights'
import PerHeadKpis from '@views/beps/per-head/PerHeadKpis'
import PerHeadTable from '@views/beps/per-head/PerHeadTable'
import TopCostBars from '@views/beps/per-head/TopCostBars'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getFaculties } from '@/server/beps/faculties'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W4a — รายได้ vs ต้นทุนต่อหัวนิสิต
 * ต้นฉบับ: mockup/W4a-perhead.html + assets/page-perhead.js
 */
const PerHeadPage = () => {
  const totals = getUniversityTotals()
  const faculties = getFaculties()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='รายได้ vs ต้นทุนต่อหัวนิสิต'
          screen='W4'
          subtitle='ATC (ต้นทุนรวม/หัว) และ AVC ไม่เปลี่ยนตามฐานรายได้ — เปลี่ยนเฉพาะ R'
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

      <PerHeadKpis totals={totals} faculties={faculties} />

      <Grid size={{ xs: 12 }}>
        <PerHeadBarChart faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <EfficiencyScatter faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <TopCostBars faculties={faculties} totals={totals} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <PerHeadTable faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <PerHeadInsights totals={totals} faculties={faculties} />
      </Grid>
    </Grid>
  )
}

export default PerHeadPage
