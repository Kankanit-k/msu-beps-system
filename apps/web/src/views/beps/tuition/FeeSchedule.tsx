'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import HighlightText from '@views/beps/shared/HighlightText'
import MiniStat from '@views/beps/shared/MiniStat'
import TableToolbar from '@views/beps/shared/TableToolbar'

// Type Imports
import type { FeeSchedule as Fee, FeeStatus } from '@/server/beps/tuition'

// Util Imports
import { fmtDec, fmtInt } from '@/utils/beps-format'

/**
 * ตารางอัตราค่าธรรมเนียม + รายละเอียดที่เลือก — ย้ายจาก `fee-tb` / `detail`
 * ของ mockup/W8-tuition.html
 *
 * ค่าธรรมเนียมเป็น **ต้นทางของ TR ทั้งระบบ** อัตราที่ยังไม่ผ่านอนุมัติจะไม่ถูกนำไปคำนวณ
 * รอบคำนวณจะข้ามหลักสูตรนั้นและติดธงไว้ที่รายการค้างตรวจ ไม่ใช่คำนวณด้วยค่า 0
 */

const statusColor: Record<FeeStatus, 'success' | 'warning' | 'default' | 'error'> = {
  APPROVED: 'success',
  PENDING_APPROVAL: 'warning',
  DRAFT: 'default',
  REJECTED: 'error'
}

type StatusFilter = 'all' | FeeStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
  { value: 'DRAFT', label: 'ร่าง' }
]

type Props = {
  fees: Fee[]
}

const FeeScheduleTable = ({ fees }: Props) => {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const query = search.trim().toLowerCase()

  const rows = fees
    .map((fee, index) => ({ fee, index }))
    .filter(({ fee }) => filter === 'all' || fee.status === filter)
    .filter(
      ({ fee }) => !query || [fee.faculty, fee.program, fee.level].some(value => value.toLowerCase().includes(query))
    )

  const selected = fees[selectedIndex] ?? fees[0]
  const delta = selected?.previousRate == null ? null : selected.rate - selected.previousRate

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder='ค้นหาคณะ / หลักสูตร…'
            filters={FILTERS}
            filter={filter}
            onFilterChange={setFilter}
          />
          <Chip size='small' variant='tonal' color='primary' label={`${rows.length} จาก ${fees.length} รายการ`} />
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card className='bs-full'>
          <CardHeader title='ตารางอัตราค่าธรรมเนียม' subheader='คลิกแถวเพื่อดูประวัติการเสนอและอนุมัติ' />
          <CardContent>
            <div className='overflow-auto' style={{ maxBlockSize: 560 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>คณะ / หลักสูตร</th>
                    <th>ระดับ</th>
                    <th>ภาค · สัญชาติ</th>
                    <th align='right'>อัตรา (บ./ปี)</th>
                    <th align='right'>เทียบปีก่อน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} align='center'>
                        <Typography color='text.disabled'>ไม่พบอัตราที่ตรงกับตัวกรอง</Typography>
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ fee, index }) => {
                      const diff = fee.previousRate == null ? null : fee.rate - fee.previousRate

                      return (
                        <tr
                          key={`${fee.program}-${fee.level}-${fee.studentType}`}
                          onClick={() => setSelectedIndex(index)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor:
                              index === selectedIndex ? 'var(--mui-palette-primary-lighterOpacity)' : undefined
                          }}
                        >
                          <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                            <Typography sx={{ fontWeight: 600 }}>
                              <HighlightText text={fee.program} query={query} />
                            </Typography>
                            <Typography variant='caption' color='text.disabled'>
                              <HighlightText text={fee.faculty} query={query} />
                            </Typography>
                          </td>
                          <td>
                            <Typography variant='body2' color='text.secondary'>
                              {fee.level}
                            </Typography>
                          </td>
                          <td>
                            <Typography variant='body2' color='text.secondary'>
                              {fee.studentType}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Typography sx={{ fontWeight: 700 }}>{fmtInt(fee.rate)}</Typography>
                          </td>
                          <td align='right'>
                            {diff === null ? (
                              <Typography color='text.disabled'>ใหม่</Typography>
                            ) : diff === 0 ? (
                              <Typography color='text.disabled'>เท่าเดิม</Typography>
                            ) : (
                              <Typography color={diff > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 700 }}>
                                {diff > 0 ? '+' : '−'}
                                {fmtInt(Math.abs(diff))}{' '}
                                <Typography component='span' variant='caption' color='text.disabled'>
                                  ({diff > 0 ? '+' : '−'}
                                  {fmtDec((Math.abs(diff) / (fee.previousRate as number)) * 100)}%)
                                </Typography>
                              </Typography>
                            )}
                          </td>
                          <td>
                            <Chip
                              size='small'
                              variant='tonal'
                              color={statusColor[fee.status]}
                              label={fee.statusLabel}
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card className='bs-full'>
          <CardHeader
            title={selected?.program ?? '—'}
            subheader={selected ? `${selected.faculty} · ${selected.level} · ${selected.studentType}` : null}
            action={
              selected && (
                <Chip size='small' variant='tonal' color={statusColor[selected.status]} label={selected.statusLabel} />
              )
            }
          />
          <CardContent className='flex flex-col gap-4'>
            <div className='grid gap-4' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
              <MiniStat label='อัตราที่เสนอ' value={fmtInt(selected?.rate ?? 0)} sub='บาท/ปี' color='primary.main' />
              <MiniStat
                label='อัตราเดิม'
                value={selected?.previousRate == null ? '—' : fmtInt(selected.previousRate)}
                sub={delta === null ? 'เป็นอัตราแรก' : delta === 0 ? 'ไม่เปลี่ยน' : 'บาท/ปี'}
              />
            </div>

            <div>
              <Typography variant='caption' color='text.secondary'>
                ผู้อนุมัติ
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {selected?.approvedBy ?? 'ยังไม่อนุมัติ — ยังไม่ถูกนำไปคำนวณ TR'}
              </Typography>
              {selected?.approvedAt && (
                <Typography variant='caption' color='text.disabled'>
                  {selected.approvedAt}
                </Typography>
              )}
            </div>

            <Typography variant='caption' color='text.secondary'>
              คนที่เสนออัตราและคนที่อนุมัติต้องเป็นคนละคน — ปุ่มอนุมัติถูกปิดถ้าผู้ใช้ปัจจุบันเป็นผู้เสนอเอง
              และบังคับซ้ำที่ระดับหลังบ้าน
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default FeeScheduleTable
