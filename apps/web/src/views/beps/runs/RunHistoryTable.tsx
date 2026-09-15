// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { AllocationRun, RunState } from '@/server/beps/run'

// Util Imports
import { fmtDec, fmtMillions } from '@/utils/beps-format'

/**
 * ประวัติรอบคำนวณ — ย้ายจาก `run-tb` ของ mockup/W11-allocation-run.html
 *
 * run เก่าไม่เคยถูกลบ (ตาราง allocation_run เป็น append-only) เพราะตัวเลขที่เคยนำเสนอไป
 * ต้องย้อนกลับไปอธิบายได้เสมอ — แถวของรอบที่ใช้อ้างอิงอยู่ถูกเน้นไว้
 */

const stateColor: Record<RunState, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  RUNNING: 'info',
  CALCULATED: 'warning',
  VALIDATED: 'info',
  APPROVED: 'success',
  FAILED: 'error'
}

type Props = {
  runs: AllocationRun[]
  currentRunId: number
}

const RunHistoryTable = ({ runs, currentRunId }: Props) => (
  <Card>
    <CardHeader
      title='ประวัติรอบคำนวณ'
      subheader={
        <>
          ตาราง <code>allocation_run</code> · run เก่าไม่เคยถูกลบ
        </>
      }
    />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th align='right'>Run</th>
              <th>ปีงบ</th>
              <th>ฐานต้นทุน</th>
              <th>กติกา</th>
              <th align='right'>ต้นทุนรวม (ลบ.)</th>
              <th align='right'>ส่วนต่าง (บาท)</th>
              <th>ผู้สั่ง / เวลา</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr
                key={run.id}
                style={
                  run.id === currentRunId ? { backgroundColor: 'var(--mui-palette-primary-lighterOpacity)' } : undefined
                }
              >
                <td align='right'>
                  <Typography color='primary.main' sx={{ fontWeight: 700 }}>
                    #{run.id}
                  </Typography>
                </td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {run.year}
                  </Typography>
                </td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {run.basis}
                  </Typography>
                </td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {run.ruleVersion}
                  </Typography>
                </td>
                <td align='right'>{fmtMillions(run.tc)}</td>
                <td align='right'>
                  <Typography color={run.diff ? 'error.main' : 'success.main'} sx={{ fontWeight: 700 }}>
                    {fmtDec(run.diff, 2)}
                  </Typography>
                </td>
                <td>
                  <Typography variant='body2'>{run.requestedBy}</Typography>
                  <Typography variant='caption' color='text.disabled'>
                    {run.requestedAt}
                  </Typography>
                </td>
                <td>
                  <Chip size='small' variant='tonal' color={stateColor[run.state]} label={run.stateLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default RunHistoryTable
