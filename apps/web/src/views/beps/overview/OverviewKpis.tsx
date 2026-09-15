'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * KPI 6 ตัวบนสุดของ W1 — ย้ายจาก .kpis ของ mockup/W1-overview.html
 *
 * ตัวเลขเปลี่ยนตามฐานรายได้ที่เลือกบน navbar จึงต้องเป็น client component ที่อ่าน context
 * ส่วนการคำนวณทำไว้ฝั่ง server ครบทั้ง 2 ฐานแล้ว (byMode) — กดสลับแล้วเปลี่ยนทันที
 * ไม่ต้องยิงขอข้อมูลใหม่
 */

type Props = {
  totals: UniversityTotals
}

const OverviewKpis = ({ totals }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()
  const result = totals.byMode[revenueMode]

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard
          label='นิสิตทั้งหมด'
          value={fmtInt(totals.q)}
          unit={`คน · ${totals.facultyCount} คณะ/วิทยาลัย · ${fmtInt(totals.programCount)} หลักสูตร`}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard
          label={includesGovernment ? 'รายได้รวม (TR)' : 'รายได้เงินรายได้'}
          value={fmtMillions(result.tr)}
          unit='ล้านบาท'
          color='primary.main'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard label='ต้นทุนรวม (TC)' value={fmtMillions(result.tc)} unit='ล้านบาท' />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard
          label='ส่วนเกิน/ขาดทุน (π)'
          value={withSign(result.profit, fmtMillions)}
          unit={`ล้านบาท · ${result.tr > 0 ? fmtDec((result.profit / result.tr) * 100) : '—'}% ของรายได้`}
          color={result.profit >= 0 ? 'success.main' : 'error.main'}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard
          label='รายได้ต่อหัว (R)'
          value={result.r === null ? '—' : fmtInt(result.r)}
          unit='บาท/คน'
          color='warning.main'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <KpiCard
          label='นิสิต ณ จุดคุ้มทุน (Q*)'
          value={result.qStar === null ? '—' : fmtInt(result.qStar)}
          unit={result.qStar === null ? 'R ≤ AVC' : `คน · จริง ${fmtInt(totals.q)} คน`}
          color='error.main'
        />
      </Grid>
    </>
  )
}

export default OverviewKpis
