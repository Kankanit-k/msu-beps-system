'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ChartLegend from '@views/beps/shared/ChartLegend'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Util Imports
import { fmtDec, toMillions } from '@/utils/beps-format'

/**
 * แท่งซ้อน TFC + TVC รายคณะ — ย้ายจาก chart `cost-main` ของ mockup/assets/page-cost.js
 *
 * ต้นทุนไม่ขึ้นกับฐานรายได้ กราฟนี้จึงไม่อ่าน revenueMode — แต่ยังต้องเป็น client
 * component เพราะต้องรอ mount ก่อนวาด canvas และต้องอ่านสีจากธีมที่ resolve แล้ว
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const FacultyCostChart = ({ faculties }: Props) => {
  const palette = useChartPalette()
  const sorted = [...faculties].sort((a, b) => b.q - a.q)

  return (
    <Card className='bs-full'>
      <CardHeader title='โครงสร้างต้นทุนรายคณะ (TFC + TVC)' subheader='เรียงตามจำนวนนิสิต · หน่วยล้านบาท' />
      <CardContent>
        <ChartLegend
          items={[
            { label: 'ต้นทุนคงที่ (TFC)', color: palette.revenue },
            { label: 'ต้นทุนผันแปร (TVC)', color: palette.variable }
          ]}
        />
        <BepsChart
          type='bar'
          height={420}
          ariaLabel='กราฟแท่งซ้อนแสดงต้นทุนคงที่และต้นทุนผันแปรของแต่ละคณะ'
          data={{
            labels: sorted.map(f => f.shortName),
            datasets: [
              {
                label: 'ต้นทุนคงที่ (TFC)',
                data: sorted.map(f => toMillions(f.byMode.with_government.tfc)),
                backgroundColor: palette.revenue,
                borderRadius: 3,
                stack: 'cost'
              },
              {
                label: 'ต้นทุนผันแปร (TVC)',
                data: sorted.map(f => toMillions(f.byMode.with_government.tvc)),
                backgroundColor: palette.variable,
                borderRadius: 3,
                stack: 'cost'
              }
            ]
          }}
          options={{
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtDec(ctx.parsed.x)} ลบ.` } }
            },
            scales: {
              x: { stacked: true, grid: { color: palette.grid }, ticks: { color: palette.tick } },
              y: { stacked: true, grid: { display: false }, ticks: { color: palette.tick, font: { size: 9.5 } } }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default FacultyCostChart
