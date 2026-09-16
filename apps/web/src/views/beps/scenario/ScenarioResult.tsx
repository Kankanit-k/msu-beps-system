'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult } from '@beps/calc-engine'

// Util Imports
import { fmtDec, fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * กล่องผลการคำนวณของฐานรายได้หนึ่งฐาน — แทน box() ใน
 * mockup/assets/page-scenario-faculty.js
 *
 * แสดงทั้ง 2 ฐานเสมอ (ไม่ผูกกับปุ่มบน navbar) เพราะประเด็นของหน้าคำนวณเองคือการเทียบว่า
 * "ถ้าไม่มีเงินแผ่นดินแล้วยังคุ้มไหม" ซึ่งต้องเห็นคู่กัน
 */

type Props = {
  title: string
  result: BreakEvenResult
  color: 'primary' | 'warning'
  /**
   * W7 แสดงผลกำไรเป็น **เปอร์เซ็นต์** ตาม mockup/assets/page-scenario-program.js
   * ส่วน W6 แสดงเป็นล้านบาท — ตัวหารของ % มาจากนโยบาย `profit_pct_basis` ไม่ใช่ค่าที่หน้าจอเลือกเอง
   */
  profitDisplay?: 'amount' | 'percent'
}

const ScenarioResult = ({ title, result, color, profitDisplay = 'amount' }: Props) => {
  const isOk = result.qStar !== null && result.q >= result.qStar
  const isFullCostRecovery = result.qStarStatus === 'full_cost_recovery'

  return (
    <Box
      sx={{
        border: '1.5px solid',
        borderColor: `${color}.main`,
        borderRadius: 2,
        paddingBlock: 3,
        paddingInline: 4,
        backgroundColor: isOk ? 'success.lighterOpacity' : 'error.lighterOpacity'
      }}
    >
      <Typography variant='overline' color={`${color}.main`} sx={{ fontWeight: 800 }}>
        {title}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBlockStart: 2 }}>
        <Typography variant='body2'>
          R/หัว: <b>{result.r === null ? '—' : fmtInt(result.r)}</b>
        </Typography>
        <Typography variant='body2'>
          CM/หัว:{' '}
          <Typography component='b' color={(result.cm ?? 0) > 0 ? 'success.main' : 'error.main'}>
            {result.cm === null ? '—' : fmtInt(result.cm)}
          </Typography>
        </Typography>
        <Typography variant='body2' component='div'>
          Q*:{' '}
          <Typography component='b' color='error.main'>
            {result.qStar === null ? '—' : `${fmtInt(result.qStar)} คน`}
          </Typography>{' '}
          {isFullCostRecovery && <Chip size='small' variant='tonal' color='warning' label='TC ÷ R' />}
        </Typography>
        <Typography variant='body2'>
          {profitDisplay === 'percent' ? 'กำไร: ' : 'ส่วนเกิน: '}
          <Typography component='b' color={result.profit >= 0 ? 'success.main' : 'error.main'}>
            {profitDisplay === 'percent'
              ? result.profitPct === null
                ? '—'
                : withSign(result.profitPct, value => `${fmtDec(value)}%`)
              : `${withSign(result.profit, fmtMillions)} ล.`}
          </Typography>
        </Typography>
      </Box>

      <Typography
        variant='body2'
        sx={{ fontWeight: 700, marginBlockStart: 2 }}
        color={isOk ? 'success.main' : 'error.main'}
      >
        {result.qStar === null
          ? 'คำนวณจุดคุ้มทุนไม่ได้'
          : `${isFullCostRecovery ? 'CM ≤ 0 · ใช้ TC ÷ R · ' : ''}${
              isOk
                ? `เกินจุดคุ้มทุน +${fmtInt(result.q - result.qStar)} คน`
                : `ขาดอีก ${fmtInt(result.qStar - result.q)} คน`
            }`}
      </Typography>
    </Box>
  )
}

export default ScenarioResult
