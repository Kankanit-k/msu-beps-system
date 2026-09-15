'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import HighlightText from '@views/beps/shared/HighlightText'
import TableToolbar from '@views/beps/shared/TableToolbar'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Util Imports
import { toPerHeadRows } from './rows'
import { fmtInt, withSign } from '@/utils/beps-format'

/**
 * ตารางเปรียบเทียบต่อหัวรายคณะ — ย้ายจาก `ph-tbl` ของ mockup/assets/page-perhead.js
 *
 * เรียงตามส่วนต่าง R − ATC จากมากไปน้อย · ค้นหาได้ทั้งชื่อคณะและคำว่า "คุ้ม"/"ขาด"
 * เหมือน mockup และรวมหน่วยที่นิสิตน้อยกว่าเกณฑ์ของกราฟไว้ครบ (ไม่ตัดออกจากตาราง)
 */

type QuickFilterValue = 'all' | 'ok' | 'loss'

const FILTERS: { value: QuickFilterValue; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ok', label: '✓ คุ้ม' },
  { value: 'loss', label: '⚠ ขาด' }
]

type Props = {
  faculties: FacultyBreakEven[]
}

const PerHeadTable = ({ faculties }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<QuickFilterValue>('all')

  const query = search.trim().toLowerCase()

  const ranked = useMemo(
    () => toPerHeadRows(faculties, revenueMode).sort((a, b) => b.diff - a.diff),
    [faculties, revenueMode]
  )

  const rows = ranked
    .map((row, index) => ({ row, rank: index + 1 }))
    .filter(({ row }) => {
      if (!query) return true

      const statusWord = row.diff >= 0 ? 'คุ้ม' : 'ขาด'

      return row.faculty.name.toLowerCase().includes(query) || statusWord.includes(query)
    })
    .filter(({ row }) => filter === 'all' || (filter === 'ok' ? row.diff >= 0 : row.diff < 0))

  return (
    <Card>
      <CardHeader
        title='ตารางเปรียบเทียบต่อหัว รายคณะ'
        subheader='เรียงตามส่วนต่าง R − ATC · หน่วย: บาท/คน'
        action={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder='ค้นหาคณะ / สถานะ (คุ้ม, ขาด)…'
            filters={FILTERS}
            filter={filter}
            onFilterChange={setFilter}
          />
        }
        sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
      />
      <CardContent>
        <div className='overflow-auto' style={{ maxBlockSize: 460 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>คณะ / วิทยาลัย</th>
                <th align='right'>นิสิต</th>
                <th align='right'>{includesGovernment ? 'R/หัว' : 'R/หัว (ไม่รวมแผ่นดิน)'}</th>
                <th align='right'>ATC/หัว</th>
                <th align='right'>AVC/หัว</th>
                <th align='right'>CM/หัว</th>
                <th align='right'>R−ATC</th>
                <th align='right'>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} align='center'>
                    <Typography color='text.disabled'>ไม่พบคณะที่ตรงกับเงื่อนไขที่เลือก</Typography>
                  </td>
                </tr>
              ) : (
                rows.map(({ row, rank }) => (
                  <tr key={row.faculty.name}>
                    <td>
                      <Typography color='text.disabled' sx={{ fontWeight: 700 }}>
                        {rank}
                      </Typography>
                    </td>
                    <td>
                      <Typography sx={{ fontWeight: 600 }} title={row.faculty.name}>
                        <HighlightText text={row.faculty.name} query={query} />
                      </Typography>
                    </td>
                    <td align='right'>{fmtInt(row.faculty.q)}</td>
                    <td align='right'>
                      <Typography color='success.main'>{fmtInt(row.r)}</Typography>
                    </td>
                    <td align='right'>
                      <Typography color='warning.main'>{fmtInt(row.atc)}</Typography>
                    </td>
                    <td align='right'>
                      <Typography color='primary.main'>{fmtInt(row.avc)}</Typography>
                    </td>
                    <td align='right'>
                      <Typography color={row.cm > 0 ? 'success.main' : 'error.main'}>
                        {withSign(row.cm, fmtInt)}
                      </Typography>
                    </td>
                    <td align='right'>
                      <Typography color={row.diff >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
                        {withSign(row.diff, fmtInt)}
                      </Typography>
                    </td>
                    <td align='right'>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={row.diff >= 0 ? 'success' : 'error'}
                        label={row.diff >= 0 ? '✓ คุ้ม' : '⚠ ขาด'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default PerHeadTable
