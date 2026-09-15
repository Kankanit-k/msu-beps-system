// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import CostStructureCard from '@views/beps/overview/CostStructureCard'
import FacultyRankTables from '@views/beps/overview/FacultyRankTables'
import OverviewInsights from '@views/beps/overview/OverviewInsights'
import OverviewKpis from '@views/beps/overview/OverviewKpis'
import RevenueVsCostChart from '@views/beps/overview/RevenueVsCostChart'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getFaculties } from '@/server/beps/faculties'
import { getProgramStatusCounts } from '@/server/beps/programs'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W1 — ภาพรวมมหาวิทยาลัย · ต้นฉบับ: mockup/W1-overview.html + assets/page-overview.js
 *
 * หน้าเป็น server component ที่คำนวณครบ **ทั้ง 2 ฐานรายได้** แล้วส่งลงไป ส่วนที่เลือกว่า
 * จะแสดงฐานไหนเป็นงานของ client component ที่อ่าน BepsContext — กดปุ่มบน navbar แล้ว
 * ตัวเลขเปลี่ยนทันทีโดยไม่ต้องยิงขอข้อมูลใหม่
 */
const OverviewPage = () => {
  const totals = getUniversityTotals()
  const faculties = getFaculties()
  const programStatusCounts = getProgramStatusCounts()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ภาพรวมมหาวิทยาลัย'
          screen='W1'
          subtitle='รายได้ ต้นทุน และจุดคุ้มทุนของทั้งมหาวิทยาลัย เทียบรายคณะ'
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

      <OverviewKpis totals={totals} />

      <Grid size={{ xs: 12, lg: 8 }}>
        <RevenueVsCostChart faculties={faculties} />
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <CostStructureCard totals={totals} />
      </Grid>

      <FacultyRankTables faculties={faculties} />

      <Grid size={{ xs: 12 }}>
        <OverviewInsights totals={totals} faculties={faculties} programStatusCounts={programStatusCounts} />
      </Grid>
    </Grid>
  )
}

export default OverviewPage
