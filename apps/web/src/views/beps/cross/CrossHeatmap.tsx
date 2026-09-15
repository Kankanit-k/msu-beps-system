'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Context Imports
import type { RevenueMode } from '@beps/calc-engine'

import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { CrossMetrics } from '@/server/beps/cross'

// Util Imports
import { HEATMAP_METRICS, heatmapColor } from './metrics'

/**
 * Heatmap ตัวชี้วัด 9 ตัว × ทุกคณะ — ย้ายจาก `heatmap-container` ของ
 * mockup/assets/page-cross.js
 *
 * สีไล่ตามอันดับ **ภายในคอลัมน์** ไม่ใช่ข้ามคอลัมน์ เพราะแต่ละตัวชี้วัดคนละหน่วยคนละสเกล
 * ตัวหนังสือในเซลล์ใช้สีเข้มคงที่ (ไม่ใช้สีจากธีม) เพราะพื้นเซลล์เป็นสีอ่อนคงที่ทั้งสองโหมด
 */

type Props = {
  byMode: Record<RevenueMode, CrossMetrics[]>
}

const CrossHeatmap = ({ byMode }: Props) => {
  const { revenueMode } = useBeps()
  const rows = byMode[revenueMode]

  const columns = Object.fromEntries(
    HEATMAP_METRICS.map(metric => [metric.key, rows.map(row => row[metric.key] as number)])
  ) as Record<string, number[]>

  return (
    <Card>
      <CardHeader
        title='Heatmap ตัวชี้วัด 9 ตัว'
        subheader='สีไล่ตามอันดับภายในคอลัมน์ · เขียว = ดีในตัวชี้วัดนั้น · แดง = ต้องเฝ้าระวัง'
      />
      <CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component='table' sx={{ borderCollapse: 'separate', borderSpacing: 2, minInlineSize: 900 }}>
            <thead>
              <tr>
                <Box
                  component='th'
                  sx={{
                    textAlign: 'start',
                    paddingInlineEnd: 3,
                    position: 'sticky',
                    insetInlineStart: 0,
                    backgroundColor: 'background.paper'
                  }}
                >
                  <Typography variant='caption' sx={{ fontWeight: 700 }}>
                    คณะ / วิทยาลัย
                  </Typography>
                </Box>
                {HEATMAP_METRICS.map(metric => (
                  <Box
                    key={metric.key}
                    component='th'
                    sx={{ paddingInline: 1 }}
                    title={`${metric.label} (${metric.unit})`}
                  >
                    <Typography variant='caption' sx={{ fontWeight: 700, display: 'block' }}>
                      {metric.label}
                    </Typography>
                    <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.625rem' }}>
                      {metric.unit}
                    </Typography>
                  </Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.name}>
                  <Box
                    component='td'
                    sx={{
                      paddingInlineEnd: 3,
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      insetInlineStart: 0,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <div className='flex items-center gap-2'>
                      <Typography
                        component='i'
                        className={row.isOk ? 'ri-check-line' : 'ri-error-warning-line'}
                        color={row.isOk ? 'success.main' : 'error.main'}
                        sx={{ fontSize: 14 }}
                      />
                      <Typography variant='caption' sx={{ fontWeight: 700 }}>
                        {row.shortName}
                      </Typography>
                    </div>
                  </Box>
                  {HEATMAP_METRICS.map(metric => {
                    const value = row[metric.key] as number

                    return (
                      <Box
                        key={metric.key}
                        component='td'
                        title={`${row.name}: ${metric.label} = ${metric.format(value)}`}
                        sx={{
                          backgroundColor: heatmapColor(value, metric, columns[metric.key]),
                          color: '#334155',
                          textAlign: 'center',
                          paddingBlock: 1.5,
                          paddingInline: 2,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {metric.format(value)}
                      </Box>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default CrossHeatmap
