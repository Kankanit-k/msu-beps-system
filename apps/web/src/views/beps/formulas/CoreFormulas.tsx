// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import { FormulaCard, FormulaEquation } from './FormulaCard'

// Util Imports
import { fmtDec } from '@/utils/beps-format'

/**
 * สูตร 1–4 — จุดคุ้มทุน · ต้นทุนรวม · กำไร/ขาดทุน · รายได้ ณ จุดคุ้มทุน
 *
 * ข้อความอธิบายย้ายมาจาก mockup/W10-method.html ตรงตัว ต่างกันตรงสัดส่วน TFC ที่
 * mockup พิมพ์ไว้ตายตัว — ที่นี่คำนวณจากชุดข้อมูลที่โหลดอยู่จริง
 */

type Props = {
  /** สัดส่วนต้นทุนคงที่ต่อต้นทุนรวม (ร้อยละ) */
  fixedCostShare: number
}

const CoreFormulas = ({ fixedCostShare }: Props) => (
  <>
    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-focus-3-line' title='สูตรที่ 1 — จุดคุ้มทุน'>
        <FormulaEquation>Q* = TFC ÷ ( R − AVC )</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          จุดคุ้มทุน (BEP) คือจำนวนนิสิตขั้นต่ำ Q* ที่ทำให้ TR = TC พอดี (π = 0) ส่วนต่าง (R − AVC) คือ{' '}
          <b>Contribution Margin (CM)</b> — รายได้ส่วนที่นำไปชดเชย TFC ยิ่ง CM สูง จุดคุ้มทุนยิ่งต่ำ
        </Typography>
      </FormulaCard>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-stack-line' title='สูตรที่ 2 — ต้นทุนรวม'>
        <FormulaEquation>TC = TFC + ( AVC × Q )</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          ต้นทุนรวมมี 2 ส่วน คือ TFC (ไม่เปลี่ยนตาม Q) และ TVC = AVC × Q (แปรผันตาม Q) มมส. มีสัดส่วน TFC สูงถึง{' '}
          <b>{fmtDec(fixedCostShare)}%</b> ทำให้ ATC ลดลงเมื่อ Q เพิ่ม (<b>Economies of Scale</b>)
        </Typography>
      </FormulaCard>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-line-chart-line' title='สูตรที่ 3 — กำไร / ขาดทุน'>
        <FormulaEquation>π = TR − TC = (R − AVC) × Q − TFC</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          ส่วนเกิน/ขาดทุน (π): เมื่อ Q &gt; Q* กำไรเพิ่มในอัตรา CM ต่อหน่วย · เมื่อ Q &lt; Q* จะขาดทุน
        </Typography>
      </FormulaCard>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <FormulaCard icon='ri-money-dollar-circle-line' title='สูตรที่ 4 — รายได้ ณ จุดคุ้มทุน'>
        <FormulaEquation>BE Revenue = Q* × R</FormulaEquation>
        <Typography variant='body2' color='text.secondary'>
          รายได้ขั้นต่ำเพื่อไม่ขาดทุน ใช้วางแผนงบประมาณและกำหนดเป้ารับนิสิต · <b>Margin of Safety</b> = TR จริง − BE Rev
          — ยิ่งกว้างยิ่งมั่นคง
        </Typography>
      </FormulaCard>
    </Grid>
  </>
)

export default CoreFormulas
