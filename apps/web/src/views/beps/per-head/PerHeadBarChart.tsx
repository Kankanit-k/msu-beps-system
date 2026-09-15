'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ChartLegend from '@views/beps/shared/ChartLegend'

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
 * แท่งกลุ่ม R · ATC · AVC รายคณะ — ย้ายจาก chart `ph-main` ของ
 * mockup/assets/page-perhead.js
 *
 * แกน X เป็น **ลำดับ** ไม่ใช่ชื่อคณะ เพราะ 20 ชื่อยาวๆ วางแนวนอนพร้อมกันไม่ได้
 * ชื่อจริงอยู่ใน tooltip และในตารางด้านล่าง (เหมือน mockup)
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const PerHeadBarChart = ({ faculties }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()
  const palette = useChartPalette()

  const rows = toPerHeadRows(faculties, revenueMode)
  const shown = rows.filter(row => row.faculty.q >= OUTLIER_MIN_Q)
  const excluded = rows.length - shown.length
  const revenueLabel = includesGovernment ? 'รายได้/หัว (R)' : 'รายได้/หัว (ไม่รวมแผ่นดิน)'

  return (
    <Card>
      <CardHeader
        title='รายได้/หัว เทียบ ต้นทุน/หัว รายคณะ'
        subheader='แกน X = ลำดับคณะ · แกน Y = บาท/คน · แท่งส้มสูงกว่าเขียว = ขาดทุนต่อหัว'
      />
      <CardContent>
        {excluded > 0 && (
          <Typography variant='caption' color='error.main' className='block mbe-2'>
            กราฟไม่รวม {excluded} หน่วยที่นิสิต &lt; {OUTLIER_MIN_Q} คน (ATC สูงผิดปกติ) — ดูในตารางด้านล่าง
          </Typography>
        )}

        <ChartLegend
          items={[
            { label: revenueLabel, color: palette.positive },
            { label: 'ต้นทุนรวม/หัว (ATC)', color: palette.variable },
            { label: 'ต้นทุนผันแปร/หัว (AVC)', color: palette.revenue }
          ]}
        />

        <BepsChart
          type='bar'
          height={330}
          ariaLabel='กราฟแท่งเปรียบเทียบรายได้ต่อหัว ต้นทุนรวมต่อหัว และต้นทุนผันแปรต่อหัวของแต่ละคณะ'
          data={{
            labels: shown.map((_, index) => `${index + 1}`),
            datasets: [
              {
                label: 'R',
                data: shown.map(row => Math.round(row.r)),
                backgroundColor: palette.positive,
                borderRadius: 3
              },
              {
                label: 'ATC',
                data: shown.map(row => Math.round(row.atc)),
                backgroundColor: palette.variable,
                borderRadius: 3
              },
              {
                label: 'AVC',
                data: shown.map(row => Math.round(row.avc)),
                backgroundColor: palette.revenue,
                borderRadius: 3
              }
            ]
          }}
          options={{
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: items => `ลำดับ ${items[0].dataIndex + 1} — ${shown[items[0].dataIndex].faculty.shortName}`,
                  label: ctx => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)} บ./คน`,
                  afterBody: items => {
                    const row = shown[items[0].dataIndex]

                    return [
                      '',
                      `นิสิต ${fmtInt(row.faculty.q)} คน`,
                      `${row.diff >= 0 ? '✓ กำไรต่อหัว +' : '⚠ ขาดทุนต่อหัว −'}${fmtInt(Math.abs(row.diff))} บ.`
                    ]
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { color: palette.grid },
                title: { display: true, text: 'ลำดับคณะ', color: palette.tick },
                ticks: { color: palette.tick, autoSkip: false, maxRotation: 0 }
              },
              y: {
                beginAtZero: true,
                grid: { color: palette.grid },
                title: { display: true, text: 'บาท/คน', color: palette.tick },
                ticks: { color: palette.tick, callback: value => `${fmtDec(Number(value) / 1000, 0)}k` }
              }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default PerHeadBarChart
