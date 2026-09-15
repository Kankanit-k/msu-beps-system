'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Style Imports
import { calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'

import tableStyles from '@core/styles/table.module.css'

// Calc Imports

// Component Imports
import CostItemList from './CostItemList'
import ScenarioResult from './ScenarioResult'
import type { CostItem } from './CostItemList'
import MiniStat from '@views/beps/shared/MiniStat'

// Type Imports
import type { EntityCatalog } from '@/server/beps/entities'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * เครื่องคำนวณจุดคุ้มทุนรายคณะ — ต้นฉบับ: mockup/W6-scenario-faculty.html
 *
 * เลือกคณะเพื่อดึงตัวเลขจริงมาเป็นจุดตั้งต้น แล้วปรับรายการ TFC/TVC เองได้ ผลที่ได้
 * แสดง **ทั้ง 2 ฐานรายได้พร้อมกัน** เพราะคำถามของหน้านี้คือ "ถ้าตัดเงินแผ่นดินแล้วยังคุ้มไหม"
 *
 * **Q* คำนวณด้วย calcBreakEvenBothModes ของ @beps/calc-engine** ไม่ใช่สูตรที่เขียนใหม่
 * ในหน้าจอแบบที่ mockup ทำ — ผลจากหน้านี้จึงเทียบกับผลจริงจากรอบคำนวณได้ตรงๆ
 */

type SavedScenario = {
  id: string
  name: string
  q: number
  tfc: number
  tvc: number
  avc: number
  qStarWithGov: number | null
  qStarWithoutGov: number | null
  isOk: boolean
}

type Props = {
  catalog: EntityCatalog
}

const FacultyScenario = ({ catalog, presets }: Props & { presets: { tfc: string[]; tvc: string[] } }) => {
  const [facultyName, setFacultyName] = useState('')
  const [q, setQ] = useState(0)
  const [governmentBudget, setGovernmentBudget] = useState(0)
  const [incomeBudget, setIncomeBudget] = useState(0)
  const [tfcItems, setTfcItems] = useState<CostItem[]>([])
  const [tvcItems, setTvcItems] = useState<CostItem[]>([])
  const [saved, setSaved] = useState<SavedScenario[]>([])

  const tfc = tfcItems.reduce((sum, item) => sum + item.amount, 0)
  const tvc = tvcItems.reduce((sum, item) => sum + item.amount, 0)
  const tc = tfc + tvc
  const tr = governmentBudget + incomeBudget
  const avc = q > 0 ? tvc / q : 0

  const canCalculate = q > 0 && tr > 0 && tc > 0

  const results = useMemo(
    () =>
      canCalculate ? calcBreakEvenBothModes({ q, governmentBudget, incomeBudget, tfc, tvc }, DEFAULT_POLICY) : null,
    [canCalculate, q, governmentBudget, incomeBudget, tfc, tvc]
  )

  /** ดึงตัวเลขจริงของคณะที่เลือกมาเป็นจุดตั้งต้น */
  const loadFaculty = (name: string) => {
    setFacultyName(name)

    const faculty = catalog.faculties.find(entity => entity.faculty === name)

    if (!faculty) return

    setQ(faculty.input.q)
    setGovernmentBudget(Math.round(faculty.input.governmentBudget))
    setIncomeBudget(Math.round(faculty.input.incomeBudget))
    setTfcItems([{ id: 'tfc-0', label: 'ต้นทุนคงที่รวม (TFC)', amount: Math.round(faculty.input.tfc) }])
    setTvcItems([{ id: 'tvc-0', label: 'ต้นทุนผันแปรรวม (TVC)', amount: Math.round(faculty.input.tvc) }])
  }

  const save = () => {
    if (!results) return

    setSaved(prev => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: facultyName || 'ไม่ระบุชื่อ',
        q,
        tfc,
        tvc,
        avc,
        qStarWithGov: results.with_government.qStar,
        qStarWithoutGov: results.without_government.qStar,
        isOk: results.with_government.qStar !== null && q >= results.with_government.qStar
      }
    ])
  }

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='ขั้นตอนที่ 1 — เลือกคณะ / หน่วยงาน'
            subheader='เลือกจากระบบเพื่อดึงข้อมูลอัตโนมัติ หรือกรอกเอง แล้วปรับแก้ได้'
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='เลือกคณะจากระบบ'
                  value={facultyName}
                  onChange={e => loadFaculty(e.target.value)}
                >
                  {catalog.faculties.map(faculty => (
                    <MenuItem key={faculty.id} value={faculty.faculty}>
                      {faculty.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='จำนวนนิสิต (Q)'
                  value={q || ''}
                  onChange={e => setQ(Number(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='งบเงินแผ่นดิน (บาท)'
                  value={governmentBudget || ''}
                  onChange={e => setGovernmentBudget(Number(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='งบเงินรายได้ (บาท)'
                  value={incomeBudget || ''}
                  onChange={e => setIncomeBudget(Number(e.target.value) || 0)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='bs-full'>
          <CardHeader title='ขั้นตอนที่ 2 — ต้นทุนคงที่ (TFC)' subheader='เลือกหมวดจากรายการ หรือกรอกเอง' />
          <CardContent>
            <CostItemList
              title='รายการต้นทุนคงที่'
              items={tfcItems}
              presets={presets.tfc}
              onChange={setTfcItems}
              color='primary'
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='bs-full'>
          <CardHeader title='ขั้นตอนที่ 3 — ต้นทุนผันแปร (TVC)' subheader='เลือกหมวดจากรายการ หรือกรอกเอง' />
          <CardContent>
            <CostItemList
              title='รายการต้นทุนผันแปร'
              items={tvcItems}
              presets={presets.tvc}
              onChange={setTvcItems}
              color='success'
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='bs-full'>
          <CardHeader title='สรุปตัวเลขก่อนคำนวณ' />
          <CardContent className='flex flex-col gap-4'>
            <div className='grid gap-3' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <MiniStat label='Q (นิสิต)' value={q > 0 ? fmtInt(q) : '—'} color='primary.main' />
              <MiniStat label='TR รวม' value={tr > 0 ? fmtInt(tr) : '—'} color='primary.main' />
              <MiniStat label='TC รวม' value={tc > 0 ? fmtInt(tc) : '—'} />
              <MiniStat label='TFC' value={tfc > 0 ? fmtInt(tfc) : '—'} color='primary.main' />
              <MiniStat label='TVC' value={tvc > 0 ? fmtInt(tvc) : '—'} color='warning.main' />
              <MiniStat label='AVC/หัว' value={avc > 0 ? fmtInt(avc) : '—'} color='warning.main' />
              <MiniStat label='R/หัว — รวมแผ่นดิน' value={q > 0 ? fmtInt(tr / q) : '—'} color='primary.main' />
              <MiniStat
                label='R/หัว — ไม่รวมแผ่นดิน'
                value={q > 0 ? fmtInt(incomeBudget / q) : '—'}
                color='warning.main'
              />
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='bs-full'>
          <CardHeader
            title='ผลการคำนวณ'
            subheader={canCalculate ? `${facultyName || 'ไม่ระบุชื่อ'} · คำนวณด้วย @beps/calc-engine` : null}
          />
          <CardContent className='flex flex-col gap-4'>
            {!results ? (
              <Typography color='text.disabled'>กรอกจำนวนนิสิต งบประมาณ และต้นทุนให้ครบก่อนคำนวณ</Typography>
            ) : (
              <>
                <Typography variant='caption' color='text.secondary'>
                  นิสิต {fmtInt(q)} คน · TFC {fmtMillions(tfc)} ล. · TVC {fmtMillions(tvc)} ล. · AVC {fmtInt(avc)} บ./คน
                </Typography>
                <ScenarioResult title='กรณีรวมเงินแผ่นดิน' result={results.with_government} color='primary' />
                <ScenarioResult title='กรณีไม่รวมเงินแผ่นดิน' result={results.without_government} color='warning' />
                <Button variant='contained' color='success' onClick={save} startIcon={<i className='ri-add-line' />}>
                  บันทึกลงรายการ
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='รายการที่บันทึก'
            subheader='เก็บไว้ในหน้าจอเท่านั้น — ยังไม่ได้บันทึกลงฐานข้อมูล (scenario_plan จะมาใน Phase 4)'
            action={
              saved.length > 0 && (
                <Button size='small' color='error' variant='outlined' onClick={() => setSaved([])}>
                  ล้างทั้งหมด
                </Button>
              )
            }
          />
          <CardContent>
            {saved.length === 0 ? (
              <Typography color='text.disabled'>ยังไม่มีรายการ</Typography>
            ) : (
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ชื่อ</th>
                      <th align='right'>Q</th>
                      <th align='right'>TFC (ล.)</th>
                      <th align='right'>AVC/หัว</th>
                      <th align='right'>Q* รวมแผ่นดิน</th>
                      <th align='right'>Q* ไม่รวม</th>
                      <th align='right'>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saved.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>
                          <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                        </td>
                        <td align='right'>{fmtInt(row.q)}</td>
                        <td align='right'>{fmtMillions(row.tfc)}</td>
                        <td align='right'>
                          <Typography color='warning.main'>{fmtInt(row.avc)}</Typography>
                        </td>
                        <td align='right'>{row.qStarWithGov === null ? '—' : fmtInt(row.qStarWithGov)}</td>
                        <td align='right'>{row.qStarWithoutGov === null ? '—' : fmtInt(row.qStarWithoutGov)}</td>
                        <td align='right'>
                          <Typography color={row.isOk ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
                            {row.isOk ? 'คุ้ม' : 'ไม่คุ้ม'}
                          </Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default FacultyScenario
