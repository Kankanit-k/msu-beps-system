'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

// Chart Imports
import { useChartPalette } from '@/libs/ChartJs'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { toPerHeadRows } from './rows'
import { fmtDec, fmtInt } from '@/utils/beps-format'

/**
 * ต้นทุน/หัว สูงสุด 8 อันดับ — ย้ายจาก `ph-topbar` ของ mockup/assets/page-perhead.js
 *
 * นับเฉพาะคณะที่มีนิสิตเกิน 50 คน (เกณฑ์ของ mockup) เพราะหน่วยเล็กมากจะติดอันดับ
 * ด้วยเหตุผลทางคณิตศาสตร์ล้วนๆ ไม่ได้บอกอะไรเรื่องประสิทธิภาพ
 * ตัวคูณ "×" เทียบกับ ATC เฉลี่ยทั้งมหาวิทยาลัย
 */

const MIN_Q = 50
const TOP_N = 8

type Props = {
  faculties: FacultyBreakEven[]
  totals: UniversityTotals
}

const TopCostBars = ({ faculties, totals }: Props) => {
  const { revenueMode } = useBeps()
  const palette = useChartPalette()

  /* ไล่เฉดตามอันดับ — แดงคือแพงสุด ไล่ไปเหลืองและม่วง (ชุดเดียวกับที่ mockup ใช้) */
  const barColors = [
    palette.cost,
    palette.cost,
    palette.variable,
    palette.variable,
    palette.revenue,
    palette.revenue,
    palette.positive,
    palette.revenueDark
  ]

  const averageAtc = totals.byMode[revenueMode].atc ?? 0

  const top = toPerHeadRows(faculties, revenueMode)
    .filter(row => row.faculty.q > MIN_Q)
    .sort((a, b) => b.atc - a.atc)
    .slice(0, TOP_N)

  const max = top[0]?.atc || 1

  return (
    <Card className='bs-full'>
      <CardHeader title={`ต้นทุน/หัว สูงสุด (Top ${TOP_N})`} subheader='เทียบกับค่าเฉลี่ยมหาวิทยาลัย' />
      <CardContent className='flex flex-col gap-4'>
        {top.map((row, index) => (
          <Box key={row.faculty.name} className='flex flex-col gap-1'>
            <div className='flex justify-between items-baseline gap-2'>
              <Typography variant='body2' noWrap title={row.faculty.name}>
                {row.faculty.shortName}
              </Typography>
              <Typography variant='body2' sx={{ color: barColors[index], fontWeight: 700, whiteSpace: 'nowrap' }}>
                {fmtInt(row.atc)}{' '}
                <Typography component='span' variant='caption' color='text.disabled'>
                  {averageAtc > 0 ? `${fmtDec(row.atc / averageAtc)}×` : ''}
                </Typography>
              </Typography>
            </div>
            <LinearProgress
              variant='determinate'
              value={(row.atc / max) * 100}
              sx={{ blockSize: 6, '& .MuiLinearProgress-bar': { backgroundColor: barColors[index] } }}
            />
          </Box>
        ))}
      </CardContent>
    </Card>
  )
}

export default TopCostBars
