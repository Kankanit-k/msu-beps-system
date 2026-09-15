'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import KpiCard from '@views/beps/shared/KpiCard'
import SplitBar from '@views/beps/shared/SplitBar'

// Type Imports
import type { AccountEntry, CostBehavior } from '@/server/beps/account-rules'
import type { UniversityTotals } from '@/server/beps/university'

// Data Imports
import { ruleAtYear } from '@/server/beps/account-rules'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * หน้า W14 ทั้งหน้า — ต้นฉบับ: mockup/W14-account-rules.html
 *
 * เลือก "ปีการศึกษาที่ดู" แล้วตารางแสดงเฉพาะกติกาที่มีผลในปีนั้น · คลิกแถวเพื่อดู
 * **ไทม์ไลน์รายปี** ของบัญชีเดียวกัน ซึ่งเป็นหัวใจของหน้านี้: บัญชีเดียวกันเปลี่ยนประเภท
 * ตามปีได้ และปีที่คำนวณไปแล้วต้องไม่เปลี่ยนตาม
 */

const behaviorColor: Record<CostBehavior, 'primary' | 'warning' | 'success' | 'error'> = {
  FIXED: 'primary',
  VARIABLE: 'warning',
  MIXED: 'success',
  UNCLASSIFIED: 'error'
}

type BehaviorFilter = 'all' | CostBehavior

type Props = {
  accounts: AccountEntry[]
  years: number[]
  totals: UniversityTotals
}

