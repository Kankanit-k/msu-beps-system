'use client'

// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult } from '@beps/calc-engine'

import type { BreakEvenStatus } from '@/server/beps/status'

// Data Imports
import { statusColor } from '@/server/beps/status'

// Util Imports
import { fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * หนึ่งแถวของต้นไม้ W2 — แทน .tree-row ของ mockup (beps.css)
 *
 * ทั้ง 3 ระดับใช้คอลัมน์ชุดเดียวกัน ต่างกันแค่ระยะเยื้องและน้ำหนักตัวอักษร เพื่อให้
 * เปรียบเทียบตัวเลขข้ามระดับได้ด้วยสายตาเดียว (เป็นเหตุผลที่ mockup ใช้ grid ไม่ใช่ table
 * ซ้อนกัน) — ที่นี่จึงใช้ CSS grid คอลัมน์เดียวกับหัวตาราง
 */

export const TREE_COLUMNS = 'minmax(240px, 2.4fr) repeat(6, minmax(76px, 1fr)) minmax(92px, 1fr)'

const statusText: Record<BreakEvenStatus, string> = {
  ok: 'คุ้มทุน',
  below: 'ยังไม่คุ้ม',
  no_breakeven: 'R ≤ AVC'
}

type Props = {
  /** 0 = คณะ · 1 = ระดับการศึกษา · 2 = หลักสูตร */
  depth: 0 | 1 | 2
  label: ReactNode
  result: BreakEvenResult
  status: BreakEvenStatus
  onClick?: () => void
}

const TreeRow = ({ depth, label, result, status, onClick }: Props) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'grid',
      gridTemplateColumns: TREE_COLUMNS,
      alignItems: 'center',
      gap: 2,
      paddingBlock: 2,
      paddingInline: 4,
      borderBlockEnd: '1px solid',
      borderColor: 'divider',
      cursor: onClick ? 'pointer' : 'default',
      backgroundColor: depth === 0 ? 'action.hover' : 'transparent',
      '&:hover': onClick ? { backgroundColor: 'action.selected' } : undefined
    }}
  >
    <Box sx={{ paddingInlineStart: depth * 6, minInlineSize: 0 }}>
      <Typography
        component='div'
        variant={depth === 2 ? 'body2' : 'body1'}
        noWrap
        sx={{ fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400 }}
      >
        {label}
      </Typography>
    </Box>

    <Typography variant='body2' align='right'>
      {fmtInt(result.q)}
    </Typography>
    <Typography variant='body2' align='right'>
      {result.qStar === null ? '—' : fmtInt(result.qStar)}
    </Typography>
    <Typography variant='body2' align='right'>
      {result.r === null ? '—' : fmtInt(result.r)}
    </Typography>
    <Typography variant='body2' align='right' color='text.disabled'>
      {result.avc === null ? '—' : fmtInt(result.avc)}
    </Typography>
    <Typography variant='body2' align='right'>
      {fmtMillions(result.tr)}
    </Typography>
    <Typography
      variant='body2'
      align='right'
      color={result.profit >= 0 ? 'success.main' : 'error.main'}
      sx={{ fontWeight: 700 }}
    >
      {withSign(result.profit, fmtMillions)}
    </Typography>

    <Box sx={{ textAlign: 'end' }}>
      <Chip size='small' variant='tonal' color={statusColor[status]} label={statusText[status]} />
    </Box>
  </Box>
)

export default TreeRow
