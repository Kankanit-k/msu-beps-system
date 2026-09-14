'use client'

// MUI Imports
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// Type Imports
import type { RevenueMode } from '@beps/calc-engine'

// Context Imports
import { revenueModeNote, useBeps } from '@/contexts/BepsContext'

/**
 * แถบเครื่องมือของทุกหน้าวิเคราะห์ — ปีงบประมาณ · รอบคำนวณ · ฐานรายได้
 *
 * แทนที่ topbar ที่ mockup สร้างด้วย buildShell() (core.js:212-225) เทมเพลตไม่มีอะไร
 * แบบนี้มาให้เลย navbar เดิมมีแค่ปุ่มสลับโหมดสีกับเมนูผู้ใช้
 *
 * SA.md §9.2 ข้อ 9 บังคับว่าทุกตัวเลขบนจอต้องบอกได้ว่ามาจากรอบคำนวณไหน chip รอบคำนวณ
 * จึงต้องอยู่ตลอดเวลา ไม่ใช่ซ่อนไว้ในหน้าใดหน้าหนึ่ง
 */

const runStateChip: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  APPROVED: { label: 'อนุมัติแล้ว', color: 'success' },
  VALIDATED: { label: 'ตรวจแล้ว', color: 'success' },
  CALCULATED: { label: 'คำนวณแล้ว', color: 'warning' },
  RUNNING: { label: 'กำลังคำนวณ', color: 'warning' },
  DRAFT: { label: 'ฉบับร่าง', color: 'default' },
  FAILED: { label: 'ล้มเหลว', color: 'error' },
  CANCELLED: { label: 'ยกเลิก', color: 'default' }
}

const BepsToolbar = () => {
  const { year, setYear, availableYears, run, revenueMode, setRevenueMode } = useBeps()

  const state = runStateChip[run.state] ?? { label: run.state, color: 'default' as const }

  return (
    <div className='flex items-center gap-3 flex-wrap'>
      <Select
        size='small'
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        aria-label='ปีงบประมาณ'
        sx={{ minInlineSize: 150 }}
      >
        {availableYears.map(y => (
          <MenuItem key={y} value={y}>
            ปีงบประมาณ {y}
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={`คำนวณ ${run.calcAt} · กติกา ${run.ruleVer} · ฐาน ${run.basis}`}>
        <Chip
          size='small'
          variant='tonal'
          color={state.color}
          label={`Run #${run.id} · ${state.label}`}
          sx={{ cursor: 'help' }}
        />
      </Tooltip>

      <Tooltip title={revenueModeNote(revenueMode)}>
        <ToggleButtonGroup
          exclusive
          size='small'
          color='primary'
          value={revenueMode}
          onChange={(_, next: RevenueMode | null) => next && setRevenueMode(next)}
          aria-label='ฐานรายได้'
        >
          <ToggleButton value='with_government' sx={{ textTransform: 'none' }}>
            รวมเงินแผ่นดิน
          </ToggleButton>
          <ToggleButton value='without_government' sx={{ textTransform: 'none' }}>
            ไม่รวมเงินแผ่นดิน
          </ToggleButton>
        </ToggleButtonGroup>
      </Tooltip>

      <Typography variant='caption' color='text.disabled' sx={{ display: { xs: 'none', xl: 'block' } }}>
        {revenueModeNote(revenueMode)}
      </Typography>
    </div>
  )
}

export default BepsToolbar
