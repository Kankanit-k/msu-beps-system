'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import HighlightText from '@views/beps/shared/HighlightText'
import KpiCard from '@views/beps/shared/KpiCard'
import TableToolbar from '@views/beps/shared/TableToolbar'

// Type Imports
import type { AccountEntry, CostBehavior } from '@/server/beps/account-rules'
import type { ErpAccount } from '@/server/beps/erp-accounts'

// Data Imports
import { ruleAtYear } from '@/server/beps/account-rules'
import { isActiveInYear } from '@/server/beps/erp-accounts'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * หน้า W19 ทั้งหน้า — ต้นฉบับ: mockup/W19-erp-accounts.html
 *
 * คำถามที่หน้านี้ต้องตอบให้ได้คือ **บัญชีไหนยังไม่ผูกกติกา TFC/TVC** เพราะเงินของบัญชี
 * เหล่านั้นจะถูกพักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร ทั้งที่ตรวจยอดกลับต้นทาง (W12)
 * ยังผ่านอยู่ — เป็นเหตุผลที่ต้องดู W13 คู่กับ W12 เสมอ
 */

const behaviorColor: Record<CostBehavior, 'primary' | 'warning' | 'success' | 'error'> = {
  FIXED: 'primary',
  VARIABLE: 'warning',
  MIXED: 'success',
  UNCLASSIFIED: 'error'
}

type RuleFilter = 'all' | 'has' | 'none'

const FILTERS: { value: RuleFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'has', label: 'มีกติกาแล้ว' },
  { value: 'none', label: 'ยังไม่มีกติกา' }
]

type Props = {
  accounts: ErpAccount[]
  rules: AccountEntry[]
  years: number[]
}

