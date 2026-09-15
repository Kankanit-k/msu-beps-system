// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { StudentTypeRow } from '@/server/beps/org'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * ประเภทนิสิต — ย้ายจาก `st-tb` ของ mockup/W17-master-data.html
 *
 * ค่าธรรมเนียมและเงินสมทบคิดแยกตามประเภท (FR-11) หลักสูตรเดียวกันจึงมีได้หลายอัตรา
 * แถวสรุปท้ายตารางต้องยืนยันเสมอว่ายอดรวมตรงกับจำนวนนิสิตของงวด — ถ้าไม่ตรง
 * ตรวจยอดกลับต้นทางที่ W12 จะไม่ผ่าน
 */

type Props = {
  rows: StudentTypeRow[]
  totals: { sum: number; expected: number; matches: boolean }
}

const StudentTypeTable = ({ rows, totals }: Props) => (
  <Card>
    <CardHeader
      title='ประเภทนิสิต'
      subheader={
        <>
          ตาราง <code>student_type</code> · ค่าธรรมเนียมและเงินสมทบคิดแยกตามประเภท (FR-11)
        </>
      }
    />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ภาค</th>
              <th>สัญชาติ</th>
              <th align='right'>จำนวนนิสิต</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.code}>
                <td>
                  <Typography component='code' color='primary.main' variant='body2'>
                    {row.code}
                  </Typography>
                </td>
                <td>{row.group}</td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={row.nationality === 'ไทย' ? 'primary' : 'success'}
                    label={row.nationality}
                  />
                </td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }}>{fmtInt(row.count)}</Typography>
                </td>
                <td style={{ whiteSpace: 'normal' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {row.note || '—'}
                  </Typography>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3}>
                <Typography sx={{ fontWeight: 700 }}>รวม</Typography>
              </td>
              <td align='right'>
                <Typography sx={{ fontWeight: 700 }}>{fmtInt(totals.sum)}</Typography>
              </td>
              <td style={{ whiteSpace: 'normal' }}>
                {totals.matches ? (
                  <Typography variant='body2' color='success.main'>
                    ตรงกับยอดนิสิตรวมของงวด ({fmtInt(totals.expected)} คน)
                  </Typography>
                ) : (
                  <Typography variant='body2' color='error.main'>
                    ต่างจากยอดนิสิตรวมของงวด {fmtInt(Math.abs(totals.sum - totals.expected))} คน — ตรวจยอดจะไม่ผ่าน
                  </Typography>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default StudentTypeTable
