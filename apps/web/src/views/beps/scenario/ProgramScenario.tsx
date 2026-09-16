'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Style Imports
import { calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'

import tableStyles from '@core/styles/table.module.css'

// Calc Imports

// Component Imports
import BreakEvenChart from '@views/beps/be-chart/BreakEvenChart'
import MiniStat from '@views/beps/shared/MiniStat'
import AdmissionMixPanel from './AdmissionMixPanel'
import ProgramReferenceNote from './ProgramReferenceNote'
import ProgramReportDialog from './ProgramReportDialog'
import ScenarioResult from './ScenarioResult'
import type { ProgramScenarioSnapshot } from './ProgramReportDialog'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { EntityCatalog } from '@/server/beps/entities'

// Data Imports
import { LEVEL_ORDER } from '@/server/beps/entities'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * เครื่องคำนวณจุดคุ้มทุนรายหลักสูตร — ต้นฉบับ: mockup/W7-scenario-program.html
 *
 * 2 โหมด: **หลักสูตรเดิม** ดึงตัวเลขจริงจากระบบมาเป็นจุดตั้งต้น · **หลักสูตรใหม่** กรอกเอง
 * ทั้งหมด (ใช้ตอนเสนอเปิดหลักสูตรที่ยังไม่มีนิสิตจริง — ดู W16)
 *
 * Q* คำนวณด้วย @beps/calc-engine เช่นเดียวกับทุกหน้า ผลจึงเทียบกับตัวเลขจริงได้ตรงๆ
 */

type HistoryRow = ProgramScenarioSnapshot & { id: string; at: string }

type Props = {
  catalog: EntityCatalog
}

const ProgramScenario = ({ catalog }: Props) => {
  const { revenueMode, includesGovernment } = useBeps()

  const [isNewProgram, setIsNewProgram] = useState(false)
  const [faculty, setFaculty] = useState('')
  const [programId, setProgramId] = useState('')
  const [customName, setCustomName] = useState('')
  const [customFaculty, setCustomFaculty] = useState('')
  const [level, setLevel] = useState(LEVEL_ORDER[0])

  const [q, setQ] = useState(0)
  const [governmentBudget, setGovernmentBudget] = useState(0)
  const [incomeBudget, setIncomeBudget] = useState(0)
  const [tfc, setTfc] = useState(0)
  const [tvc, setTvc] = useState(0)

  const [history, setHistory] = useState<HistoryRow[]>([])
  const [isReportOpen, setIsReportOpen] = useState(false)

  const programsOfFaculty = catalog.programs.filter(entity => entity.faculty === faculty)
  const selectedProgram = catalog.programs.find(entity => entity.id === programId)

  const tc = tfc + tvc
  const tr = governmentBudget + incomeBudget
  const canCalculate = q > 0 && tr > 0 && tc > 0

  const results = useMemo(
    () =>
      canCalculate ? calcBreakEvenBothModes({ q, governmentBudget, incomeBudget, tfc, tvc }, DEFAULT_POLICY) : null,
    [canCalculate, q, governmentBudget, incomeBudget, tfc, tvc]
  )

  /**
   * ผลการคำนวณจาก **ค่าจริง** ของหลักสูตรที่เลือก (ไม่ใช่ค่าที่ผู้ใช้แก้ในช่องกรอก)
   * ใช้เป็นจุดอ้างอิงในกล่องสรุปด้านบน — ดู ProgramReferenceNote
   */
  const referenceResults = useMemo(
    () => (selectedProgram ? calcBreakEvenBothModes(selectedProgram.input, DEFAULT_POLICY) : null),
    [selectedProgram]
  )

  const loadProgram = (id: string) => {
    setProgramId(id)

    const program = catalog.programs.find(entity => entity.id === id)

    if (!program) return

    setLevel(program.level ?? LEVEL_ORDER[0])
    setQ(program.input.q)
    setGovernmentBudget(Math.round(program.input.governmentBudget))
    setIncomeBudget(Math.round(program.input.incomeBudget))
    setTfc(Math.round(program.input.tfc))
    setTvc(Math.round(program.input.tvc))
  }

  const name = isNewProgram ? customName || 'หลักสูตรใหม่' : (selectedProgram?.shortName ?? 'ไม่ระบุ')
  const facultyName = isNewProgram ? customFaculty : faculty

  const snapshot: ProgramScenarioSnapshot | null = results
    ? { name, faculty: facultyName, level, isNewProgram, q, governmentBudget, incomeBudget, tfc, tvc, byMode: results }
    : null

  const calculate = () => {
    if (!snapshot) return

    setHistory(prev => [{ ...snapshot, id: `${Date.now()}`, at: new Date().toLocaleTimeString('th-TH') }, ...prev])
  }

  const switchMode = (next: boolean) => {
    setIsNewProgram(next)
    setFaculty('')
    setProgramId('')
    setQ(0)
    setGovernmentBudget(0)
    setIncomeBudget(0)
    setTfc(0)
    setTvc(0)
  }

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='กรอกข้อมูลหลักสูตร'
            subheader='หลักสูตรเดิมดึงข้อมูลจากระบบอัตโนมัติ · หลักสูตรใหม่กรอกเอง'
            action={
              <Button
                variant='contained'
                disabled={history.length === 0}
                onClick={() => setIsReportOpen(true)}
                startIcon={<i className='ri-printer-line' />}
              >
                ออกรายงาน PDF
              </Button>
            }
            sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='ประเภทหลักสูตร'
                  value={isNewProgram ? 'new' : 'old'}
                  onChange={e => switchMode(e.target.value === 'new')}
                >
                  <MenuItem value='old'>หลักสูตรเดิม (Existing)</MenuItem>
                  <MenuItem value='new'>หลักสูตรใหม่ (New)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='ระดับการศึกษา'
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                >
                  {LEVEL_ORDER.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {isNewProgram ? (
                <>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size='small'
                      label='ชื่อหลักสูตร (กรอกเอง)'
                      placeholder='เช่น วิทยาการปัญญาประดิษฐ์'
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size='small'
                      label='สังกัดคณะ (กรอกเอง)'
                      placeholder='เช่น คณะวิทยาศาสตร์'
                      value={customFaculty}
                      onChange={e => setCustomFaculty(e.target.value)}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      select
                      fullWidth
                      size='small'
                      label='สังกัดคณะ / วิทยาลัย'
                      value={faculty}
                      onChange={e => {
                        setFaculty(e.target.value)
                        setProgramId('')
                      }}
                    >
                      {catalog.faculties.map(entity => (
                        <MenuItem key={entity.id} value={entity.faculty}>
                          {entity.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      select
                      fullWidth
                      size='small'
                      label='ชื่อหลักสูตร'
                      value={programId}
                      onChange={e => loadProgram(e.target.value)}
                      disabled={!faculty}
                    >
                      {programsOfFaculty.map(entity => (
                        <MenuItem key={entity.id} value={entity.id}>
                          {entity.shortName} ({entity.level})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              <Grid size={{ xs: 12 }}>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      label='จำนวนนิสิต (Q)'
                      value={q || ''}
                      onChange={e => setQ(Number(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      label='งบเงินแผ่นดิน'
                      value={governmentBudget || ''}
                      onChange={e => setGovernmentBudget(Number(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      label='งบเงินรายได้'
                      value={incomeBudget || ''}
                      onChange={e => setIncomeBudget(Number(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      label='TFC รวม'
                      value={tfc || ''}
                      onChange={e => setTfc(Number(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      label='TVC รวม'
                      value={tvc || ''}
                      onChange={e => setTvc(Number(e.target.value) || 0)}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {selectedProgram && referenceResults && !isNewProgram && (
                <Grid size={{ xs: 12 }}>
                  <ProgramReferenceNote program={selectedProgram} results={referenceResults} />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Button
                  variant='contained'
                  disabled={!canCalculate}
                  onClick={calculate}
                  startIcon={<i className='ri-play-line' />}
                >
                  คำนวณจุดคุ้มทุน
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {results && (
        <>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card className='bs-full'>
              <CardHeader
                title={name}
                subheader={`${facultyName || '—'} · ${level} · ${isNewProgram ? 'หลักสูตรใหม่' : 'หลักสูตรเดิม'}`}
              />
              <CardContent className='flex flex-col gap-4'>
                <div className='grid gap-3' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  <MiniStat label='รายได้รวม (TR)' value={`${fmtMillions(tr)} ล.`} color='primary.main' />
                  <MiniStat label='ต้นทุนรวม (TC)' value={`${fmtMillions(tc)} ล.`} />
                  <MiniStat label='ต้นทุนคงที่ (TFC)' value={`${fmtMillions(tfc)} ล.`} color='primary.main' />
                  <MiniStat label='ต้นทุนผันแปร (TVC)' value={`${fmtMillions(tvc)} ล.`} color='warning.main' />
                  <MiniStat
                    label='AVC ต่อหน่วย'
                    value={`${fmtInt(results.with_government.avc ?? 0)} บ.`}
                    color='warning.main'
                  />
                  <MiniStat label='นิสิตจริง (Q)' value={`${fmtInt(q)} คน`} />
                </div>

                <ScenarioResult
                  title='กรณีรวมเงินแผ่นดิน'
                  result={results.with_government}
                  color='primary'
                  profitDisplay='percent'
                />
                <ScenarioResult
                  title='กรณีไม่รวมเงินแผ่นดิน'
                  result={results.without_government}
                  color='warning'
                  profitDisplay='percent'
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <BreakEvenChart result={results[revenueMode]} />
          </Grid>

          <AdmissionMixPanel
            level={level}
            q={q}
            tfc={tfc}
            tvc={tvc}
            revenueMode={revenueMode}
            revenueModeLabel={includesGovernment ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'}
          />
        </>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='ประวัติการคำนวณ'
            subheader='เก็บไว้ในหน้าจอเท่านั้น — ยังไม่ได้บันทึกลง scenario_plan'
            action={
              history.length > 0 && (
                <Button size='small' color='error' variant='outlined' onClick={() => setHistory([])}>
                  ล้าง
                </Button>
              )
            }
          />
          <CardContent>
            {history.length === 0 ? (
              <Typography color='text.disabled'>ยังไม่มีประวัติ</Typography>
            ) : (
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>หลักสูตร</th>
                      <th>ระดับ</th>
                      <th>ประเภท</th>
                      <th align='right'>Q</th>
                      <th align='right'>AVC</th>
                      <th align='right'>Q* รวมแผ่นดิน</th>
                      <th align='right'>Q* ไม่รวม</th>
                      <th align='right'>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => {
                      const withGov = row.byMode.with_government
                      const withoutGov = row.byMode.without_government
                      const isOk = withGov.qStar !== null && row.q >= withGov.qStar

                      return (
                        <tr key={row.id}>
                          <td>
                            <Typography variant='caption' color='text.disabled'>
                              {row.at}
                            </Typography>
                          </td>
                          <td>
                            <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                          </td>
                          <td>
                            <Typography variant='body2' color='text.secondary'>
                              {row.level}
                            </Typography>
                          </td>
                          <td>
                            <Chip
                              size='small'
                              variant='tonal'
                              color={row.isNewProgram ? 'primary' : 'warning'}
                              label={row.isNewProgram ? 'ใหม่' : 'เดิม'}
                            />
                          </td>
                          <td align='right'>{fmtInt(row.q)}</td>
                          <td align='right'>
                            <Typography color='warning.main'>{fmtInt(withGov.avc ?? 0)}</Typography>
                          </td>
                          <td align='right'>
                            <Typography
                              color={withGov.qStar !== null && row.q >= withGov.qStar ? 'success.main' : 'error.main'}
                            >
                              {withGov.qStar === null ? '—' : fmtInt(withGov.qStar)}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Typography
                              color={
                                withoutGov.qStar !== null && row.q >= withoutGov.qStar ? 'success.main' : 'error.main'
                              }
                            >
                              {withoutGov.qStar === null ? '—' : fmtInt(withoutGov.qStar)}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Chip
                              size='small'
                              variant='tonal'
                              color={isOk ? 'success' : 'error'}
                              label={isOk ? 'คุ้มทุน' : 'ยังไม่คุ้ม'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>

      {history[0] && (
        <ProgramReportDialog
          open={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          snapshot={history[0]}
          revenueMode={revenueMode}
          revenueModeLabel={includesGovernment ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'}
        />
      )}
    </>
  )
}

export default ProgramScenario
