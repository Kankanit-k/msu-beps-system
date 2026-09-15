'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Type Imports
import type { AllocationMethod } from '@/server/beps/reconciliation'

// Util Imports
import { fmtDec, toMillions } from '@/utils/beps-format'

/**
 * ต้นทุนที่ปันส่วนแยกตามวิธี — ย้ายจาก chart `m-chart` ของ mockup/W12-reconciliation.html
 *
 * วิธีที่ใช้กำหนดจากกติกาผังบัญชี (W14) — วิธีที่แม่นน้อยกว่า (PROGRAM_SHARE)
 * ควรมีสัดส่วนน้อยที่สุด เพราะเป็นการประมาณการที่ทำให้หลักสูตรเล็กรับภาระสูงผิดปกติ
 */

type Props = {
  methods: AllocationMethod[]
  total: number
}

const MethodChart = ({ methods, total }: Props) => {
  const palette = useChartPalette()

  /* สีของแต่ละวิธีมาจาก palette ของธีมตามลำดับที่ fixture เรียงไว้
     (ตรง → ใช้จริง → จำนวนนิสิต → สัดส่วนหลักสูตร) ไม่ใช้ค่าสีดิบที่ฝังมากับ fixture */
  const colors = [palette.positive, palette.revenue, palette.variable, palette.cost]

  return (
    <Card>
      <CardHeader
        title='ต้นทุนที่ปันส่วน แยกตามวิธี'
        subheader='วิธีที่ใช้กำหนดจากกติกาผังบัญชี (W14) · วิธีที่แม่นน้อยกว่าควรมีสัดส่วนน้อยที่สุด'
      />
      <CardContent>
        <BepsChart
          type='bar'
          height={230}
          ariaLabel='กราฟแท่งแสดงต้นทุนแยกตามวิธีปันส่วน'
          data={{
            labels: methods.map(m => m.label),
            datasets: [
              {
                data: methods.map(m => toMillions(m.amount)),
                backgroundColor: methods.map((_, index) => colors[index % colors.length]),
                borderRadius: 5,
                barPercentage: 0.6
              }
            ]
          }}
          options={{
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => `${fmtDec(ctx.parsed.x)} ลบ. (${fmtDec((ctx.parsed.x / toMillions(total)) * 100)}%)`
                }
              }
            },
            scales: {
              x: {
                grid: { color: palette.grid },
                ticks: { color: palette.tick },
                title: { display: true, text: 'ล้านบาท', color: palette.tick }
              },
              y: { grid: { display: false }, ticks: { color: palette.tick, font: { size: 10.5 } } }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default MethodChart
