// MUI Imports
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import SampleDataAlert from '@components/beps/SampleDataAlert'
import AggregateFormulas from '@views/beps/formulas/AggregateFormulas'
import CoreFormulas from '@views/beps/formulas/CoreFormulas'
import CostClassification from '@views/beps/formulas/CostClassification'
import MethodNotes from '@views/beps/formulas/MethodNotes'
import RevenueBasisFormula from '@views/beps/formulas/RevenueBasisFormula'
import VariableGlossary from '@views/beps/formulas/VariableGlossary'

// Data Imports
import { getFullCostRecoveryExample } from '@/server/beps/programs'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W10 — สูตรและหลักวิชาการจุดคุ้มทุน
 *
 * หน้าที่นิ่งที่สุดของระบบ จึงเป็นหน้าแรกที่ย้ายเข้าเทมเพลต (Phase 3.1) — ใช้ตรวจว่า
 * shell + ชั้น fixture + ธีม ต่อกันถูกก่อนจะไปหน้าที่มีตารางและกราฟ
 *
 * ตัวเลขทุกตัวบนหน้านี้มาจาก @beps/calc-engine ผ่าน src/server/beps/* ไม่มีค่าใดพิมพ์ทิ้งไว้
 * (mockup ฝังสัดส่วน 61.6% และตัวอย่างสูตร 7 ไว้ใน HTML ตรงๆ)
 */
const FormulasPage = () => {
  const totals = getUniversityTotals()
  const fullCostRecoveryExample = getFullCostRecoveryExample()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-3 flex-wrap'>
          <Typography variant='h4'>สูตรและหลักวิชาการจุดคุ้มทุน</Typography>
          <Chip label='W10' size='small' color='primary' variant='tonal' />
        </div>
        <Typography color='text.secondary'>
          Break-Even Analysis — สูตร 1–7 ที่ระบบใช้จริง พร้อมค่าปัจจุบันของมหาวิทยาลัย
        </Typography>
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <CoreFormulas fixedCostShare={totals.fixedCostShare} />

      <RevenueBasisFormula />

      <AggregateFormulas fullCostRecoveryExample={fullCostRecoveryExample} />

      <Grid size={{ xs: 12 }}>
        <VariableGlossary
          byMode={totals.byMode}
          fixedCostShare={totals.fixedCostShare}
          variableCostShare={totals.variableCostShare}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <CostClassification fixedCostShare={totals.fixedCostShare} variableCostShare={totals.variableCostShare} />
      </Grid>

      <MethodNotes facultyCount={totals.facultyCount} programCount={totals.programCount} />
    </Grid>
  )
}

export default FormulasPage
