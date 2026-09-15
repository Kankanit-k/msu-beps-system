'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import { useColorScheme } from '@mui/material/styles'

// Third-party Imports
import { Chart as ChartJS, registerables } from 'chart.js'
import type { ChartData, ChartOptions, ChartType } from 'chart.js'
import { Chart } from 'react-chartjs-2'

// Theme Imports
import { bodyFontFamily } from '@core/theme/fonts'

/**
 * ตัวห่อ Chart.js ตัวเดียวของระบบ — ทุกกราฟในหน้าจอ BEPS ต้องผ่านที่นี่
 *
 * ทำไมต้องมี
 *
 * 1. **สีต้องมาจากธีม ไม่ใช่ฮาร์ดโค้ด** — mockup เก็บชุดสีไว้ที่ C ใน core.js:16-19
 *    (`#6d4cff`, `#ffb400`, …) ซึ่งเป็นค่าของโหมดสว่างเท่านั้น หน้าจอที่ย้ายมาต้องอ่านได้
 *    ทั้ง 2 โหมด (เกณฑ์ Verification ข้อ 7 ของแผน) สีจึงต้องมาจาก palette ของ MUI
 *
 * 2. **canvas ใช้ค่า CSS variable ตรงๆ ไม่ได้** — ธีมนี้เปิด `cssVariables` ไว้ ค่าที่ได้
 *    จาก `theme.palette.*.main` จึงเป็นสตริง `var(--mui-palette-…)` ซึ่ง Chart.js เอาไป
 *    ระบายลง canvas ไม่ได้ (ได้สีดำหรือโปร่งใสเงียบๆ) ต้องอ่านค่าที่ browser คำนวณแล้ว
 *    ด้วย getComputedStyle และอ่านใหม่ทุกครั้งที่สลับโหมดสี
 *
 * 3. **กราฟต้องรอ mount ก่อน** — canvas วาดบน server ไม่ได้ ถ้าปล่อยให้ render ฝั่ง server
 *    จะได้ hydration mismatch
 */

ChartJS.register(...registerables)

ChartJS.defaults.font.family = bodyFontFamily
ChartJS.defaults.font.size = 11

/** ชุดสีที่กราฟใช้ — ชื่อสื่อความหมายในโดเมน ไม่ใช่ชื่อสี */
export type ChartPalette = {
  /** รายได้ · ต้นทุนคงที่ — สีหลักของระบบ */
  revenue: string
  revenueDark: string
  /** ต้นทุนรวม · ค่าที่ต้องเฝ้าระวัง */
  cost: string
  /** ต้นทุนผันแปร · ค่ากลางๆ ที่ยังไม่สรุป */
  variable: string
  /** ผลเป็นบวก */
  positive: string
  /** ข้อมูลประกอบ */
  info: string
  /** เส้นตาราง */
  grid: string
  /** ตัวหนังสือบนแกน */
  tick: string
  /** พื้นการ์ด — ใช้เป็นเส้นคั่นของ doughnut */
  paper: string
}

const FALLBACK: ChartPalette = {
  revenue: '#6D4CFF',
  revenueDark: '#5938E0',
  cost: '#FF4C51',
  variable: '#FFB400',
  positive: '#56CA00',
  info: '#16B1FF',
  grid: 'rgba(46,38,61,.06)',
  tick: '#6F6880',
  paper: '#FFFFFF'
}

const VAR_NAMES: Record<keyof ChartPalette, string> = {
  revenue: '--mui-palette-primary-main',
  revenueDark: '--mui-palette-primary-dark',
  cost: '--mui-palette-error-main',
  variable: '--mui-palette-warning-main',
  positive: '--mui-palette-success-main',
  info: '--mui-palette-info-main',
  grid: '--mui-palette-divider',
  tick: '--mui-palette-text-secondary',
  paper: '--mui-palette-background-paper'
}

const readPalette = (): ChartPalette => {
  if (typeof window === 'undefined') return FALLBACK

  const computed = getComputedStyle(document.documentElement)

  const entries = Object.entries(VAR_NAMES).map(([key, cssVar]) => [
    key,
    computed.getPropertyValue(cssVar).trim() || FALLBACK[key as keyof ChartPalette]
  ])

  return Object.fromEntries(entries) as ChartPalette
}

/**
 * ชุดสีของกราฟ ณ โหมดสีปัจจุบัน
 *
 * `mode` จาก useColorScheme เปลี่ยน → อ่านค่าที่ browser คำนวณแล้วใหม่ทั้งชุด
 * (ค่าที่อ่านได้ตอน render แรกฝั่ง server เป็น FALLBACK เสมอ แต่กราฟไม่ถูกวาดจนกว่าจะ
 * mount อยู่แล้ว จึงไม่มีจังหวะที่ผู้ใช้เห็นสีผิด)
 */
export const useChartPalette = (): ChartPalette => {
  const { mode, systemMode } = useColorScheme()
  const [palette, setPalette] = useState<ChartPalette>(FALLBACK)

  useEffect(() => {
    setPalette(readPalette())
  }, [mode, systemMode])

  return palette
}

type BepsChartProps<TType extends ChartType> = {
  type: TType
  data: ChartData<TType>
  options?: ChartOptions<TType>
  /** ความสูงของกราฟเป็น px — Chart.js ต้องการกล่องที่สูงแน่นอน */
  height: number
  /** คำอธิบายกราฟสำหรับผู้ใช้ screen reader */
  ariaLabel: string
}

/**
 * กราฟหนึ่งกราฟ — รอ mount แล้วค่อยวาด ระหว่างนั้นกันที่ไว้ด้วย Skeleton ความสูงเท่ากัน
 * เพื่อไม่ให้หน้ากระโดดตอนกราฟโผล่
 */
const BepsChart = <TType extends ChartType>({ type, data, options, height, ariaLabel }: BepsChartProps<TType>) => {
  const [isMounted, setIsMounted] = useState(false)
  const palette = useChartPalette()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const mergedOptions = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        color: palette.tick,
        ...options
      }) as ChartOptions<TType>,
    [options, palette.tick]
  )

  return (
    <Box sx={{ blockSize: height, position: 'relative' }}>
      {isMounted ? (
        <Chart type={type} data={data} options={mergedOptions} aria-label={ariaLabel} role='img' />
      ) : (
        <Skeleton variant='rounded' height={height} />
      )}
    </Box>
  )
}

export default BepsChart
