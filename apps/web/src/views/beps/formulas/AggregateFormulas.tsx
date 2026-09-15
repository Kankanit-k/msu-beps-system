// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import { FormulaCard, FormulaEquation } from './FormulaCard'

// Type Imports
import type { FullCostRecoveryExample } from '@/server/beps/programs'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * สูตรที่ 6 (รวมขึ้นระดับคณะ) และสูตรที่ 7 (กรณี CM ≤ 0)
 *
 * วิธีที่ใช้จริงของสูตร 6 เป็นค่าตั้งระบบ `qstar_primary_method` (W15) ไม่ใช่ค่าที่แต่ละ
 * หน้าจอเลือกเอง — calc-engine/aggregate.ts บังคับไว้ด้วยเหตุผลเดียวกับที่ SA.md §11.1 เตือน
 */

type Props = {
  /**
   * ตัวอย่างหลักสูตรที่ต้องใช้สูตร 7 — `null` เมื่อชุดข้อมูลไม่มีหลักสูตรที่ CM ≤ 0
   * ตรึงไว้ที่ฐาน "รวมเงินแผ่นดิน" เพราะเป็นตัวอย่างประกอบคำอธิบาย ไม่ใช่ตัวเลขรายงาน
   */
  fullCostRecoveryExample: FullCostRecoveryExample | null
}

const AggregateFormulas = ({ fullCostRecoveryExample }: Props) => (
  <>
    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-node-tree' title='สูตรที่ 6 — จุดคุ้มทุนระดับคณะ (2 วิธี)'>
        <FormulaEquation>วิธีหลัก: Q*คณะ = Σ Q*หลักสูตร i</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          <b>วิธีผลรวมรายหลักสูตร (ค่าหลัก)</b> — หา Q* ของแต่ละหลักสูตรก่อน แล้วนำมาบวกกัน
          แต่ละหลักสูตรต้องคุ้มต้นทุนคงที่ของตัวเอง ชดเชยข้ามหลักสูตรไม่ได้ → เข้มงวดและตรงกับการบริหารจริง
        </Typography>
        <Typography variant='body2' color='text.disabled'>
          <b>วิธีเทียบ</b> Q* = TFCคณะ ÷ (R − AVC) ใช้ยอดรวมทั้งคณะ ยอมให้หลักสูตรกำไรอุ้มหลักสูตรขาดทุน → ได้ Q*
          ต่ำกว่าจริง
        </Typography>
      </FormulaCard>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-error-warning-line' title='สูตรที่ 7 — กรณี CM ≤ 0'>
        <FormulaEquation color='warning'>ถ้า (R − AVC) ≤ 0 → Q* = TC ÷ R</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          เมื่อ AVC &gt; R (ต้นทุนผันแปรต่อหัวสูงกว่าค่าเทอมต่อหัว) ตัวส่วนของสูตรมาตรฐานจะติดลบ ได้ Q*
          ติดลบซึ่งไม่มีความหมาย จึงใช้หลัก <b>Full-Cost Recovery</b> —
          หาว่าต้องรับนิสิตกี่คนค่าเทอมรวมจึงครอบคลุมต้นทุนทั้งหมด
        </Typography>
        {fullCostRecoveryExample && (
          <Typography variant='body2' color='text.secondary'>
            <b>ตัวอย่างจากชุดข้อมูลที่โหลดอยู่</b> (ฐานรวมเงินแผ่นดิน) — {fullCostRecoveryExample.degree} (
            {fullCostRecoveryExample.faculty}): TC ≈ {fmtMillions(fullCostRecoveryExample.tc)} ล้านบาท · รายได้ต่อหัว ≈{' '}
            {fmtInt(fullCostRecoveryExample.r)} บ./คน → Q* = {fmtInt(fullCostRecoveryExample.tc)} ÷{' '}
            {fmtInt(fullCostRecoveryExample.r)} ≈ <b>{fmtInt(fullCostRecoveryExample.qStar)} คน</b> (ลงทะเบียนจริง{' '}
            {fmtInt(fullCostRecoveryExample.q)} คน)
          </Typography>
        )}
        <Typography variant='body2' color='error.main'>
          ⚠ ค่าที่ได้เป็นเป้าหมายขั้นต่ำ ไม่ใช่จุดคุ้มทุนจริง — ทางแก้ที่ยั่งยืนคือลด AVC หรือขึ้นค่าธรรมเนียม
        </Typography>
      </FormulaCard>
    </Grid>
  </>
)

export default AggregateFormulas
