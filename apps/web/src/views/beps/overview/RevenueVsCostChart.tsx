'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ChartLegend from '@views/beps/shared/ChartLegend'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Util Imports
import { fmtDec, toMillions } from '@/utils/beps-format'

/**
 * แท่งนอน TR เทียบ TC รายคณะ — ย้ายจาก chart `ov-main` ของ mockup/assets/page-overview.js
 *
 * เรียงตามจำนวนนิสิตมากไปน้อย (เหมือน mockup) เพื่อให้อ่านได้ว่าคณะใหญ่อยู่บนสุด
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const RevenueVsCostChart = ({ faculties }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()
  const palette = useChartPalette()

  const sorted = [...faculties].sort((a, b) => b.q - a.q)
  const revenueLabel = includesGovernment ? 'รายได้รวม (TR)' : 'เงินรายได้'

  return (
    <Card className='bs-full'>
      <CardHeader title='รายได้ (TR) เทียบ ต้นทุน (TC) รายคณะ' subheader='เรียงตามจำนวนนิสิต · หน่วยล้านบาท' />
      <CardContent>
        <ChartLegend
          items={[
            { label: revenueLabel, color: palette.revenue },
            { label: 'ต้นทุนรวม (TC)', color: palette.cost }
          ]}
        />
        <BepsChart
          type='bar'
          height={430}
          ariaLabel={`กราฟแท่งเปรียบเทียบ${revenueLabel}กับต้นทุนรวมของแต่ละคณะ`}
          data={{
            labels: sorted.map(f => f.shortName),
            datasets: [
              {
                label: revenueLabel,
                data: sorted.map(f => toMillions(f.byMode[revenueMode].tr)),
                backgroundColor: palette.revenue,
                borderRadius: 4,
                barPercentage: 0.82,
                categoryPercentage: 0.9
              },
              {
                label: 'ต้นทุนรวม (TC)',
                data: sorted.map(f => toMillions(f.byMode[revenueMode].tc)),
                backgroundColor: palette.cost,
                borderRadius: 4,
                barPercentage: 0.82,
                categoryPercentage: 0.9
              }
            ]
          }}
          options={{
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => `${ctx.dataset.label}: ${fmtDec(ctx.parsed.x)} ลบ.`
                }
              }
            },
            scales: {
              x: { grid: { color: palette.grid }, ticks: { color: palette.tick } },
              y: { grid: { display: false }, ticks: { color: palette.tick, font: { size: 9.5 } } }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default RevenueVsCostChart
