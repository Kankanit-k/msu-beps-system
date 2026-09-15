// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import BreakEvenSummary from '@views/beps/breakeven/BreakEvenSummary'
import BreakEvenTree from '@views/beps/breakeven/BreakEvenTree'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getBreakEvenTree } from '@/server/beps/breakeven-tree'
import { getUniversityTotals } from '@/server/beps/university'

/** W2 — เจาะลึกจุดคุ้มทุน 3 ระดับ · ต้นฉบับ: mockup/W2-breakeven.html + assets/page-breakeven.js */
const BreakEvenPage = () => {
  const faculties = getBreakEvenTree()
  const totals = getUniversityTotals()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='เจาะลึกจุดคุ้มทุน'
          screen='W2'
          subtitle='คณะ → ระดับการศึกษา → หลักสูตร · ค้นหาและกรองตามสถานะได้'
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

      <BreakEvenSummary faculties={faculties} />

      <Grid size={{ xs: 12 }}>
        <BreakEvenTree faculties={faculties} />
      </Grid>
    </Grid>
  )
}

export default BreakEvenPage
