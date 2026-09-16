'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

import type { BreakEvenEntity } from '@/server/beps/entities'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * กล่องสรุป "ค่าจริงของหลักสูตรที่เลือก" — ย้ายจาก `pg-ref-note` ใน
 * mockup/assets/page-scenario-program.js (onProgChange)
 *
 * ขึ้นทันทีที่เลือกหลักสูตรเดิม **ก่อนกดคำนวณ** เพื่อให้เห็นจุดตั้งต้นว่าวันนี้หลักสูตรนี้
 * คุ้มหรือไม่คุ้มอยู่เท่าไร แล้วค่อยแก้ตัวเลขทดลอง — ถ้าไม่มีกล่องนี้ผู้ใช้จะไม่รู้ว่า
 * ตัวเลขที่ปรับไปทำให้ดีขึ้นหรือแย่ลงจากของเดิม
 *
 * ตัวเลขทุกตัวมาจาก @beps/calc-engine ชุดเดียวกับผลการคำนวณด้านล่าง
 */

type Props = {
  program: BreakEvenEntity
  results: Record<RevenueMode, BreakEvenResult>
}

const ModeLine = ({ label, result, color }: { label: string; result: BreakEvenResult; color: string }) => {
  const isOk = result.qStar !== null && result.q >= result.qStar

  return (
    <Typography variant='body2' component='div' className='flex items-center gap-2 flex-wrap'>
      <Box component='span' sx={{ color, fontWeight: 700 }}>
        ● {label}:
      </Box>
      <span>
        R = <b>{result.r === null ? '—' : fmtInt(result.r)}</b>
      </span>
      <span>
        CM ={' '}
        <Typography component='b' color={(result.cm ?? 0) > 0 ? 'success.main' : 'error.main'}>
          {result.cm === null ? '—' : fmtInt(result.cm)}
        </Typography>
      </span>
      <span>
        Q* = <b>{result.qStar === null ? 'ไม่มี (CM ≤ 0)' : `${fmtInt(result.qStar)} คน`}</b>
      </span>
      {result.qStarStatus === 'full_cost_recovery' && (
        <Chip size='small' variant='tonal' color='warning' label='TC ÷ R' />
      )}
      {result.qStar !== null && (
        <Typography component='span' color={isOk ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
          {isOk ? `✓ คุ้ม (+${fmtInt(result.q - result.qStar)} คน)` : `⚠ ขาด ${fmtInt(result.qStar - result.q)} คน`}
        </Typography>
      )}
    </Typography>
  )
}

const ProgramReferenceNote = ({ program, results }: Props) => {
  const withGovernment = results.with_government

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        paddingBlock: 3,
        paddingInline: 4,
        backgroundColor: 'action.hover'
      }}
    >
      <div className='flex items-center gap-3 flex-wrap mbe-2'>
        <Typography color='primary.main' sx={{ fontWeight: 700 }}>
          {program.shortName}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {program.level} · {program.faculty}
        </Typography>
        <Chip size='small' variant='tonal' color='success' label='ดึงจากระบบแล้ว — แก้ตัวเลขทดลองต่อได้' />
      </div>

      <Typography variant='body2' color='text.secondary' className='mbe-2'>
        ค่าจริงปัจจุบัน — AVC = <b>{withGovernment.avc === null ? '—' : fmtInt(withGovernment.avc)}</b> บ./คน ·
        นิสิตจริง <b>{fmtInt(program.input.q)}</b> คน
      </Typography>

      <div className='flex flex-col gap-1'>
        <ModeLine label='รวมแผ่นดิน' result={results.with_government} color='primary.main' />
        <ModeLine label='ไม่รวมแผ่นดิน' result={results.without_government} color='warning.main' />
      </div>
    </Box>
  )
}

export default ProgramReferenceNote
