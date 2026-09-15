'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Data Imports
import { OUTLIER_MIN_Q } from '@/server/beps/faculties'

// Util Imports
import { toPerHeadRows } from './rows'
import { fmtDec, fmtInt } from '@/utils/beps-format'

/**
 * แผนภาพประสิทธิภาพ R เทียบ ATC — ย้ายจาก chart `ph-scatter` ของ
 * mockup/assets/page-perhead.js
 *
 * จุดที่อยู่ **เหนือ** เส้นทแยง (R = ATC) คือคณะที่รายได้ต่อหัวคุ้มต้นทุนต่อหัว
 * ขนาดจุดแทนจำนวนนิสิต — ใช้รากที่สองของสัดส่วนเพื่อให้ "พื้นที่" ของจุดแปรตามจำนวนนิสิต
 * ไม่ใช่รัศมี (ถ้าใช้รัศมีตรงๆ คณะใหญ่จะดูใหญ่เกินจริงหลายเท่า)
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const EfficiencyScatter = ({ faculties }: Props) => {
  const { revenueMode } = useBeps()
  const palette = useChartPalette()

  const rows = toPerHeadRows(faculties, revenueMode).filter(row => row.faculty.q >= OUTLIER_MIN_Q)
  const maxValue = Math.max(...rows.map(row => Math.max(row.r, row.atc))) * 1.08
  const maxQ = Math.max(...rows.map(row => row.faculty.q))

  return (
    <Card className='bs-full'>
      <CardHeader
        title='แผนภาพประสิทธิภาพ — R เทียบ ATC'
        subheader='เหนือเส้นทแยง = คุ้มทุน · ใต้เส้น = ขาดทุน · ขนาดจุด = จำนวนนิสิต'
      />
      <CardContent>
        <BepsChart
          type='bubble'
          height={320}
          ariaLabel='แผนภาพฟองแสดงรายได้ต่อหัวเทียบต้นทุนรวมต่อหัวของแต่ละคณะ'
          data={{
            datasets: [
              ...rows.map(row => ({
                label: row.faculty.name,
                data: [
                  {
                    x: Math.round(row.atc),
                    y: Math.round(row.r),
                    r: Math.max(4, Math.sqrt(row.faculty.q / maxQ) * 18)
                  }
                ],
                backgroundColor: row.diff >= 0 ? palette.positive : palette.cost,
                borderColor: row.diff >= 0 ? palette.positive : palette.cost,
                borderWidth: 1.5
              })),
              {
                label: 'เส้นคุ้มทุน (R = ATC)',
                type: 'line' as const,
                data: [
                  { x: 0, y: 0 },
                  { x: maxValue, y: maxValue }
                ],
                borderColor: palette.tick,
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false
              }
            ]
          }}
          options={{
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => {
                    const row = rows.find(x => x.faculty.name === ctx.dataset.label)

                    if (!row) return ctx.dataset.label ?? ''

                    return [
                      row.faculty.shortName,
                      `R = ${fmtInt(row.r)} | ATC = ${fmtInt(row.atc)}`,
                      `${row.diff >= 0 ? '✓ +' : '⚠ −'}${fmtInt(Math.abs(row.diff))} บ./คน · ${fmtInt(row.faculty.q)} คน`
                    ]
                  }
                }
              }
            },
            scales: {
              x: {
                min: 0,
                max: maxValue,
                grid: { color: palette.grid },
                title: { display: true, text: 'ต้นทุน/หัว ATC (บาท) →', color: palette.tick },
                ticks: { color: palette.tick, callback: value => `${fmtDec(Number(value) / 1000, 0)}k` }
              },
              y: {
                min: 0,
                max: maxValue,
                grid: { color: palette.grid },
                title: { display: true, text: 'รายได้/หัว R (บาท) →', color: palette.tick },
                ticks: { color: palette.tick, callback: value => `${fmtDec(Number(value) / 1000, 0)}k` }
              }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default EfficiencyScatter
