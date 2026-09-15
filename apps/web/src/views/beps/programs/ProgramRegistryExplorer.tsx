'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import Link from '@components/Link'
import HighlightText from '@views/beps/shared/HighlightText'
import MiniStat from '@views/beps/shared/MiniStat'
import TableToolbar from '@views/beps/shared/TableToolbar'

// Context Imports
import { useBeps } from '@/contexts/BepsContext'

// Type Imports
import type { ProgramRegistryEntry, ProgramState } from '@/server/beps/programs-registry'

// Data Imports
import { liveVersion } from '@/server/beps/programs-registry'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * ทะเบียนหลักสูตร + รุ่น มคอ. + ตรวจความพร้อม — ต้นฉบับ: mockup/W16-programs.html
 *
 * **สถานะกำหนดว่าหลักสูตรนั้นเข้าสู่การคำนวณหรือไม่** และจุดที่พลาดกันบ่อยคือ
 * "งดรับนิสิต ≠ ปิดหลักสูตร" — หลักสูตรที่งดรับยังมีนิสิตคงค้างและยังมีต้นทุน
 * ต้องคำนวณต่อ ถ้าตัดออกจากยอดรวมจะทำให้ต้นทุนหายไปทั้งก้อน
 */

const stateColor: Record<ProgramState, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'success',
  REVISING: 'info',
  SUSPENDED: 'warning',
  CLOSED: 'error'
}

type StateFilter = 'all' | ProgramState

const FILTERS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ACTIVE', label: 'เปิดสอน' },
  { value: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'REVISING', label: 'ปรับปรุง' },
  { value: 'SUSPENDED', label: 'งดรับ' },
  { value: 'CLOSED', label: 'ปิด' }
]

type Props = {
  programs: ProgramRegistryEntry[]
}

