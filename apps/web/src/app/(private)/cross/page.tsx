// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import CrossHeatmap from '@views/beps/cross/CrossHeatmap'
import CrossInsights from '@views/beps/cross/CrossInsights'
import CrossRankTable from '@views/beps/cross/CrossRankTable'
import CrossScatters from '@views/beps/cross/CrossScatters'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getCrossMetricsByMode } from '@/server/beps/cross'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W5 — Cross Analysis & Heatmap · ต้นฉบับ: mockup/W5-cross.html + assets/page-cross.js
 *
 * หน้านี้ตอบคำถามที่หน้าอื่นตอบไม่ได้: **คณะไหนควรจัดการก่อน** โดยดูสองแกนพร้อมกัน
 * (ใช้กำลังผลิตเต็มแค่ไหน × ทำกำไรได้แค่ไหน) แทนที่จะดูตัวเลขเดียวแล้วสรุป
 */
const CrossAnalysisPage = () => {
  const byMode = getCrossMetricsByMode()
  const totals = getUniversityTotals()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='Cross Analysis & Heatmap'
          screen='W5'
          subtitle='Q* ระดับคณะคำนวณจากยอดรวมของคณะ (pooled) · คณะที่ CM ≤ 0 จะไม่มี Q* และแสดงเป็น —'
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

      <Grid size={{ xs: 12 }}>
        <CrossHeatmap byMode={byMode} />
      </Grid>

      <CrossScatters byMode={byMode} />

      <Grid size={{ xs: 12 }}>
        <CrossRankTable byMode={byMode} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <CrossInsights byMode={byMode} />
      </Grid>
    </Grid>
  )
}

export default CrossAnalysisPage
