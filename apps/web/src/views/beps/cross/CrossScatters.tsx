'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Chart Imports
import type { RevenueMode } from '@beps/calc-engine'

import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { CrossMetrics } from '@/server/beps/cross'

// Util Imports
import { fmtDec, fmtInt } from '@/utils/beps-format'

/**
 * scatter 2 ชุด + quadrant bubble — ย้ายจาก `cross-scatter1/2` และ `cross-bubble`
 * ของ mockup/assets/page-cross.js
 *
 * ทั้งสามกราฟกัน **คณะที่ CM ≤ 0 ออก** เพราะไม่มี Q* ให้วางบนแกน แต่คณะเหล่านั้นยังอยู่
 * ในตารางและในข้อสังเกตเสมอ (ไม่ใช่การซ่อนข้อมูล)
 */

type Props = {
  byMode: Record<RevenueMode, CrossMetrics[]>
}

const CrossScatters = ({ byMode }: Props) => {
  const { revenueMode } = useBeps()
  const palette = useChartPalette()

  const all = byMode[revenueMode]
  const rows = all.filter(row => row.hasBreakEven)
  const excluded = all.length - rows.length

  const pointColors = rows.map(row => (row.isOk ? palette.positive : palette.cost))
  const maxTr = Math.max(...rows.map(row => row.trMillions)) || 1

  const axis = (text: string) => ({ display: true, text, color: palette.tick })
  const grid = { color: palette.grid }
  const ticks = { color: palette.tick }

  return (
    <>
      {excluded > 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography variant='caption' color='error.main'>
            กราฟไม่รวม {excluded} คณะที่ CM ≤ 0 (ไม่มีจุดคุ้มทุน) — ดูในตารางจัดอันดับด้านล่าง
          </Typography>
        </Grid>
      )}

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card className='bs-full'>
          <CardHeader title='Q* เทียบ กำไร %' subheader='คณะที่จุดคุ้มทุนสูงแต่กำไรต่ำ = เสี่ยงที่สุด' />
          <CardContent>
            <BepsChart
              type='scatter'
              height={300}
              ariaLabel='แผนภาพกระจายจุดคุ้มทุนเทียบกำไรเป็นร้อยละ'
              data={{
                datasets: [
                  {
                    data: rows.map(row => ({ x: row.qStar, y: row.profitPct })),
                    backgroundColor: pointColors,
                    borderColor: pointColors,
                    borderWidth: 1.5,
                    pointRadius: 7,
                    pointHoverRadius: 9
                  }
                ]
              }}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: ctx =>
                        `${rows[ctx.dataIndex].shortName}: Q* = ${fmtInt(rows[ctx.dataIndex].qStar)} คน, กำไร ${
                          rows[ctx.dataIndex].profitPct >= 0 ? '+' : ''
                        }${rows[ctx.dataIndex].profitPct}%`
                    }
                  }
                },
                scales: {
                  x: { title: axis('Q* จุดคุ้มทุน (คน)'), grid, ticks },
                  y: {
                    title: axis('กำไร %'),
                    grid,
                    ticks: { color: palette.tick, callback: value => `${Number(value) >= 0 ? '+' : ''}${value}%` }
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card className='bs-full'>
          <CardHeader
            title='AVC/R เทียบ Utilization'
            subheader='แกน X ต่ำ = ต้นทุนผันแปรกินรายได้น้อย · แกน Y สูง = นิสิตถึงจุดคุ้มทุนแล้ว'
          />
          <CardContent>
            <BepsChart
              type='scatter'
              height={300}
              ariaLabel='แผนภาพกระจายสัดส่วนต้นทุนผันแปรต่อรายได้เทียบอัตราการใช้กำลังผลิต'
              data={{
                datasets: [
                  {
                    data: rows.map(row => ({ x: row.avcToRevenue, y: row.utilization })),
                    backgroundColor: pointColors,
                    borderColor: pointColors,
                    borderWidth: 1.5,
                    pointRadius: 7,
                    pointHoverRadius: 9
                  }
                ]
              }}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: ctx =>
                        `${rows[ctx.dataIndex].shortName}: AVC/R = ${rows[ctx.dataIndex].avcToRevenue}%, Util = ${
                          rows[ctx.dataIndex].utilization
                        }%`
                    }
                  }
                },
                scales: {
                  x: {
                    title: axis('AVC/R Ratio (%) — ต่ำ = ดี'),
                    grid,
                    ticks: { color: palette.tick, callback: value => `${value}%` }
                  },
                  y: {
                    title: axis('Utilization Q/Q* (%)'),
                    grid,
                    ticks: { color: palette.tick, callback: value => `${value}%` }
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Quadrant — Utilization เทียบ กำไร %'
            subheader='ขนาดฟอง = รายได้รวม · ขวาบน ⭐ Stars · ซ้ายบน 🔄 Recover · ขวาล่าง 📈 Growth · ซ้ายล่าง ⚠️ Risk'
          />
          <CardContent>
            <BepsChart
              type='bubble'
              height={360}
              ariaLabel='แผนภาพฟองแบ่งคณะเป็นสี่กลุ่มตามอัตราการใช้กำลังผลิตและกำไร'
              data={{
                datasets: rows.map(row => ({
                  label: row.shortName,
                  data: [{ x: row.utilization, y: row.profitPct, r: Math.max(5, (row.trMillions / maxTr) * 35) }],
                  backgroundColor: row.isOk ? palette.revenue : palette.cost,
                  borderColor: row.isOk ? palette.revenueDark : palette.cost,
                  borderWidth: 1.5
                }))
              }}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: ctx => {
                        const row = rows.find(x => x.shortName === ctx.dataset.label)

                        if (!row) return ctx.dataset.label ?? ''

                        return `${row.shortName}: Util = ${row.utilization}%, กำไร ${
                          row.profitPct >= 0 ? '+' : ''
                        }${row.profitPct}%, TR = ${fmtDec(row.trMillions)} ลบ.`
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    title: axis('Utilization Q/Q* (%)'),
                    grid,
                    ticks: { color: palette.tick, callback: value => `${value}%` }
                  },
                  y: {
                    title: axis('กำไร % (Profit Margin)'),
                    grid,
                    ticks: { color: palette.tick, callback: value => `${Number(value) >= 0 ? '+' : ''}${value}%` }
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default CrossScatters
