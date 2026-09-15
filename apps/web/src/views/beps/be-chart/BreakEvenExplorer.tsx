'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'

// Calc Imports
import { calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'
import AnalysisSummary from './AnalysisSummary'
import BreakEvenChart from './BreakEvenChart'
import EntitySelector from './EntitySelector'
import Recommendations from './Recommendations'
import type { Selection } from './EntitySelector'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { EntityCatalog } from '@/server/beps/entities'
import type { UniversityTotals } from '@/server/beps/university'

// Data Imports
import { breakEvenStatus } from '@/server/beps/status'

// Util Imports
import { fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * หน้า W3 ทั้งหน้า — ต้นฉบับ: mockup/W3-chart.html + assets/page-chart.js
 *
 * หน่วยวิเคราะห์เลือกได้ 300 กว่าหน่วย จึงไม่ส่งผลคำนวณของทุกหน่วยลงมา แต่ส่งค่าตั้งต้น
 * แล้วเรียก calcBreakEven ของ @beps/calc-engine ตรงนี้กับหน่วยที่เลือกอยู่หน่วยเดียว —
 * เป็นเครื่องคำนวณตัวเดียวกับที่ฝั่ง server ใช้ ไม่ใช่สูตรชุดที่สอง
 */

type Props = {
  catalog: EntityCatalog
  totals: UniversityTotals
}

const BreakEvenExplorer = ({ catalog, totals }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()

  /* ตั้งต้นที่หลักสูตรแรกของคณะแรก เหมือน mockup ที่เลือก "รายหลักสูตร" ไว้เป็นค่าเริ่มต้น */
  const [selection, setSelection] = useState<Selection>(() => {
    const faculty = catalog.faculties[0]?.faculty ?? ''
    const level = catalog.facultyLevels.find(e => e.faculty === faculty)?.level ?? ''
    const program = catalog.programs.find(e => e.faculty === faculty && e.level === level)

    return { kind: 'program', faculty, level, programId: program?.id ?? '' }
  })

  const entity = useMemo(() => {
    if (selection.kind === 'university') return catalog.university

    if (selection.kind === 'faculty') {
      return catalog.faculties.find(e => e.faculty === selection.faculty) ?? catalog.university
    }

    if (selection.kind === 'faculty_level') {
      return (
        catalog.facultyLevels.find(e => e.faculty === selection.faculty && e.level === selection.level) ??
        catalog.university
      )
    }

    return catalog.programs.find(e => e.id === selection.programId) ?? catalog.university
  }, [catalog, selection])

  const result = useMemo(
    () => calcBreakEven({ ...entity.input, revenueMode }, DEFAULT_POLICY),
    [entity.input, revenueMode]
  )

  const withoutGovernment = useMemo(
    () => calcBreakEven({ ...entity.input, revenueMode: 'without_government' }, DEFAULT_POLICY),
    [entity.input]
  )

  const status = breakEvenStatus(result)
  const r = result.r ?? 0
  const avc = result.avc ?? 0

  const kpis: {
    label: string
    value: string
    unit: string
    color?: 'primary.main' | 'error.main' | 'warning.main' | 'success.main'
  }[] = [
    { label: 'นิสิตปัจจุบัน (Q)', value: fmtInt(result.q), unit: 'คน', color: 'primary.main' },
    {
      label: 'จุดคุ้มทุน (Q*)',
      value: result.qStar === null ? 'ไม่มี' : fmtInt(result.qStar),
      unit: result.qStar === null ? 'R ≤ AVC' : 'คน',
      color: 'error.main'
    },
    { label: 'รายได้/หัว (R)', value: fmtInt(r), unit: 'บาท/คน', color: 'warning.main' },
    { label: 'ต้นทุนผันแปร/หัว (AVC)', value: fmtInt(avc), unit: 'บาท/คน', color: 'warning.main' },
    { label: 'กำไรส่วนเกิน/หัว (R−AVC)', value: fmtInt(r - avc), unit: 'บาท/คน', color: 'success.main' },
    {
      label: 'ส่วนเกิน/ขาดทุน',
      value: withSign(result.profit, fmtMillions),
      unit: 'ล้านบาท',
      color: result.profit >= 0 ? 'success.main' : 'error.main'
    }
  ]

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <EntitySelector catalog={catalog} selection={selection} onChange={setSelection} />
          </CardContent>
        </Card>
      </Grid>

      {kpis.map(kpi => (
        <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard label={kpi.label} value={kpi.value} unit={kpi.unit} color={kpi.color} />
        </Grid>
      ))}

      <Grid size={{ xs: 12, lg: 7 }}>
        <BreakEvenChart result={result} />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <AnalysisSummary name={entity.name} result={result} status={status} />
      </Grid>

      <Recommendations
        entity={entity}
        result={result}
        withoutGovernment={withoutGovernment}
        status={status}
        includesGovernment={includesGovernment}
        totals={totals}
      />
    </>
  )
}

export default BreakEvenExplorer
