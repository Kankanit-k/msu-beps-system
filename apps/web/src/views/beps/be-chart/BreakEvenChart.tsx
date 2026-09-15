'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Chart Imports
import type { BreakEvenResult } from '@beps/calc-engine'

import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ChartLegend from '@views/beps/shared/ChartLegend'

// Type Imports

// Util Imports
import { fmtDec, fmtInt, toMillions } from '@/utils/beps-format'

/**
 * แผนภาพจุดคุ้มทุน — ย้ายจาก chart `ch-be` ของ mockup/assets/page-chart.js
 *
 * เส้น TR (ผ่านจุดกำเนิด ชัน = R) ตัดกับเส้น TC (ตัดแกน Y ที่ TFC ชัน = AVC) ที่ Q*
 * ช่วงแกน X กว้างกว่าจุดที่ไกลที่สุด (Q หรือ Q*) 35% เพื่อให้เห็นจุดตัดโดยไม่ชิดขอบ
 */

type Props = {
  result: BreakEvenResult
}

const BreakEvenChart = ({ result }: Props) => {
  const palette = useChartPalette()

  const { tfc, q, qStar } = result
  const r = result.r ?? 0
  const avc = result.avc ?? 0
  /* ปัดเป็นจำนวนเต็มเพื่อไม่ให้ tick สุดท้ายของแกน X กลายเป็นเศษคน เช่น 5,987.3 */
  const xMax = Math.ceil(Math.max(q, qStar ?? 0) * 1.35) || 100

  return (
    <Card className='bs-full'>
      <CardHeader title='แผนภาพจุดคุ้มทุน (Break-Even Chart)' />
      <CardContent>
        <ChartLegend
          items={[
            { label: 'รายได้รวม (TR)', color: palette.revenue },
            { label: 'ต้นทุนรวม (TC)', color: palette.cost },
            { label: 'ต้นทุนคงที่ (TFC)', color: palette.variable }
          ]}
        />
        <BepsChart
          type='line'
          height={360}
          ariaLabel='กราฟเส้นรายได้รวมตัดกับต้นทุนรวม จุดตัดคือจุดคุ้มทุน'
          data={{
            datasets: [
              {
                label: 'TR',
                data: [
                  { x: 0, y: 0 },
                  { x: xMax, y: toMillions(r * xMax) }
                ],
                borderColor: palette.revenue,
                borderWidth: 2.5,
                pointRadius: 0,
                fill: false
              },
              {
                label: 'TC',
                data: [
                  { x: 0, y: toMillions(tfc) },
                  { x: xMax, y: toMillions(tfc + avc * xMax) }
                ],
                borderColor: palette.cost,
                borderWidth: 2.5,
                pointRadius: 0,
                fill: false
              },
              {
                label: 'TFC',
                data: [
                  { x: 0, y: toMillions(tfc) },
                  { x: xMax, y: toMillions(tfc) }
                ],
                borderColor: palette.variable,
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0
              },
              ...(qStar !== null
                ? [
                    {
                      label: 'จุดคุ้มทุน',
                      data: [{ x: qStar, y: toMillions(r * qStar) }],
                      borderColor: palette.positive,
                      backgroundColor: palette.positive,
                      pointRadius: 6,
                      pointStyle: 'rectRot' as const,
                      showLine: false
                    }
                  ]
                : []),
              {
                label: 'ปัจจุบัน',
                data: [{ x: q, y: toMillions(r * q) }],
                borderColor: palette.revenueDark,
                backgroundColor: palette.paper,
                pointRadius: 6,
                pointBorderWidth: 2,
                showLine: false
              }
            ]
          }}
          options={{
            parsing: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: items => `นิสิต ${fmtInt(items[0].parsed.x)} คน`,
                  label: ctx => `${ctx.dataset.label}: ${fmtDec(ctx.parsed.y)} ลบ.`
                }
              }
            },
            scales: {
              x: {
                type: 'linear',
                min: 0,
                max: xMax,
                grid: { color: palette.grid },
                title: { display: true, text: 'จำนวนนิสิต (คน)', color: palette.tick },
                ticks: { color: palette.tick }
              },
              y: {
                grid: { color: palette.grid },
                title: { display: true, text: 'มูลค่า (ล้านบาท)', color: palette.tick },
                ticks: { color: palette.tick }
              }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default BreakEvenChart