const AccountRuleExplorer = ({ accounts, years, totals }: Props) => {
  const [year, setYear] = useState(years[0])
  const [filter, setFilter] = useState<BehaviorFilter>('all')
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? '')

  const withRule = useMemo(
    () => accounts.map(account => ({ account, rule: ruleAtYear(account, year) })).filter(x => x.rule !== null),
    [accounts, year]
  )

  const rows = withRule.filter(({ rule }) => filter === 'all' || rule?.behavior === filter)

  const unclassified = withRule.filter(({ rule }) => rule?.behavior === 'UNCLASSIFIED')
  const unclassifiedAmount = unclassified.reduce((sum, { account }) => sum + account.amount, 0)

  const selected = accounts.find(account => account.id === selectedId) ?? accounts[0]
  const selectedRule = selected ? ruleAtYear(selected, year) : null

  const { tfc, tvc } = totals.byMode.with_government

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ต้นทุนคงที่ (TFC)'
          value={fmtMillions(tfc)}
          unit={`ล้านบาท · ${fmtDec(totals.fixedCostShare)}% ของต้นทุนรวม`}
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ต้นทุนผันแปร (TVC)'
          value={fmtMillions(tvc)}
          unit={`ล้านบาท · ${fmtDec(totals.variableCostShare)}% ของต้นทุนรวม`}
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='กติกาที่มีผลในปีที่เลือก' value={fmtInt(withRule.length)} unit='คีย์ผสม' color='success.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ยังไม่จำแนก'
          value={fmtInt(unclassified.length)}
          unit={`รายการ · ${fmtMillions(unclassifiedAmount)} ลบ. พักไว้ที่หน่วยงาน`}
          color='error.main'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <TextField
            select
            size='small'
            label='ปีการศึกษาที่ดู'
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ minInlineSize: 160 }}
          >
            {years.map(value => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            exclusive
            size='small'
            color='primary'
            value={filter}
            onChange={(_, next: BehaviorFilter | null) => next && setFilter(next)}
          >
            <ToggleButton value='all' sx={{ textTransform: 'none' }}>
              ทั้งหมด
            </ToggleButton>
            <ToggleButton value='MIXED' sx={{ textTransform: 'none' }}>
              แบ่งสัดส่วน
            </ToggleButton>
            <ToggleButton value='UNCLASSIFIED' sx={{ textTransform: 'none' }}>
              ยังไม่จำแนก
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title={`กติกาที่มีผลในปีการศึกษา ${year}`}
            subheader={`คลิกแถวเพื่อดูไทม์ไลน์รายปีของบัญชีเดียวกัน · แสดง ${rows.length} จาก ${accounts.length} คีย์`}
          />
          <CardContent>
            <div className='overflow-auto' style={{ maxBlockSize: 560 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>คีย์ผสม 4 ระดับ</th>
                    <th>ชื่อบัญชี</th>
                    <th align='right'>ยอด (ลบ.)</th>
                    <th>ประเภท</th>
                    <th align='right'>F : V</th>
                    <th>วิธีปันส่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} align='center'>
                        <Typography color='text.disabled'>ไม่มีกติกาที่ตรงกับตัวกรอง</Typography>
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ account, rule }) => (
                      <tr
                        key={account.id}
                        onClick={() => setSelectedId(account.id)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor:
                            account.id === selectedId ? 'var(--mui-palette-primary-lighterOpacity)' : undefined
                        }}
                      >
                        <td>
                          <Typography component='code' variant='body2' color='primary.main'>
                            {account.key}
                          </Typography>
                        </td>
                        <td style={{ whiteSpace: 'normal', minWidth: 200 }}>
                          <Typography sx={{ fontWeight: 600 }}>{account.name}</Typography>
                          {account.org && (
                            <Typography variant='caption' color='text.disabled'>
                              ตั้งเจาะจง: {account.org}
                            </Typography>
                          )}
                        </td>
                        <td align='right'>{fmtMillions(account.amount)}</td>
                        <td>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={behaviorColor[rule!.behavior]}
                            label={rule!.behaviorLabel}
                          />
                        </td>
                        <td align='right'>
                          {rule!.behavior === 'MIXED'
                            ? `${fmtDec(rule!.fixedShare * 100, 0)}:${fmtDec(rule!.variableShare * 100, 0)}`
                            : '—'}
                        </td>
                        <td>
                          <Typography variant='body2' color='text.secondary'>
                            {rule!.methodLabel}
                          </Typography>
                        </td>
                      </tr>
                    ))
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
                      <code>{selected.key}</code>
                      {selected.org ? ` · ตั้งเจาะจง ${selected.org}` : ' · กติกากลางทั้งมหาวิทยาลัย'}
                    </>
                  ) : null
                }
                action={
                  selectedRule && (
                    <Chip
                      size='small'
                      variant='tonal'
                      color={behaviorColor[selectedRule.behavior]}
                      label={selectedRule.behaviorLabel}
                    />
                  )
                }
              />
              <CardContent className='flex flex-col gap-4'>
                {!selectedRule ? (
                  <Typography color='text.disabled'>ไม่มีกติกาที่มีผลในปีนี้</Typography>
                ) : (
                  <>
                    {selectedRule.behavior === 'MIXED' && selected && (
                      <div className='flex flex-col gap-2'>
                        <Typography variant='caption' color='text.secondary'>
                          สัดส่วนคงที่ : ผันแปร
                        </Typography>
                        <SplitBar
                          percent={selectedRule.fixedShare * 100}
                          firstColor='var(--mui-palette-primary-main)'
                          secondColor='var(--mui-palette-warning-main)'
                          height={22}
                        />
                        <Typography variant='caption' color='text.disabled'>
                          ยอด {fmtMillions(selected.amount)} ลบ. → TFC{' '}
                          {fmtMillions(selected.amount * selectedRule.fixedShare)} ลบ. · TVC{' '}
                          {fmtMillions(selected.amount * selectedRule.variableShare)} ลบ.
                        </Typography>
                      </div>
                    )}

                    <div>
                      <Typography variant='caption' color='text.secondary'>
                        วิธีปันส่วนลงหลักสูตร
                      </Typography>
                      <Typography sx={{ fontWeight: 600 }}>{selectedRule.methodLabel}</Typography>
                    </div>

                    {selectedRule.note && (
                      <Typography variant='body2' color='text.secondary'>
                        <b>เหตุผล:</b> {selectedRule.note}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title='ไทม์ไลน์รายปีของบัญชีนี้'
                subheader='บัญชีเดียวกันเปลี่ยนประเภทตามปีได้ · ปีที่คำนวณไปแล้วไม่เปลี่ยนตาม'
              />
              <CardContent className='flex flex-col gap-3'>
                {selected?.rules.map(rule => {
                  const isActive = year >= rule.from && (rule.to === null || year <= rule.to)
                  const span = `${rule.from <= 2500 ? 'ตั้งแต่เริ่มระบบ' : rule.from} – ${rule.to === null ? 'ปัจจุบัน' : rule.to}`

                  return (
                    <Box
                      key={`${rule.from}-${rule.to}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '8px 1fr',
                        gap: 3,
                        opacity: isActive ? 1 : 0.55,
                        paddingBlockEnd: 3,
                        borderBlockEnd: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box
                        sx={{
                          borderRadius: 1,
                          backgroundColor: isActive ? 'primary.main' : 'action.disabledBackground'
                        }}
                      />
                      <div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <Typography variant='body2' sx={{ fontWeight: 700 }}>
                            {span}
                          </Typography>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={behaviorColor[rule.behavior]}
                            label={rule.behaviorLabel}
                          />
                          {rule.behavior === 'MIXED' && (
                            <Chip
                              size='small'
                              variant='outlined'
                              label={`${fmtDec(rule.fixedShare * 100, 0)}:${fmtDec(rule.variableShare * 100, 0)}`}
                            />
                          )}
                          {isActive && <Chip size='small' variant='tonal' color='success' label='มีผลอยู่' />}
                        </div>
                        <Typography variant='caption' color='text.secondary'>
                          {rule.note || 'ไม่มีหมายเหตุ'} · ปันส่วน{rule.methodLabel}
                        </Typography>
                      </div>
                    </Box>
                  )
                })}

                {selected?.rules.length === 1 && (
                  <Typography variant='caption' color='text.disabled'>
                    บัญชีนี้ใช้กติกาเดียวมาตลอด — ยังไม่เคยมีมติให้เปลี่ยนประเภท
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </>
  )
}

export default AccountRuleExplorer
