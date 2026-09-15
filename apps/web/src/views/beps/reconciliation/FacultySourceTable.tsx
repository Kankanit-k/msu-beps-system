'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Chart Imports
import { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import SplitBar from '@views/beps/shared/SplitBar'

// Type Imports
import type { FacultySourceMix } from '@/server/beps/reconciliation'

// Data Imports
import { confidenceOf } from '@/server/beps/reconciliation'

// Util Imports
import { fmtDec, fmtMillions } from '@/utils/beps-format'

/**
 * สัดส่วนที่มาข้อมูลรายคณะ — ย้ายจาก `src-tb` ของ mockup/W12-reconciliation.html
 *
 * คณะที่แถบเขียวสั้น = ตัวเลขพึ่งการปันส่วนมาก ต้องระวังการตีความ เพราะจุดคุ้มทุนของคณะนั้น
 * จะอ่อนไหวต่อการเปลี่ยนกติกาผังบัญชี (W14) มากกว่าคณะอื่น
 */

type Props = {
  rows: FacultySourceMix[]
}

const FacultySourceTable = ({ rows }: Props) => {
  const palette = useChartPalette()

  return (
    <Card className='bs-full'>
      <CardHeader
        title='สัดส่วนที่มาข้อมูล รายคณะ'
        subheader='เรียงตามสัดส่วนที่ปันส่วน — แถบเขียวสั้น = พึ่งการปันส่วนมาก'
      />
      <CardContent>
        <div className='overflow-auto' style={{ maxBlockSize: 520 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>คณะ / วิทยาลัย</th>
                <th>ตรง / ปันส่วน</th>
                <th align='right'>ตรง</th>
                <th align='right'>ปันส่วน</th>
                <th align='right'>ต้นทุนรวม</th>
                <th>ความเชื่อมั่น</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const confidence = confidenceOf(row.allocatedShare)

                return (
                  <tr key={row.name}>
                    <td>
                      <Typography sx={{ fontWeight: 600 }} title={row.name}>
                        {row.shortName}
                      </Typography>
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <SplitBar
                        percent={100 - row.allocatedShare}
                        firstColor={palette.positive}
                        secondColor={palette.variable}
                        title={`ตรง ${fmtDec(100 - row.allocatedShare, 0)}% · ปันส่วน ${fmtDec(row.allocatedShare, 0)}%`}
                      />
                    </td>
                    <td align='right'>{fmtMillions(row.direct)}</td>
                    <td align='right'>
                      <Typography color='warning.main' sx={{ fontWeight: 700 }}>
                        {fmtMillions(row.allocated)}
                      </Typography>
                    </td>
                    <td align='right'>{fmtMillions(row.tc)}</td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={confidence.color}
                        label={`${confidence.label} · ปันส่วน ${fmtDec(row.allocatedShare, 0)}%`}
                      />
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

export default FacultySourceTable
