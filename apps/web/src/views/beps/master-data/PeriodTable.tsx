// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { Period } from '@/server/beps/org'

/**
 * งวดปีงบประมาณ — ย้ายจาก `per-tb` ของ mockup/W17-master-data.html
 *
 * ทุกตัวเลขในระบบผูกกับ `period_id` · งวดหนึ่งต้องระบุทั้ง **ปีงบประมาณ** (ต.ค.–ก.ย.
 * ซึ่งเป็นปีของต้นทุน) และ **ปีการศึกษา** (ซึ่งเป็นปีของจำนวนนิสิตและค่าธรรมเนียม)
 * ถ้าปล่อยว่าง กติกาที่ผูกกับปีการศึกษา (W14, W15) จะหาปีไม่เจอแบบเงียบๆ
 */

type Props = {
  periods: Period[]
}

const PeriodTable = ({ periods }: Props) => (
  <Card>
    <CardHeader
      title='งวดปีงบประมาณ'
      subheader={
        <>
          ตาราง <code>dim_period</code> · ทุกตัวเลขในระบบผูกกับ <code>period_id</code>
        </>
      }
    />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th align='right'>ปีงบ</th>
              <th align='right'>ปีการศึกษา</th>
              <th>ช่วงงวด</th>
              <th>วันตัดยอดนิสิต</th>
              <th>สถานะนิสิตที่นับ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period.fiscalYear}>
                <td align='right'>
                  <Typography color='primary.main' sx={{ fontWeight: 700 }}>
                    {period.fiscalYear}
                  </Typography>
                </td>
                <td align='right'>{period.academicYear}</td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {period.start} – {period.end}
                  </Typography>
                </td>
                <td>
                  {period.snapshotDate ? (
                    <Typography variant='body2' color='text.secondary'>
                      {period.snapshotDate}
                    </Typography>
                  ) : (
                    <Typography variant='body2' color='error.main'>
                      ยังไม่กำหนด
                    </Typography>
                  )}
                </td>
                <td style={{ whiteSpace: 'normal' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {period.countingRule}
                  </Typography>
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={period.state === 'ปิดงวดแล้ว' ? 'success' : 'info'}
                    label={period.state}
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

export default PeriodTable