const ProgramRegistryExplorer = ({ programs }: Props) => {
  const { revenueMode, run } = useBeps()
  const [filter, setFilter] = useState<StateFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedCode, setSelectedCode] = useState(programs[0]?.code ?? '')

  const query = search.trim().toLowerCase()

  const rows = programs
    .filter(program => filter === 'all' || program.state === filter)
    .filter(
      program =>
        !query ||
        [program.code, program.name, program.faculty, program.degree].some(value => value.toLowerCase().includes(query))
    )

  const selected = programs.find(program => program.code === selectedCode) ?? programs[0]
  const selectedLive = selected ? liveVersion(selected.versions) : null
  const selectedResult = selected?.actual ? selected.actual.byMode[revenueMode] : null
  const passed = selected ? selected.readiness.filter(check => check.passed).length : 0

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder='ค้นหารหัส / ชื่อหลักสูตร / คณะ…'
            filters={FILTERS}
            filter={filter}
            onFilterChange={setFilter}
          />
          <Chip size='small' variant='tonal' color='primary' label={`${rows.length} จาก ${programs.length} หลักสูตร`} />
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title='ทะเบียนหลักสูตร'
            subheader={
              <>
                คลิกแถวเพื่อดูรุ่นหลักสูตรและการดำเนินการ · ตาราง <code>program</code>
              </>
            }
          />
          <CardContent>
            <div className='overflow-auto' style={{ maxBlockSize: 560 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>รหัสหลักสูตร</th>
                    <th>ชื่อหลักสูตร / คณะ</th>
                    <th>ระดับ</th>
                    <th align='right'>นิสิต (Q)</th>
                    <th align='right'>รุ่น มคอ.</th>
                    <th>สถานะ</th>
                    <th align='center'>คำนวณ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} align='center'>
                        <Typography color='text.disabled'>ไม่พบหลักสูตรที่ตรงกับตัวกรอง</Typography>
                      </td>
                    </tr>
                  ) : (
                    rows.map(program => {
                      const live = liveVersion(program.versions)
                      const draft = program.versions.find(version => version.isDraft)

                      return (
                        <tr
                          key={program.code}
                          onClick={() => setSelectedCode(program.code)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor:
                              program.code === selectedCode ? 'var(--mui-palette-primary-lighterOpacity)' : undefined
                          }}
                        >
                          <td>
                            <Typography component='code' variant='body2' color='primary.main'>
                              {program.code}
                            </Typography>
                          </td>
                          <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                            {/* component='div' เพราะมี <Chip> (ซึ่งเป็น div) อยู่ข้างใน — <div> ใน <p> ทำให้ hydration ไม่ตรง */}
                            <Typography component='div' sx={{ fontWeight: 600 }}>
                              <HighlightText text={program.name} query={query} />
                              {program.isInternational && (
                                <Chip size='small' variant='tonal' color='primary' label='นานาชาติ' className='mis-2' />
                              )}
                            </Typography>
                            <Typography variant='caption' color='text.disabled'>
                              {program.faculty}
                            </Typography>
                          </td>
                          <td>
                            <Typography variant='body2' color='text.secondary'>
                              {program.level}
                            </Typography>
                          </td>
                          <td align='right'>
                            {program.actual ? (
                              fmtInt(program.actual.q)
                            ) : program.proposedQ ? (
                              <Typography color='text.disabled'>~{fmtInt(program.proposedQ)}</Typography>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td align='right'>
                            <Typography component='code' variant='body2'>
                              {live?.version}
                            </Typography>
                            {draft && (
                              <Typography variant='caption' color='text.disabled' component='div'>
                                +{draft.version} ร่าง
                              </Typography>
                            )}
                          </td>
                          <td>
                            <Chip
                              size='small'
                              variant='tonal'
                              color={stateColor[program.state]}
                              label={program.stateLabel}
                            />
                          </td>
                          <td align='center'>
                            <Typography
                              component='i'
                              className={program.includedInCalculation ? 'ri-check-line' : 'ri-subtract-line'}
                              color={program.includedInCalculation ? 'success.main' : 'text.disabled'}
                              title={program.stateReason}
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={selected?.name ?? '—'}
                subheader={
                  selected ? (
                    <>
                      <code>{selected.code}</code> · {selected.faculty} · {selected.level}
                    </>
                  ) : null
                }
                action={
                  selected && (
                    <Chip size='small' variant='tonal' color={stateColor[selected.state]} label={selected.stateLabel} />
                  )
                }
              />
              <CardContent className='flex flex-col gap-4'>
                <Typography variant='body2' color={selected?.includedInCalculation ? 'success.main' : 'text.secondary'}>
                  {selected?.includedInCalculation ? 'เข้าสู่การคำนวณ — ' : 'ไม่เข้าสู่การคำนวณ — '}
                  {selected?.stateReason}
                </Typography>

                <div className='grid gap-4' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                  <MiniStat
                    label='นิสิตปัจจุบัน'
                    value={
                      selected?.actual
                        ? fmtInt(selected.actual.q)
                        : selected?.proposedQ
                          ? `~${fmtInt(selected.proposedQ)}`
                          : '—'
                    }
                    sub={
                      selected?.actual
                        ? 'คน · จากระบบทะเบียน'
                        : selected?.proposedQ
                          ? 'คน · ประมาณการในข้อเสนอ'
                          : 'ยังไม่มีข้อมูล'
                    }
                    color='primary.main'
                  />
                  <MiniStat
                    label='จุดคุ้มทุน Q*'
                    value={selectedResult?.qStar != null ? fmtInt(selectedResult.qStar) : '—'}
                    sub={
                      selectedResult
                        ? selectedResult.qStar != null
                          ? `คน · จากรอบคำนวณ #${run.id}`
                          : 'R ≤ AVC'
                        : 'ยังคำนวณไม่ได้'
                    }
                    color='warning.main'
                  />
                </div>

                <div>
                  <Typography variant='caption' color='text.secondary'>
                    ชื่อปริญญา (degree_name)
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selected?.degree}</Typography>
                </div>

                <Typography variant='caption' color='text.secondary'>
                  <code>program_code</code> เป็น UNIQUE ใช้จับคู่ข้ามระบบ · หน่วยงานผูกที่ระดับ{' '}
                  <code>EDUCATION_LEVEL</code> ไม่ใช่ระดับคณะ เพราะต้นทุนสำนักงานปันแยกตรี/บัณฑิต
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title='รุ่นหลักสูตร (รอบ มคอ.)'
                subheader={
                  <>
                    ตาราง <code>program_version</code> · ทุกตัวเลขในระบบผูกกับรุ่น ไม่ใช่ผูกกับหลักสูตร
                  </>
                }
              />
              <CardContent className='flex flex-col gap-3'>
                {selected?.versions.map(version => {
                  const isLive = !version.isDraft && version.to === null

                  return (
                    <Box
                      key={version.version}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '8px 1fr',
                        gap: 3,
                        opacity: version.isDraft ? 0.75 : 1,
                        paddingBlockEnd: 3,
                        borderBlockEnd: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box
                        sx={{
                          borderRadius: 1,
                          backgroundColor: isLive
                            ? 'primary.main'
                            : version.isDraft
                              ? 'warning.main'
                              : 'action.disabledBackground'
                        }}
                      />
                      <div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <Typography component='code' variant='body2' color='primary.main' sx={{ fontWeight: 700 }}>
                            รุ่น {version.version}
                          </Typography>
                          <Typography variant='caption' color='text.disabled'>
                            {version.from} – {version.to === null ? 'ปัจจุบัน' : version.to}
                          </Typography>
                          {isLive && <Chip size='small' variant='tonal' color='success' label='รุ่นที่ใช้คำนวณ' />}
                          {version.isDraft && (
                            <Chip size='small' variant='tonal' color='warning' label='ร่าง · ยังไม่มีผล' />
                          )}
                        </div>
                        <Typography variant='caption' color='text.secondary'>
                          {version.note || 'ไม่มีหมายเหตุ'}
                        </Typography>
                      </div>
                    </Box>
                  )
                })}

                <Typography variant='caption' color='text.disabled'>
                  {(selected?.versions.length ?? 0) > 1
                    ? 'หลักสูตรนี้มีมากกว่าหนึ่งรุ่น — รายงานปีเก่ายังอ้างรุ่นเดิมและไม่เปลี่ยนตามรุ่นใหม่'
                    : 'หลักสูตรนี้ยังมีรุ่นเดียว — ยังไม่เคยผ่านการปรับปรุงรอบ มคอ. ในระบบ'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title='ตรวจก่อนเปลี่ยนสถานะเป็น "เปิดสอน"'
            subheader={
              selected ? (
                <>
                  {selected.name} ({selected.level}) — ผ่าน {passed}/{selected.readiness.length} ข้อ · รุ่นที่มีผล{' '}
                  {selectedLive?.version}
                </>
              ) : null
            }
          />
          <CardContent className='flex flex-col gap-3'>
            {selected?.readiness.map(check => (
              <Box key={check.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Typography
                  component='i'
                  className={check.passed ? 'ri-check-line' : 'ri-close-line'}
                  color={check.passed ? 'success.main' : 'error.main'}
                />
                <div className='flex-1'>
                  <Typography sx={{ fontWeight: 600 }} color={check.passed ? 'text.primary' : 'error.main'}>
                    {check.label}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' component='div'>
                    {check.detail}
                  </Typography>
                </div>
                {!check.passed && check.href && (
                  <Link href={check.href}>
                    <Typography variant='body2' color='primary.main'>
                      ไปแก้
                    </Typography>
                  </Link>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default ProgramRegistryExplorer
