// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import { FormulaCard, FormulaEquation } from './FormulaCard'

/**
 * สูตรที่ 5 — ฐานรายได้ 2 กรณี
 *
 * เป็นสูตรเดียวที่ผูกกับปุ่มสลับฐานรายได้บน navbar (BepsToolbar) โดยตรง
 * ต้นทุนเท่ากันทั้ง 2 กรณี เปลี่ยนเฉพาะฝั่งรายได้ — ดู calc-engine/break-even.ts:totalRevenue
 */
const RevenueBasisFormula = () => (
  <Grid size={{ xs: 12 }}>
    <FormulaCard icon='ri-scales-3-line' title='สูตรที่ 5 — ฐานรายได้ 2 กรณี (ตามไฟล์ต้นฉบับ)'>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormulaEquation>R รวมแผ่นดิน = (งบแผ่นดิน + งบเงินรายได้) ÷ Q</FormulaEquation>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormulaEquation color='warning'>R ไม่รวมแผ่นดิน = งบเงินรายได้ ÷ Q</FormulaEquation>
        </Grid>
      </Grid>

      <Typography variant='body2' color='text.secondary'>
        แยกวิเคราะห์ 2 กรณีเพราะงบประมาณเงินแผ่นดินเป็น<b>เงินอุดหนุนจากรัฐ</b> ไม่ใช่รายได้ที่มหาวิทยาลัยหามาเอง
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        <b>รวมเงินแผ่นดิน</b> — สะท้อนสถานะการเงินตามจริง (งบที่ได้รับทั้งหมด) &nbsp;·&nbsp; <b>ไม่รวมเงินแผ่นดิน</b> —
        สะท้อนความสามารถพึ่งพาตนเอง หากถูกตัดงบอุดหนุนจะอยู่รอดหรือไม่
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        ต้นทุน (TFC, TVC, AVC) เท่ากันทั้ง 2 กรณี — เปลี่ยนเฉพาะฝั่งรายได้ ทำให้ CM และ Q* ต่างกัน
      </Typography>
    </FormulaCard>
  </Grid>
)

export default RevenueBasisFormula