const ErpAccountExplorer = ({ accounts, rules, years }: Props) => {
  const [year, setYear] = useState(years[0])
  const [filter, setFilter] = useState<RuleFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState(accounts[0]?.key ?? '')

  const query = search.trim().toLowerCase()

  const live = useMemo(() => accounts.filter(account => isActiveInYear(account, year)), [accounts, year])

  const rows = live
    .filter(account => (filter === 'all' ? true : filter === 'has' ? account.ruleKey : !account.ruleKey))
    .filter(
      account =>
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.key.toLowerCase().includes(query) ||
        [account.planCode, account.budgetCode, account.expenditureCode, account.subCode].some(code =>
          code.toLowerCase().includes(query)
        )
    )

  const withRule = live.filter(account => account.ruleKey)
  const withoutRule = live.filter(account => !account.ruleKey)
  const withoutRuleAmount = withoutRule.reduce((sum, account) => sum + account.amount, 0)
  const coveredAmount = live.reduce((sum, account) => sum + account.amount, 0)

  const selected = accounts.find(account => account.key === selectedKey) ?? accounts[0]
  const selectedRuleEntry = selected?.ruleKey ? rules.find(rule => rule.key === selected.ruleKey) : undefined
  const selectedRule = selectedRuleEntry ? ruleAtYear(selectedRuleEntry, year) : null

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='บัญชีที่มีผลในปีที่เลือก'
          value={fmtInt(live.length)}
          unit={`คีย์ผสม 4 ระดับ · ปีงบ ${year}`}
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ผูกกติกา TFC/TVC แล้ว'
          value={fmtInt(withRule.length)}
          unit='บัญชี · พร้อมเข้าการคำนวณ'
          color='success.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ยังไม่มีกติกา'
          value={fmtInt(withoutRule.length)}
          unit={`บัญชี · ${fmtMillions(withoutRuleAmount)} ลบ. จะถูกพักไว้`}
          color='error.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ยอดเงินที่ครอบคลุม'
          value={fmtMillions(coveredAmount)}
          unit={`ล้านบาท · ปีงบประมาณ ${year}`}
          color='warning.main'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <TextField
            select
            size='small'
            label='ปีงบประมาณที่ดู'
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

          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder='ค้นหารหัส / ชื่อบัญชี…'
            filters={FILTERS}
            filter={filter}
            onFilterChange={setFilter}
          />

          <Chip size='small' variant='tonal' color='primary' label={`${rows.length} จาก ${accounts.length} บัญชี`} />
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card className='bs-full'>
          <CardHeader title='ผังบัญชี' subheader='คลิกแถวเพื่อดูรายละเอียดและกติกาที่ผูกอยู่' />
          <CardContent>
            <div className='overflow-auto' style={{ maxBlockSize: 520 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th align='right'>แผน</th>
                    <th align='right'>งบ</th>
                    <th align='right'>รายจ่าย</th>
                    <th align='right'>ย่อย</th>
                    <th>ชื่อบัญชี</th>
                    <th align='right'>ยอด (ลบ.)</th>
                    <th>ช่วงปี</th>
                    <th>กติกา TFC/TVC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} align='center'>
                        <Typography color='text.disabled'>ไม่พบบัญชีที่ตรงกับตัวกรอง</Typography>
                      </td>
                    </tr>
                  ) : (
                    rows.map(account => {
                      const ruleEntry = account.ruleKey ? rules.find(rule => rule.key === account.ruleKey) : undefined
                      const rule = ruleEntry ? ruleAtYear(ruleEntry, year) : null

                      return (
                        <tr
                          key={account.key}
                          onClick={() => setSelectedKey(account.key)}
                          style={{
                            cursor: 'pointer',
                            opacity: account.to ? 0.6 : 1,
                            backgroundColor:
                              account.key === selectedKey ? 'var(--mui-palette-primary-lighterOpacity)' : undefined
                          }}
                        >
                          <td align='right'>
                            <Typography component='code' variant='body2' color='primary.main'>
                              {account.planCode}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Typography component='code' variant='body2'>
                              {account.budgetCode}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Typography component='code' variant='body2'>
                              {account.expenditureCode}
                            </Typography>
                          </td>
                          <td align='right'>
                            <Typography component='code' variant='body2'>
                              {account.subCode}
                            </Typography>
                          </td>
                          <td style={{ whiteSpace: 'normal', minWidth: 200 }}>
                            <Typography sx={{ fontWeight: 600 }}>
                              <HighlightText text={account.name} query={query} />
                            </Typography>
                          </td>
                          <td align='right'>{account.amount ? fmtMillions(account.amount) : '—'}</td>
                          <td>
                            <Typography variant='caption' color='text.disabled'>
                              {account.from} – {account.to === null ? 'ปัจจุบัน' : account.to}
                            </Typography>
                          </td>
                          <td>
                            {rule ? (
                              <Chip
                                size='small'
                                variant='tonal'
                                color={behaviorColor[rule.behavior]}
                                label={rule.behaviorLabel}
                              />
                            ) : (
                              <Chip size='small' variant='tonal' color='error' label='ยังไม่มีกติกา' />
                            )}
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

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card className='bs-full'>
          <CardHeader
            title={selected?.name ?? '—'}
            subheader={selected ? <code>{selected.key}</code> : null}
            action={
              selected && (
                <Chip
                  size='small'
                  variant='tonal'
                  color={selected.to ? 'error' : 'success'}
                  label={selected.to ? 'ยกเลิกแล้ว' : 'ใช้งาน'}
                />
              )
            }
          />
          <CardContent className='flex flex-col gap-4'>
            <Typography variant='body2' color='text.secondary'>
              ทั้ง 4 รหัสรวมกันเป็น UNIQUE key คู่กับ <code>valid_from</code> — แก้รหัสของบัญชีที่คำนวณไปแล้วไม่ได้
            </Typography>

            <div>
              <Typography variant='caption' color='text.secondary'>
                ช่วงปีที่มีผล
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {selected?.from} – {selected?.to ?? 'ปัจจุบัน'}
              </Typography>
            </div>

            <div>
              <Typography variant='caption' color='text.secondary'>
                กติกา TFC/TVC ในปีงบ {year}
              </Typography>
              {selectedRule ? (
                <>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={behaviorColor[selectedRule.behavior]}
                    label={selectedRule.behaviorLabel}
                  />
                  <Typography variant='caption' color='text.secondary' component='div'>
                    {selectedRule.note || 'ไม่มีหมายเหตุ'} · ปันส่วน{selectedRule.methodLabel}
                  </Typography>
                </>
              ) : (
                <Typography variant='body2' color='error.main'>
                  ยังไม่มีกติกา — เงินจะถูกพักไว้ที่หน่วยงานและติดธง UNCLASSIFIED
                </Typography>
              )}
            </div>

            <div>
              <Typography variant='caption' color='text.secondary'>
                จำนวนช่วงปีของกติกา
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {selectedRuleEntry
                  ? `${selectedRuleEntry.rules.length} ช่วงปี — เปลี่ยนประเภทตามปีได้`
                  : 'ยังไม่เคยตั้งกติกาให้บัญชีนี้'}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default ErpAccountExplorer
