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
 * ต้นทุนคงที่แยกองค์ประกอบ — ย้ายจาก `cost-donut` / `cost-list` ของ
 * mockup/assets/page-cost.js
 *
 * สามก้อนนี้รวมกันเป็น TFC: ต้นทุนที่ผูกหลักสูตรได้ตรงๆ · ส่วนที่ปันส่วนมาจากสำนักงาน ·
 * ค่าเสื่อมราคา — สัดส่วนคิดเทียบ TFC ไม่ใช่ TC (ตรงกับ mockup)
 */

type Props = {
  totals: UniversityTotals
}

const FixedCostBreakdown = ({ totals }: Props) => {
  const palette = useChartPalette()
  const { tfc } = totals.byMode.with_government
  const share = (v: number) => (tfc > 0 ? (v / tfc) * 100 : 0)

  const parts = [
    { label: 'ต้นทุนหลักสูตร (ตรง)', value: totals.fixedCostProgram, color: palette.revenue },
    { label: 'ปันส่วนสำนักงานเลขาฯ', value: totals.fixedCostOffice, color: palette.variable },
    { label: 'ค่าเสื่อมราคา', value: totals.depreciation, color: palette.positive }
  ]

  return (
    <Card className='bs-full'>
      <CardHeader title='ต้นทุนคงที่รวม แยกองค์ประกอบ' subheader={`TFC ${fmtMillions(tfc)} ล้านบาท`} />
      <CardContent className='flex flex-col gap-4'>
        <BepsChart
          type='doughnut'
          height={210}
          ariaLabel='สัดส่วนองค์ประกอบของต้นทุนคงที่'
          data={{
            labels: parts.map(p => p.label),
            datasets: [
              {
                data: parts.map(p => toMillions(p.value)),
                backgroundColor: parts.map(p => p.color),
                borderColor: palette.paper,
                borderWidth: 3
              }
            ]
          }}
          options={{
            cutout: '60%',
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmtDec(ctx.parsed)} ลบ.` } }
            }
          }}
        />

        <div className='flex flex-col gap-2'>
          {parts.map(part => (
            <ShareRow
              key={part.label}
              label={part.label}
              value={`${fmtMillions(part.value)} ลบ.`}
              share={`${fmtDec(share(part.value), 0)}%`}
              color={part.color}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default FixedCostBreakdown
