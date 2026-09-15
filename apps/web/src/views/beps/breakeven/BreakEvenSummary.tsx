'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import InsightList from '@views/beps/shared/InsightList'
import KpiCard from '@views/beps/shared/KpiCard'
import type { Insight } from '@views/beps/shared/InsightList'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { TreeFaculty } from '@/server/beps/breakeven-tree'

// Util Imports
import { computeTree, flattenPrograms } from './tree'
import { fmtInt, fmtMillions, shortOrgName, withSign } from '@/utils/beps-format'

/**
 * KPI + ประเด็นสำคัญของ W2 — ย้ายจาก renderBreakeven() ของ
 * mockup/assets/page-breakeven.js
 *
 * นับจากหลักสูตรทั้งหมดในต้นไม้ (ไม่ใช่ผลกรองที่ผู้ใช้เลือกอยู่) เพราะเป็นภาพรวมของ
 * ทั้งระบบ ไม่ใช่สรุปของสิ่งที่เห็นบนจอ — mockup ก็คิดจากชุดเต็มเช่นกัน
 */

type Props = {
  faculties: TreeFaculty[]
}

const BreakEvenSummary = ({ faculties }: Props) => {
  const { revenueMode } = useBeps()

  const programs = useMemo(() => flattenPrograms(computeTree(faculties, revenueMode)), [faculties, revenueMode])

  const ok = programs.filter(p => p.status === 'ok')
  const below = programs.filter(p => p.status === 'below')
  const noBreakEven = programs.filter(p => p.status === 'no_breakeven')
  const surplus = programs.reduce((sum, p) => sum + p.result.profit, 0)

  /* หลักสูตรที่ต้องเพิ่มนิสิตมากที่สุดเพื่อให้ถึงจุดคุ้มทุน — เฉพาะกลุ่มที่ยังมีจุดคุ้มทุนอยู่ */
  const widestGap = [...below]
    .filter(p => p.result.qStar !== null)
    .sort((a, b) => (b.result.qStar as number) - b.result.q - ((a.result.qStar as number) - a.result.q))[0]

  const worst = [...programs]
    .filter(p => p.status !== 'ok')
    .sort((a, b) => a.result.profit - b.result.profit)
    .slice(0, 3)

  const items: Insight[] = [
    {
      tone: 'info',
      content: (
        <>
          จาก {fmtInt(programs.length)} หลักสูตร มี <b>{fmtInt(ok.length)}</b> หลักสูตรที่คุ้มทุนแล้ว,{' '}
          <b>{fmtInt(below.length)}</b> ยังไม่ถึงจุดคุ้มทุน และ <b>{fmtInt(noBreakEven.length)}</b> หลักสูตรที่ R ≤ AVC
          (ไม่มีจุดคุ้มทุน ณ ราคาปัจจุบัน)
        </>
      )
    }
  ]

  if (widestGap) {
    items.push({
      tone: 'warn',
      content: (
        <>
          หลักสูตรที่ต้องเพิ่มนิสิตมากสุดเพื่อคุ้มทุน: <b>{widestGap.name}</b> ({shortOrgName(widestGap.faculty)})
          ปัจจุบัน {fmtInt(widestGap.result.q)} คน ต้องการ {fmtInt(widestGap.result.qStar ?? 0)} คน — ขาดอีก{' '}
          {fmtInt((widestGap.result.qStar ?? 0) - widestGap.result.q)} คน
        </>
      )
    })
  }

  if (worst.length > 0) {
    items.push({
      tone: 'crit',
      content: (
        <>
          หลักสูตรขาดทุนสูงสุด:{' '}
          {worst.map((p, index) => (
            <span key={p.key}>
              {index > 0 && ', '}
              <b>{p.name}</b> ({fmtMillions(p.result.profit)} ลบ.)
            </span>
          ))}
        </>
      )
    })
  }

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หลักสูตรคุ้มทุน (Q ≥ Q*)'
          value={fmtInt(ok.length)}
          unit={`จาก ${fmtInt(programs.length)} หลักสูตร`}
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หลักสูตรยังไม่คุ้มทุน'
          value={fmtInt(below.length + noBreakEven.length)}
          unit='Q < Q* หรือ R ≤ AVC'
          color='error.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หลักสูตร R ≤ AVC'
          value={fmtInt(noBreakEven.length)}
          unit='ไม่มีจุดคุ้มทุน (ผันแปรสูงกว่ารายรับ)'
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ส่วนเกินรวมทั้งหมด'
          value={withSign(surplus, fmtMillions)}
          unit='ล้านบาท (สุทธิ)'
          color={surplus >= 0 ? 'success.main' : 'error.main'}
        />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ order: 99 }}>
        <InsightList title='ประเด็นสำคัญ — จุดคุ้มทุนรายหลักสูตร' items={items} />
      </Grid>
    </>
  )
}

export default BreakEvenSummary
