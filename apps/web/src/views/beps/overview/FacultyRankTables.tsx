'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ตารางคณะที่ทำส่วนเกินสูงสุด และคณะที่ต้องเฝ้าระวัง — ย้ายจาก `ov-top` / `ov-bot`
 * ของ mockup/assets/page-overview.js
 *
 * ทั้งสองตารางแสดงมากสุด 6 แถวเท่า mockup · เรียงตามขนาดของผลลัพธ์ (มากไปน้อย)
 */

const MAX_ROWS = 6

type RankTableProps = {
  title: string
  chipLabel: string
  chipColor: 'success' | 'error'
  valueHeader: string
  rows: { faculty: FacultyBreakEven; profit: number; qStar: number | null }[]
  sign: '+' | '−'
}

const RankTable = ({ title, chipLabel, chipColor, valueHeader, rows, sign }: RankTableProps) => (
  <Card className='bs-full'>
    <CardHeader title={title} action={<Chip size='small' variant='tonal' color={chipColor} label={chipLabel} />} />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>คณะ</th>
              <th align='right'>{valueHeader}</th>
              <th align='right'>Q* / Q</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} align='center'>
                  <Typography color='text.disabled'>— ไม่มีข้อมูล —</Typography>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.faculty.name}>
                  <td>
                    <Typography color='text.disabled' sx={{ fontWeight: 700 }}>
                      {index + 1}
                    </Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontWeight: 600 }}>{row.faculty.shortName}</Typography>
                  </td>
                  <td align='right'>
                    <Typography color={`${chipColor}.main`} sx={{ fontWeight: 700 }}>
                      {sign}
                      {fmtMillions(Math.abs(row.profit))}
                    </Typography>
                  </td>
                  <td align='right'>
                    <Typography variant='caption' color='text.disabled'>
                      {row.qStar === null ? '—' : fmtInt(row.qStar)} / {fmtInt(row.faculty.q)}
                    </Typography>
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

type Props = {
  faculties: FacultyBreakEven[]
}

const FacultyRankTables = ({ faculties }: Props) => {
  const { revenueMode } = useBeps()

  const ranked = faculties
    .map(faculty => ({
      faculty,
      profit: faculty.byMode[revenueMode].profit,
      qStar: faculty.byMode[revenueMode].qStar
    }))
    .sort((a, b) => b.profit - a.profit)

  const top = ranked.filter(r => r.profit > 0).slice(0, MAX_ROWS)

  /* ขาดทุนหนักสุดขึ้นก่อน — ranked เรียงจากมากไปน้อย ปลายแถวจึงเป็นตัวที่แย่ที่สุด */
  const watchlist = ranked
    .filter(r => r.profit < 0)
    .reverse()
    .slice(0, MAX_ROWS)

  return (
    <>
      <Grid size={{ xs: 12, md: 6 }}>
        <RankTable
          title='คณะที่มีส่วนเกินสูงสุด'
          chipLabel='Top surplus'
          chipColor='success'
          valueHeader='ส่วนเกิน (ลบ.)'
          rows={top}
          sign='+'
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RankTable
          title='คณะที่ต้องเฝ้าระวัง (ขาดทุน)'
          chipLabel='Watchlist'
          chipColor='error'
          valueHeader='ขาดทุน (ลบ.)'
          rows={watchlist}
          sign='−'
        />
      </Grid>
    </>
  )
}

export default FacultyRankTables
