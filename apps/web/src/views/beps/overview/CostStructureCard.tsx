'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ShareRow from '@views/beps/shared/ShareRow'

// Type Imports
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtMillions, toMillions } from '@/utils/beps-format'

/**
 * โดนัทโครงสร้างต้นทุน TFC : TVC + รายการย่อย — ย้ายจาก `ov-donut` และ `ov-cost-list`
 * ของ mockup/assets/page-overview.js
 *
 * ต้นทุนไม่ขึ้นกับฐานรายได้ (สูตร 5 เปลี่ยนเฉพาะฝั่งรายได้) การ์ดนี้จึงไม่ต้องอ่าน
 * revenueMode จาก context — แต่ยังต้องเป็น client component เพราะกราฟวาดบน canvas
 */

type Props = {
  totals: UniversityTotals
}

const CostStructureCard = ({ totals }: Props) => {
  const palette = useChartPalette()
  const { tc, tfc, tvc } = totals.byMode.with_government

  return (
    <Card className='bs-full'>
      <CardHeader title='โครงสร้างต้นทุนรวม' subheader='คงที่ (TFC) เทียบ ผันแปร (TVC)' />
      <CardContent className='flex flex-col gap-4'>
        <BepsChart
          type='doughnut'
          height={210}
          ariaLabel={`สัดส่วนต้นทุนคงที่ ${fmtDec(totals.fixedCostShare)} เปอร์เซ็นต์ ต่อต้นทุนผันแปร ${fmtDec(totals.variableCostShare)} เปอร์เซ็นต์`}
          data={{
            labels: ['ต้นทุนคงที่ (TFC)', 'ต้นทุนผันแปร (TVC)'],
            datasets: [
              {
                data: [toMillions(tfc), toMillions(tvc)],
                backgroundColor: [palette.revenue, palette.variable],
                borderColor: palette.paper,
                borderWidth: 3
              }
            ]
          }}
          options={{
            cutout: '62%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx =>
                    `${ctx.label}: ${fmtDec(ctx.parsed)} ลบ. (${fmtDec((ctx.parsed / toMillions(tc)) * 100, 0)}%)`
                }
              }
            }
          }}
        />

        <div className='flex flex-col gap-2'>
          <ShareRow
            label='ต้นทุนคงที่ (TFC)'
            value={`${fmtMillions(tfc)} ลบ.`}
            share={`${fmtDec(totals.fixedCostShare, 0)}%`}
            color={palette.revenue}
          />
          <ShareRow
            label='ต้นทุนผันแปร (TVC)'
            value={`${fmtMillions(tvc)} ลบ.`}
            share={`${fmtDec(totals.variableCostShare, 0)}%`}
            color={palette.variable}
          />
          <ShareRow
            label='ค่าเสื่อมราคา (ใน TFC)'
            value={`${fmtMillions(totals.depreciation)} ลบ.`}
            share={`${fmtDec(tc > 0 ? (totals.depreciation / tc) * 100 : 0, 0)}%`}
            color={palette.positive}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default CostStructureCard
