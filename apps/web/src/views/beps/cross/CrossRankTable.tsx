'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Style Imports
import type { RevenueMode } from '@beps/calc-engine'

import tableStyles from '@core/styles/table.module.css'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { CrossMetrics } from '@/server/beps/cross'

// Util Imports
import { fmtDec, fmtInt, withSign } from '@/utils/beps-format'

/**
 * ตารางจัดอันดับที่สลับเกณฑ์ได้ — ย้ายจาก sortCross() ของ mockup/assets/page-cross.js
 *
 * เกณฑ์ AVC/R และ TFC/TC เรียง **จากน้อยไปมาก** เพราะยิ่งต่ำยิ่งดี ส่วนเกณฑ์อื่นเรียง
 * จากมากไปน้อย — ถ้าเรียงทิศเดียวกันหมด อันดับ 1 ของบางเกณฑ์จะกลายเป็นคณะที่แย่ที่สุด
 */

type SortKey = 'profitPct' | 'utilization' | 'cm' | 'avcToRevenue' | 'fixedShare' | 'q' | 'profitMillions'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'profitPct', label: 'กำไร %' },
  { value: 'utilization', label: 'Utilization' },
  { value: 'cm', label: 'CM/หัว' },
  { value: 'profitMillions', label: 'ส่วนเกิน (ลบ.)' },
  { value: 'q', label: 'จำนวนนิสิต' },
  { value: 'avcToRevenue', label: 'AVC/R (น้อยไปมาก)' },
  { value: 'fixedShare', label: 'TFC/TC (น้อยไปมาก)' }
]

const ASCENDING: SortKey[] = ['avcToRevenue', 'fixedShare']

type Props = {
  byMode: Record<RevenueMode, CrossMetrics[]>
}

const CrossRankTable = ({ byMode }: Props) => {
  const { revenueMode } = useBeps()
  const [sortKey, setSortKey] = useState<SortKey>('profitPct')

  const rows = [...byMode[revenueMode]].sort((a, b) =>
    ASCENDING.includes(sortKey) ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  )

  return (
    <Card>
      <CardHeader
        title='ตารางจัดอันดับ'
        subheader='สลับเกณฑ์การเรียงได้ · คณะที่ CM ≤ 0 ยังอยู่ในตารางเสมอ แม้จะไม่ขึ้นกราฟ'
        action={
          <TextField
            select
            size='small'
            label='เรียงตาม'
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            sx={{ minInlineSize: 200 }}
          >
            {SORT_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        }
        sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
      />
      <CardContent>
        <div className='overflow-auto' style={{ maxBlockSize: 560 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>คณะ / วิทยาลัย</th>
                <th align='right'>Q จริง</th>
                <th align='right'>Q*</th>
                <th align='right'>Util%</th>
                <th align='right'>หลักสูตรคุ้ม</th>
                <th align='right'>กำไร%</th>
                <th align='right'>CM/หัว</th>
                <th align='right'>AVC/R%</th>
                <th align='right'>ส่วนเกิน (ลบ.)</th>
                <th align='right'>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.name}>
                  <td>
                    <Typography color='text.disabled' sx={{ fontWeight: 700 }}>
                      {index + 1}
                    </Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontWeight: 600 }} title={row.name}>
                      {row.name}
                    </Typography>
                  </td>
                  <td align='right'>{fmtInt(row.q)}</td>
                  <td align='right'>
                    <Typography color='error.main' sx={{ fontWeight: 700 }}>
                      {row.qStar ? fmtInt(row.qStar) : '—'}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography
                      sx={{ fontWeight: 700 }}
                      color={
                        !row.hasBreakEven ? 'text.disabled' : row.utilization >= 100 ? 'success.main' : 'error.main'
                      }
                    >
                      {row.hasBreakEven ? `${row.utilization}%` : '—'}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography color={row.programsBreakingEvenPct >= 50 ? 'success.main' : 'error.main'}>
                      {row.programsBreakingEven}/{row.programCount}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography sx={{ fontWeight: 700 }} color={row.profitPct >= 0 ? 'success.main' : 'error.main'}>
                      {row.profitPct >= 0 ? '+' : ''}
                      {row.profitPct}%
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography sx={{ fontWeight: 700 }} color={row.cm > 0 ? 'success.main' : 'error.main'}>
                      {withSign(row.cm, fmtInt)}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography
                      color={
                        row.avcToRevenue >= 999
                          ? 'text.disabled'
                          : row.avcToRevenue <= 20
                            ? 'success.main'
                            : row.avcToRevenue <= 40
                              ? 'warning.main'
                              : 'error.main'
                      }
                    >
                      {row.avcToRevenue >= 999 ? '—' : `${row.avcToRevenue}%`}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography color={row.profitMillions >= 0 ? 'success.main' : 'error.main'}>
                      {withSign(row.profitMillions, value => fmtDec(value))}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={!row.hasBreakEven ? 'error' : row.isOk ? 'success' : 'warning'}
                      label={!row.hasBreakEven ? 'CM ≤ 0' : row.isOk ? 'ผ่าน' : 'ไม่ผ่าน'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default CrossRankTable
