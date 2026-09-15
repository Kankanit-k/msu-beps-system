// MUI Imports
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'

// Component Imports
import FacultyScenario from '@views/beps/scenario/FacultyScenario'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getBreakEvenEntities } from '@/server/beps/entities'
import { TFC_PRESETS, TVC_PRESETS } from '@/server/beps/scenario'

/** W6 — คำนวณจุดคุ้มทุนรายคณะ · ต้นฉบับ: mockup/W6-scenario-faculty.html */
const FacultyScenarioPage = () => {
  const catalog = getBreakEvenEntities()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='คำนวณจุดคุ้มทุนรายคณะ'
          screen='W6'
          subtitle='เลือกคณะเพื่อดึงข้อมูลอัตโนมัติ แล้วปรับรายการ TFC/TVC เอง · เทียบผลทั้ง 2 ฐานรายได้'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          ผลจากหน้านี้เป็น<b>แบบจำลอง</b> ไม่ปนกับผลจริงจากรอบคำนวณ — ตัวเลขที่นำไปเสนอต้องมาจากรอบที่อนุมัติแล้ว (ดู
          chip รอบคำนวณบนแถบด้านบน) · สูตรที่ใช้เป็นชุดเดียวกับระบบ (@beps/calc-engine)
        </Alert>
      </Grid>

      <FacultyScenario catalog={catalog} presets={{ tfc: TFC_PRESETS, tvc: TVC_PRESETS }} />
    </Grid>
  )
}

export default FacultyScenarioPage
