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
 * แท่งซ้อนองค์ประกอบรายได้รายคณะ — ย้ายจาก chart `rev-main` ของ
 * mockup/assets/page-revenue.js
 *
 * แสดงเงินรายได้กับเงินแผ่นดินเป็นสองท่อนเสมอ ไม่ว่าจะเลือกฐานไหน เพราะประเด็นของกราฟนี้
 * คือ "คณะไหนพึ่งเงินแผ่นดินมากแค่ไหน" ซึ่งเป็นคำถามที่ต้องเห็นทั้งสองก้อนพร้อมกัน
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const RevenueCompositionChart = ({ faculties }: Props) => {
  const palette = useChartPalette()
  const sorted = [...faculties].sort((a, b) => b.q - a.q)

  return (
    <Card>
      <CardHeader title='องค์ประกอบรายได้รายคณะ' subheader='เงินแผ่นดิน + เงินรายได้ (ล้านบาท)' />
      <CardContent>
        <ChartLegend
          items={[
            { label: 'เงินรายได้ (ค่าธรรมเนียม)', color: palette.revenue },
            { label: 'เงินแผ่นดิน', color: palette.variable }
          ]}
        />
        <BepsChart
          type='bar'
          height={420}
          ariaLabel='กราฟแท่งซ้อนแสดงเงินรายได้และเงินแผ่นดินของแต่ละคณะ'
          data={{
            labels: sorted.map(f => f.shortName),
            datasets: [
              {
                label: 'เงินรายได้ (ค่าธรรมเนียม)',
                data: sorted.map(f => toMillions(f.incomeBudget)),
                backgroundColor: palette.revenue,
                borderRadius: 3,
                stack: 'revenue'
              },
              {
                label: 'เงินแผ่นดิน',
                data: sorted.map(f => toMillions(f.governmentBudget)),
                backgroundColor: palette.variable,
                borderRadius: 3,
                stack: 'revenue'
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

export default RevenueCompositionChart
