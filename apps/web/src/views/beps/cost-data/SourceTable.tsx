// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { CostDataSource, SourceState } from '@/server/beps/cost-data'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ตารางสถานะแหล่งข้อมูลต้นทาง (W9) — ย้ายจาก `src-tb` ของ mockup/W9-cost-data.html
 *
 * ทุกรอบคำนวณล็อกยอดของแหล่งเหล่านี้ ณ เวลาที่สั่งคำนวณ (ตาราง source_dataset)
 * แหล่งที่ยังไม่เคยซิงก์ต้องเห็นชัดว่า "ยังไม่เคยซิงก์" ไม่ใช่ช่องว่าง
 */

const stateColor: Record<SourceState, 'success' | 'warning' | 'error'> = {
  OK: 'success',
  PARTIAL: 'warning',
  MISSING: 'error'
}

type Props = {
  sources: CostDataSource[]
}

const SourceTable = ({ sources }: Props) => (
  <Card>
    <CardHeader
      title='สถานะแหล่งข้อมูลต้นทาง'
      subheader={
        <>
          ตาราง <code>source_dataset</code> · ทุกรอบคำนวณล็อกยอดของแหล่งเหล่านี้ ณ เวลาที่สั่งคำนวณ
        </>
      }
    />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>แหล่งข้อมูล</th>
              <th>วิธีรับข้อมูล</th>
              <th align='right'>จำนวนแถว</th>
              <th align='right'>ยอดเงิน (ลบ.)</th>
              <th>ซิงก์ล่าสุด</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <tr key={source.key}>
                <td style={{ whiteSpace: 'normal' }}>
                  <Typography sx={{ fontWeight: 600 }}>{source.name}</Typography>
                  <Typography variant='caption' color='text.disabled'>
                    {source.note}
                  </Typography>
                </td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {source.mode}
                  </Typography>
                </td>
                <td align='right'>{source.rowCount ? fmtInt(source.rowCount) : '—'}</td>
                <td align='right'>{source.amount ? fmtMillions(source.amount) : '—'}</td>
                <td>
                  {source.syncedAt ? (
                    <Typography variant='body2' color='text.secondary'>
                      {source.syncedAt}
                    </Typography>
                  ) : (
                    <Typography variant='body2' color='error.main'>
                      ยังไม่เคยซิงก์
                    </Typography>
                  )}
                </td>
                <td>
                  <Chip size='small' variant='tonal' color={stateColor[source.state]} label={source.stateLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default SourceTable
