'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { FacultyBreakEven } from '@/server/beps/faculties'

// Util Imports
import { fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ — ย้ายจาก `rev-tbl` ของ
 * mockup/assets/page-revenue.js
 *
 * ตารางสูงคงที่แล้วเลื่อนภายใน (เหมือน mockup ที่ใช้ max-height 460px) เพื่อให้ยังเห็น
 * ส่วนอื่นของหน้าได้โดยไม่ต้องเลื่อนผ่าน 20 แถวทุกครั้ง
 */

type Props = {
  faculties: FacultyBreakEven[]
}

const FacultyRevenueTable = ({ faculties }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()

  return (
    <Card>
      <CardHeader
        title='ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ'
        subheader='หน่วยล้านบาท ยกเว้น R/หัว (บาท) และ Q* (คน)'
      />
      <CardContent>
        <div className='overflow-auto' style={{ maxBlockSize: 460 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>คณะ</th>
                <th align='right'>นิสิต</th>
                <th align='right'>{includesGovernment ? 'TR' : 'เงินรายได้'}</th>
                <th align='right'>TC</th>
                <th align='right'>ส่วนเกิน</th>
                <th align='right'>R/หัว</th>
                <th align='right'>Q*</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((faculty, index) => {
                const result = faculty.byMode[revenueMode]

                return (
                  <tr key={faculty.name}>
                    <td>
                      <Typography color='text.disabled' sx={{ fontWeight: 700 }}>
                        {index + 1}
                      </Typography>
                    </td>
                    <td>
                      <Typography sx={{ fontWeight: 600 }}>{faculty.name}</Typography>
                    </td>
                    <td align='right'>{fmtInt(faculty.q)}</td>
                    <td align='right'>{fmtMillions(result.tr)}</td>
                    <td align='right'>{fmtMillions(result.tc)}</td>
                    <td align='right'>
                      <Typography color={result.profit >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
                        {withSign(result.profit, fmtMillions)}
                      </Typography>
                    </td>
                    <td align='right'>{result.r === null ? '—' : fmtInt(result.r)}</td>
                    <td align='right'>
                      <Typography color='error.main'>{result.qStar === null ? '—' : fmtInt(result.qStar)}</Typography>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default FacultyRevenueTable
