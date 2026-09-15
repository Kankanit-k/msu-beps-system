'use client'

// Component Imports
import type { RevenueMode } from '@beps/calc-engine'

import InsightList from '@views/beps/shared/InsightList'
import type { Insight } from '@views/beps/shared/InsightList'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { CrossMetrics } from '@/server/beps/cross'

// Util Imports
import { fmtDec, fmtInt } from '@/utils/beps-format'

/**
 * ประเด็นสำคัญของ W5 — ย้ายจากส่วน insights ของ mockup/assets/page-cross.js
 *
 * จัดคณะเป็น 4 กลุ่มตามแกน Utilization × กำไร แล้วชี้กลุ่มที่ต้องจัดการก่อน
 * คณะที่ CM ≤ 0 แยกออกมาต่างหากเพราะแก้ด้วยการเพิ่มนิสิตไม่ได้ ต้องแก้ที่ราคาหรือต้นทุน
 */

type Props = {
  byMode: Record<RevenueMode, CrossMetrics[]>
}

const CrossInsights = ({ byMode }: Props) => {
  const { revenueMode } = useBeps()
  const all = byMode[revenueMode]

  const valid = all.filter(row => row.hasBreakEven)
  const invalid = all.filter(row => !row.hasBreakEven)

  const stars = valid.filter(row => row.utilization >= 100 && row.profitPct >= 0)
  const growth = valid.filter(row => row.utilization >= 100 && row.profitPct < 0)
  const recover = valid.filter(row => row.utilization < 100 && row.profitPct >= 0)
  const risk = valid.filter(row => row.utilization < 100 && row.profitPct < 0)
  const highAvc = valid.filter(row => row.avcToRevenue >= 50)

  const totalPrograms = all.reduce((sum, row) => sum + row.programCount, 0)
  const okPrograms = all.reduce((sum, row) => sum + row.programsBreakingEven, 0)

  const items: Insight[] = [
    {
      tone: 'info',
      content: (
        <>
          <b>จัดกลุ่ม 4 กลุ่ม</b>: ⭐ Stars <b>{stars.length}</b> · 📈 Growth <b>{growth.length}</b> · 🔄 Recover{' '}
          <b>{recover.length}</b> · ⚠️ Risk <b>{risk.length}</b>
          {invalid.length > 0 && (
            <>
              {' '}
              · ไม่มี Q* <b>{invalid.length}</b>
            </>
          )}
        </>
      )
    }
  ]

  if (risk.length > 0) {
    items.push({
      tone: 'crit',
      content: (
        <>
          <b>กลุ่ม Risk — {risk.length} คณะ</b> (นิสิตไม่ถึง Q* และขาดทุน):{' '}
          {[...risk]
            .sort((a, b) => a.profitPct - b.profitPct)
            .slice(0, 3)
            .map(row => `${row.shortName} (Util ${row.utilization}% · ${row.profitPct}%)`)
            .join(', ')}
        </>
      )
    })
  }

  if (invalid.length > 0) {
    items.push({
      tone: 'crit',
      content: (
        <>
          <b>{invalid.length} คณะมี CM ≤ 0</b>:{' '}
          {invalid.map(row => `${row.shortName} (CM ${fmtInt(row.cm)})`).join(', ')} → Q* ใช้ TC ÷ ค่าเทอม (สูตร 7) ·
          ควรขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปร เพิ่มนิสิตอย่างเดียวไม่ช่วย
        </>
      )
    })
  }

  if (stars.length > 0) {
    items.push({
      tone: 'ok',
      content: (
        <>
          <b>กลุ่ม Stars — {stars.length} คณะ</b> (เกิน Q* และมีกำไร):{' '}
          {[...stars]
            .sort((a, b) => b.profitPct - a.profitPct)
            .slice(0, 3)
            .map(row => `${row.shortName} (+${row.profitPct}%)`)
            .join(', ')}
        </>
      )
    })
  }

  if (highAvc.length > 0) {
    items.push({
      tone: 'warn',
      content: (
        <>
          <b>{highAvc.length} คณะมี AVC/R ≥ 50%</b> (ต้นทุนผันแปรกินรายได้เกินครึ่ง) — ขาดทุน{' '}
          <b>
            {highAvc.filter(row => row.profitPct < 0).length}/{highAvc.length}
          </b>{' '}
          คณะ
        </>
      )
    })
  }

  if (totalPrograms > 0) {
    items.push({
      tone: okPrograms / totalPrograms >= 0.5 ? 'ok' : 'crit',
      content: (
        <>
          ภาพรวม:{' '}
          <b>
            {fmtInt(okPrograms)}/{fmtInt(totalPrograms)} หลักสูตรถึงจุดคุ้มทุน (
            {fmtDec((okPrograms / totalPrograms) * 100, 0)}%)
          </b>{' '}
          ในฐานรายได้นี้
        </>
      )
    })
  }

  return <InsightList title='ประเด็นสำคัญ — Cross Analysis' items={items} />
}

export default CrossInsights
