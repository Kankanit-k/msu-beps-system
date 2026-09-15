// MUI Imports
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import ProgramScenario from '@views/beps/scenario/ProgramScenario'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getBreakEvenEntities } from '@/server/beps/entities'

/**
 * W7 — คำนวณจุดคุ้มทุนรายหลักสูตร · ต้นฉบับ: mockup/W7-scenario-program.html
 *
 * ใช้ตอนเสนอเปิดหลักสูตรใหม่ (ยังไม่มีนิสิตจริง) หรือทดลองปรับตัวเลขของหลักสูตรเดิม
 * ผลที่ได้เป็น `scenario_plan` ไม่ปนกับผลจริง — และรายงาน PDF ที่ออกจากหน้านี้
 * ระบุไว้ชัดว่าเป็นแบบจำลอง เพราะเป็นเอกสารที่เอาไปแนบเรื่องเสนอจริง
 */
const ProgramScenarioPage = () => {
  const catalog = getBreakEvenEntities()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='คำนวณจุดคุ้มทุนรายหลักสูตร'
          screen='W7'
          subtitle='หลักสูตรเดิมดึงจากระบบ · หลักสูตรใหม่กรอกเอง · มีกราฟ ประวัติการคำนวณ และออกรายงาน PDF'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          ผลจากหน้านี้เป็น<b>แบบจำลอง</b> ไม่ปนกับผลจริงจากรอบคำนวณ · หลักสูตรที่ยังไม่ถึงสถานะ &ldquo;เปิดสอน&rdquo; ใน{' '}
          <Link href='/admin/programs'>ทะเบียนหลักสูตร</Link> จะประเมินได้เฉพาะแบบจำลองที่หน้านี้เท่านั้น
        </Alert>
      </Grid>

      <ProgramScenario catalog={catalog} />
    </Grid>
  )
}

export default ProgramScenarioPage
