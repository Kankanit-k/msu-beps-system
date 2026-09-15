'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult } from '@beps/calc-engine'

import type { BreakEvenStatus } from '@/server/beps/status'

// Data Imports
import { statusColor, statusLabel } from '@/server/beps/status'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * สรุปการวิเคราะห์ของหน่วยที่เลือก — ย้ายจาก `ch-summary` ของ mockup/assets/page-chart.js
 *
 * ข้อความเปลี่ยนตามสถานะ 3 แบบ: ไม่มีจุดคุ้มทุน (R ≤ AVC) · ยังไม่ถึง · ถึงแล้ว
 */

type Props = {
  name: string
  result: BreakEvenResult
  status: BreakEvenStatus
}

const AnalysisSummary = ({ name, result, status }: Props) => {
  const r = result.r ?? 0
  const avc = result.avc ?? 0
  const needed = result.qStar !== null && result.q < result.qStar ? result.qStar - result.q : 0

  return (
    <Card className='bs-full'>
      <CardHeader title='สรุปการวิเคราะห์' />
      <CardContent className='flex flex-col gap-3'>
        <Typography variant='h6'>{name}</Typography>

        <Typography variant='body2' color='text.secondary'>
          หน่วยนี้มีนิสิต <b>{fmtInt(result.q)}</b> คน ต้นทุนคงที่ (TFC) <b>{fmtMillions(result.tfc)}</b> ลบ.
          ต้นทุนผันแปรต่อหัว (AVC) <b>{fmtInt(avc)}</b> บาท และรายได้ต่อหัว (R) <b>{fmtInt(r)}</b> บาท
        </Typography>

        <div>
          <Chip size='small' variant='tonal' color={statusColor[status]} label={statusLabel[status]} />
        </div>

        <Typography variant='body2' color='text.secondary'>
          {status === 'no_breakeven' && (
            <>
              รายรับต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว จึงไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน
              ต้องปรับค่าธรรมเนียมหรือลดต้นทุนผันแปร
            </>
          )}
          {status === 'ok' && result.qStar !== null && (
            <>
              จำนวนนิสิตปัจจุบัน ({fmtInt(result.q)}) มากกว่าจุดคุ้มทุน ({fmtInt(result.qStar)}) อยู่{' '}
              <b>{fmtInt(result.q - result.qStar)}</b> คน สร้างส่วนเกิน{' '}
              <Typography component='b' color='success.main'>
                {fmtMillions(result.profit)}
              </Typography>{' '}
              ลบ.
            </>
          )}
          {status === 'below' && result.qStar !== null && (
            <>
              ต้องเพิ่มนิสิตอีก <b>{fmtInt(needed)}</b> คน (จาก {fmtInt(result.q)} เป็น {fmtInt(result.qStar)})
              หรือลดต้นทุน/เพิ่มค่าธรรมเนียม จึงจะถึงจุดคุ้มทุน
            </>
          )}
          {status === 'below' && result.qStar === null && <>ข้อมูลไม่พอคำนวณจุดคุ้มทุน (ไม่มีนิสิตหรือไม่มีรายได้)</>}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default AnalysisSummary
