'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Calc Imports
import { calcAdmissionMix, DEFAULT_POLICY, resolveHeadcount, solveAdmissionTarget } from '@beps/calc-engine'
import type { AdmissionMixRow, RevenueMode } from '@beps/calc-engine'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Chart Imports
import BepsChart, { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import MiniStat from '@views/beps/shared/MiniStat'

// Util Imports
import { fmtDec, fmtInt, fmtMillions, toMillions, withSign } from '@/utils/beps-format'

/**
 * W7 ส่วนที่ 2 — วิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน
 * ต้นฉบับ: mockup/assets/page-admission-mix.js + mockup/W7-scenario-program.html
 *
 * ความต้องการจากที่ประชุม: ได้จุดคุ้มทุน**รวม**จากการ์ดด้านบนแล้ว ต้องแตกต่อตามแผนการรับ
 * — ไทย/ต่างชาติ · ปกติ/พิเศษ · หลักสูตรต่อเนื่อง — ใช้ได้ทั้งหลักสูตรปรับปรุงและหลักสูตรใหม่
 *
 * ตัวเลขทุกตัวมาจาก `calcAdmissionMix()` / `solveAdmissionTarget()` ของ @beps/calc-engine
 * หน้าจอนี้ไม่มีสูตรของตัวเองแม้แต่บรรทัดเดียว (เหตุผลเดียวกับ raw.parity.test.ts)
 */

/** แถวในมุมมองผู้ใช้ — เก็บทั้ง 2 ฐานไว้ เพื่อให้สลับ "คงค้างรวม/รับต่อปี" แล้วค่าเดิมไม่หาย */
type PlanRow = {
  code: string
  label: string
  basis: 'headcount' | 'intake'
  headcount: number
  intakePerYear: number
  durationYears: number
  termsPerYear: number
  feePerTerm: number
  govPerTerm: number
}

const GRADUATE_LEVELS = ['ปริญญาโท', 'ปริญญาเอก']

/** ชุดประเภทนิสิตมาตรฐาน — ตรงกับ `Masterโครงสร้าง!J:M` ของไฟล์ต้นฉบับ */
const standardTypes = (level: string) =>
  GRADUATE_LEVELS.includes(level)
    ? [
        { code: 'TH_IN', label: 'ในเวลา (นิสิตไทย)' },
        { code: 'TH_OUT', label: 'นอกเวลา (นิสิตไทย)' },
        { code: 'INT_IN', label: 'ในเวลา (นิสิตต่างชาติ)' },
        { code: 'INT_OUT', label: 'นอกเวลา (นิสิตต่างชาติ)' }
      ]
    : [
        { code: 'TH_REG', label: 'ปกติ (นิสิตไทย)' },
        { code: 'TH_SPE', label: 'พิเศษ (นิสิตไทย)' },
        { code: 'INT_REG', label: 'ปกติ (นิสิตต่างชาติ)' },
        { code: 'INT_SPE', label: 'พิเศษ (นิสิตต่างชาติ)' }
      ]

const newRow = (code: string, label: string, terms: number): PlanRow => ({
  code,
  label,
  basis: 'headcount',
  headcount: 0,
  intakePerYear: 0,
  durationYears: 4,
  termsPerYear: terms,
  feePerTerm: 0,
  govPerTerm: 0
})

/** แปลงเป็นอินพุตของเครื่องคำนวณ — ฝั่งจอเก็บ 2 ฐานไว้ ฝั่งสูตรรับทีละฐาน */
const toEngineRow = (row: PlanRow): AdmissionMixRow => ({
  studentTypeCode: row.code,
  label: row.label,
  plan:
    row.basis === 'headcount'
      ? { basis: 'headcount', headcount: row.headcount }
      : { basis: 'intake', intakePerYear: row.intakePerYear, durationYears: row.durationYears },
  feePerTerm: row.feePerTerm,
  governmentPerTerm: row.govPerTerm,
  termsPerYear: row.termsPerYear
})

type Props = {
  /** ระดับการศึกษาจากการ์ดด้านบน — กำหนดชุดประเภทนิสิตมาตรฐาน */
  level: string
  /** จำนวนนิสิตจากการ์ดด้านบน — ใช้ตั้งต้นแถวแรกและคำนวณ AVC สำรอง */
  q: number
  tfc: number
  tvc: number
  revenueMode: RevenueMode
  revenueModeLabel: string
}

const AdmissionMixPanel = ({ level, q, tfc, tvc, revenueMode, revenueModeLabel }: Props) => {
  const palette = useChartPalette()

  const [rows, setRows] = useState<PlanRow[]>([])
  const [avcOverride, setAvcOverride] = useState(0)
  const [defaultTerms, setDefaultTerms] = useState(2)
  const [hasRun, setHasRun] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetCode, setTargetCode] = useState('')

  /* AVC ต้องเป็นค่าต่อหัว เพราะ TVC ต้องผันไปตามจำนวนนิสิตที่จำลอง
     ถ้าใช้ TVC ก้อนรวม การเปลี่ยนส่วนผสมจะไม่ทำให้ต้นทุนผันแปรขยับ ซึ่งผิดนิยาม */
  const avc = avcOverride > 0 ? avcOverride : q > 0 ? tvc / q : 0

  const update = (code: string, patch: Partial<PlanRow>) =>
    setRows(prev => prev.map(row => (row.code === code ? { ...row, ...patch } : row)))

  const fillStandard = () => {
    const next = standardTypes(level).map(type => newRow(type.code, type.label, defaultTerms))

    // ตั้งต้นจากจำนวนนิสิตจริงของหลักสูตรอ้างอิง เพื่อให้เริ่มจากของจริงแล้วค่อยปรับส่วนผสม
    if (q > 0 && next[0]) next[0].headcount = q

    setRows(next)
    setError(null)
  }

  const addRow = () =>
    setRows(prev => [...prev, newRow(`ROW_${Date.now()}`, `ประเภทที่ ${prev.length + 1}`, defaultTerms)])

  const addContinuing = () =>
    setRows(prev =>
      prev.some(row => row.code === 'CONT2')
        ? prev
        : [
            ...prev,
            // หลักสูตรต่อเนื่องต่างที่ "จำนวนปี" ไม่ใช่ตัวนิสิต จึงกรอกแบบรับต่อปี × 2 ปี
            { ...newRow('CONT2', 'ต่อเนื่อง 2 ปี', defaultTerms), basis: 'intake' as const, durationYears: 2 }
          ]
    )

  const run = () => {
    if (rows.length === 0) {
      setError('ยังไม่มีแผนการรับ — กด “เติมประเภทมาตรฐาน” เพื่อเริ่ม')
      setHasRun(false)

      return
    }

    if (tfc <= 0 || avc <= 0) {
      setError(
        'ต้องมี TFC และต้นทุนผันแปรต่อหัว (AVC) ก่อน — กรอก TFC/TVC/จำนวนนิสิตในการ์ดด้านบน หรือระบุ AVC เองในช่องด้านบนของแผงนี้'
      )
      setHasRun(false)

      return
    }

    setError(null)
    setHasRun(true)
    setTargetCode(prev => (rows.some(row => row.code === prev) ? prev : (rows[0]?.code ?? '')))
  }

  const input = useMemo(
    () => ({ rows: rows.map(toEngineRow), tfc, variableCostPerHead: avc, revenueMode }),
    [rows, tfc, avc, revenueMode]
  )

  /* คำนวณใหม่เองเมื่อสลับฐานรายได้ที่แถบด้านบน — ไม่ปล่อยให้ตารางค้างตัวเลขของฐานเดิม */
  const result = useMemo(() => {
    if (!hasRun || input.rows.length === 0 || tfc <= 0 || avc <= 0) return null

    try {
      return calcAdmissionMix(input, DEFAULT_POLICY)
    } catch {
      // รหัสประเภทซ้ำ — เครื่องคำนวณโยน error ออกมาแทนที่จะคืนเลขที่ตีความไม่ได้
      return null
    }
  }, [hasRun, input, tfc, avc])

  const goal = useMemo(() => {
    if (result === null || targetCode === '') return null

    try {
      return solveAdmissionTarget(input, targetCode, DEFAULT_POLICY)
    } catch {
      return null
    }
  }, [result, input, targetCode])

  const total = result?.total
  const isOk = total !== undefined && total.qStar !== null && total.q >= total.qStar

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' className='flex items-center gap-2'>
          <i className='ri-pie-chart-2-line' />
          วิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='แผนการรับนิสิต'
            subheader='ขั้นที่ 2 — ได้จุดคุ้มทุนรวมจากด้านบนแล้ว แตกต่อตามแผนการรับ: ไทย/ต่างชาติ · ปกติ/พิเศษ · ต่อเนื่อง'
          />
          <CardContent className='flex flex-col gap-4'>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size='small'
                  disabled
                  label='ต้นทุนคงที่รวม (TFC)'
                  value={tfc > 0 ? fmtInt(tfc) : ''}
                  placeholder='ใช้ค่าจากการ์ดด้านบน'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='ต้นทุนผันแปรต่อหัว (AVC) — เว้นว่างเพื่อใช้ TVC ÷ Q'
                  placeholder='คำนวณจาก TVC ÷ Q อัตโนมัติ'
                  value={avcOverride || ''}
                  onChange={e => setAvcOverride(Number(e.target.value) || 0)}
                  helperText={avcOverride > 0 ? 'ใช้ค่าที่กรอกเอง' : `ใช้ค่าอัตโนมัติ ${fmtInt(avc)} บ./คน`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  label='ภาคเรียนต่อปี (ค่าตั้งต้นของแถวใหม่)'
                  value={defaultTerms || ''}
                  onChange={e => setDefaultTerms(Number(e.target.value) || 0)}
                />
              </Grid>
            </Grid>

            <Typography variant='caption' color='text.secondary'>
              TFC ใช้ค่าเดียวกับการ์ด “กรอกข้อมูลหลักสูตร” ด้านบน · AVC ต้องแยกเป็นค่าต่อหัวเพราะ TVC
              ต้องผันไปตามจำนวนนิสิตที่จำลอง ถ้าใช้ TVC ก้อนรวม การเปลี่ยนส่วนผสมจะไม่ทำให้ต้นทุนผันแปรขยับ ซึ่งผิดนิยาม
            </Typography>

            <div className='flex gap-3 flex-wrap'>
              <Button
                size='small'
                variant='contained'
                startIcon={<i className='ri-sparkling-line' />}
                onClick={fillStandard}
              >
                เติมประเภทมาตรฐาน
              </Button>
              <Button size='small' variant='outlined' startIcon={<i className='ri-add-line' />} onClick={addRow}>
                เพิ่มแถว
              </Button>
              <Button
                size='small'
                variant='outlined'
                color='warning'
                startIcon={<i className='ri-add-line' />}
                onClick={addContinuing}
              >
                หลักสูตรต่อเนื่อง 2 ปี
              </Button>
            </div>

            {rows.length === 0 ? (
              <Typography color='text.disabled' className='text-center' sx={{ paddingBlock: 6 }}>
                ยังไม่มีแผนการรับ — กด “เติมประเภทมาตรฐาน” เพื่อเริ่ม
              </Typography>
            ) : (
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>ประเภทนิสิต</th>
                      <th>แบบกรอก</th>
                      <th align='right'>จำนวน</th>
                      <th align='right'>ปี</th>
                      <th align='right'>เทอม/ปี</th>
                      <th align='right'>ค่าธรรมเนียม/เทอม</th>
                      <th align='right'>เงินแผ่นดิน/เทอม</th>
                      <th align='right'>นิสิตคงค้าง</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const isIntake = row.basis === 'intake'

                      return (
                        <tr key={row.code}>
                          <td>
                            <TextField
                              size='small'
                              value={row.label}
                              onChange={e => update(row.code, { label: e.target.value })}
                              sx={{ inlineSize: 190 }}
                            />
                          </td>
                          <td>
                            <TextField
                              select
                              size='small'
                              value={row.basis}
                              onChange={e => update(row.code, { basis: e.target.value as PlanRow['basis'] })}
                              sx={{ inlineSize: 125 }}
                            >
                              <MenuItem value='headcount'>คงค้างรวม</MenuItem>
                              <MenuItem value='intake'>รับต่อปี</MenuItem>
                            </TextField>
                          </td>
                          <td align='right'>
                            <TextField
                              size='small'
                              type='number'
                              placeholder='0'
                              value={(isIntake ? row.intakePerYear : row.headcount) || ''}
                              onChange={e =>
                                update(row.code, {
                                  [isIntake ? 'intakePerYear' : 'headcount']: Number(e.target.value) || 0
                                })
                              }
                              sx={{ inlineSize: 90 }}
                            />
                          </td>
                          <td align='right'>
                            {isIntake ? (
                              <TextField
                                size='small'
                                type='number'
                                value={row.durationYears || ''}
                                onChange={e => update(row.code, { durationYears: Number(e.target.value) || 0 })}
                                sx={{ inlineSize: 70 }}
                              />
                            ) : (
                              <Typography color='text.disabled'>—</Typography>
                            )}
                          </td>
                          <td align='right'>
                            <TextField
                              size='small'
                              type='number'
                              value={row.termsPerYear || ''}
                              onChange={e => update(row.code, { termsPerYear: Number(e.target.value) || 0 })}
                              sx={{ inlineSize: 70 }}
                            />
                          </td>
                          <td align='right'>
                            <TextField
                              size='small'
                              type='number'
                              placeholder='0'
                              value={row.feePerTerm || ''}
                              onChange={e => update(row.code, { feePerTerm: Number(e.target.value) || 0 })}
                              sx={{ inlineSize: 115 }}
                            />
                          </td>
                          <td align='right'>
                            <TextField
                              size='small'
                              type='number'
                              placeholder='0'
                              value={row.govPerTerm || ''}
                              onChange={e => update(row.code, { govPerTerm: Number(e.target.value) || 0 })}
                              sx={{ inlineSize: 115 }}
                            />
                          </td>
                          <td align='right'>
                            <Typography sx={{ fontWeight: 700 }} color='primary.main'>
                              {fmtInt(resolveHeadcount(toEngineRow(row).plan))}
                            </Typography>
                          </td>
                          <td align='right'>
                            <IconButton
                              size='small'
                              color='error'
                              aria-label={`ลบแถว ${row.label}`}
                              onClick={() => setRows(prev => prev.filter(item => item.code !== row.code))}
                            >
                              <i className='ri-close-line' />
                            </IconButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {error !== null && <Alert severity='warning'>{error}</Alert>}

            <div>
              <Button variant='contained' startIcon={<i className='ri-play-line' />} onClick={run}>
                วิเคราะห์สัดส่วน
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {result !== null && total !== undefined && (
        <>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title='ผลแยกตามแผนการรับนิสิต'
                subheader={`ฐานรายได้: ${revenueModeLabel} · สลับที่แถบด้านบนแล้วตารางนี้คำนวณใหม่ให้เอง`}
                action={
                  <Chip
                    variant='tonal'
                    color={total.qStar === null ? 'secondary' : isOk ? 'success' : 'error'}
                    label={
                      total.qStar === null
                        ? 'คำนวณจุดคุ้มทุนไม่ได้'
                        : isOk
                          ? `ผ่านจุดคุ้มทุน เกินมา ${fmtInt(total.q - total.qStar)} คน`
                          : `ยังไม่ถึงจุดคุ้มทุน ขาดอีก ${fmtInt(total.qStar - total.q)} คน`
                    }
                  />
                }
                sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
              />
              <CardContent className='flex flex-col gap-4'>
                <div className='grid gap-3' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <MiniStat label='นิสิตตามแผน' value={`${fmtInt(total.q)} คน`} color='primary.main' />
                  <MiniStat
                    label='จุดคุ้มทุนรวม (Q*)'
                    value={total.qStar === null ? '—' : `${fmtInt(total.qStar)} คน`}
                    color='error.main'
                  />
                  <MiniStat label='รายรับรวม/ปี' value={`${fmtMillions(total.tr)} ล.`} color='primary.main' />
                  <MiniStat label='ต้นทุนรวม/ปี' value={`${fmtMillions(total.tc)} ล.`} />
                  <MiniStat label='AVC' value={`${fmtInt(total.avc ?? avc)} บ./คน`} color='warning.main' />
                  <MiniStat
                    label='ส่วนเกิน/ขาด'
                    value={`${withSign(total.profit, fmtMillions)} ล.`}
                    color={total.profit >= 0 ? 'success.main' : 'error.main'}
                  />
                </div>

                <div className='overflow-x-auto'>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr>
                        <th>ประเภทนิสิต</th>
                        <th align='right'>นิสิต</th>
                        <th align='right'>สัดส่วน</th>
                        <th align='right'>รายรับ/หัว/ปี</th>
                        <th align='right'>รายรับ (ล.)</th>
                        <th align='right'>TFC ปันส่วน (ล.)</th>
                        <th align='right'>TVC (ล.)</th>
                        <th align='right'>CM/หัว</th>
                        <th align='right'>Q* ของส่วนที่ปันมา</th>
                        <th align='right'>ส่วนเกิน (ล.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map(row => (
                        <tr key={row.studentTypeCode}>
                          <td>
                            <Typography variant='body2' sx={{ fontWeight: 600, minInlineSize: 150 }}>
                              {row.label}
                            </Typography>
                          </td>
                          <td align='right'>{fmtInt(row.headcount)}</td>
                          <td align='right'>{fmtDec(row.share * 100, 2)}%</td>
                          <td align='right'>{fmtInt(row.revenuePerHead)}</td>
                          <td align='right'>{fmtMillions(row.revenue)}</td>
                          <td align='right'>{fmtMillions(row.allocatedTfc)}</td>
                          <td align='right'>{fmtMillions(row.tvc)}</td>
                          <td align='right'>
                            <Typography color={row.cm > 0 ? 'success.main' : 'error.main'}>{fmtInt(row.cm)}</Typography>
                          </td>
                          <td align='right'>
                            <Typography component='span' sx={{ fontWeight: 700 }}>
                              {row.qStar === null ? '—' : fmtInt(row.qStar)}
                            </Typography>
                            {row.qStarStatus === 'full_cost_recovery' && (
                              <Chip size='small' variant='tonal' color='warning' label='TC ÷ R' className='mis-2' />
                            )}
                          </td>
                          <td align='right'>
                            <Typography
                              sx={{ fontWeight: 700 }}
                              color={row.contribution >= 0 ? 'success.main' : 'error.main'}
                            >
                              {fmtMillions(row.contribution)}
                            </Typography>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td>
                          <Typography sx={{ fontWeight: 800 }}>รวม</Typography>
                        </td>
                        <td align='right'>
                          <Typography sx={{ fontWeight: 800 }}>{fmtInt(total.q)}</Typography>
                        </td>
                        <td align='right'>100.00%</td>
                        <td align='right'>{total.r === null ? '—' : fmtInt(total.r)}</td>
                        <td align='right'>{fmtMillions(total.tr)}</td>
                        <td align='right'>{fmtMillions(total.tfc)}</td>
                        <td align='right'>{fmtMillions(total.tvc)}</td>
                        <td align='right'>
                          <Typography
                            sx={{ fontWeight: 800 }}
                            color={(total.cm ?? 0) > 0 ? 'success.main' : 'error.main'}
                          >
                            {total.cm === null ? '—' : fmtInt(total.cm)}
                          </Typography>
                        </td>
                        <td align='right'>
                          <Typography sx={{ fontWeight: 800 }}>
                            {total.qStar === null ? '—' : fmtInt(total.qStar)}
                          </Typography>
                        </td>
                        <td align='right'>
                          <Typography
                            sx={{ fontWeight: 800 }}
                            color={total.profit >= 0 ? 'success.main' : 'error.main'}
                          >
                            {fmtMillions(total.profit)}
                          </Typography>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Alert severity='warning'>
                  <b>อ่านคอลัมน์ “Q* ของส่วนที่ปันมา” ให้ถูก</b> — TFC เป็นก้อนเดียวของทั้งหลักสูตร
                  ต้องปันตามสัดส่วนหัวนิสิตก่อนจึงพูดถึงจุดคุ้มทุนรายประเภทได้ ค่านี้จึง <b>ขึ้นกับส่วนผสมที่กรอกไว้</b>{' '}
                  เปลี่ยนสัดส่วนแล้วค่าเปลี่ยนตาม ไม่ใช่ค่าคงที่ของกลุ่ม · ถ้าคำถามคือ “ตรึงกลุ่มอื่นไว้
                  ต้องรับกลุ่มนี้กี่คนจึงคุ้ม” ให้ดูช่องหาเป้าหมายด้านล่าง ซึ่งไม่ต้องปันส่วน TFC
                  <br />
                  <b>“ส่วนเกิน” ไม่ใช่จุดคุ้มทุน</b> — ชีต Excel เดิมตั้งชื่อค่านี้ว่า “จุดคุ้มทุนของหลักสูตร” ซึ่งผิด
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card className='bs-full'>
              <CardHeader
                title='หาเป้าหมายการรับ (Goal Seek)'
                subheader='ตรึงประเภทอื่นไว้ตามแผน แล้วหาว่าประเภทนี้ต้องรับกี่คน'
              />
              <CardContent className='flex flex-col gap-4'>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='ประเภทที่ให้ปรับ'
                  value={targetCode}
                  onChange={e => setTargetCode(e.target.value)}
                >
                  {result.rows.map(row => (
                    <MenuItem key={row.studentTypeCode} value={row.studentTypeCode}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>

                {goal !== null &&
                  (goal.status === 'unreachable' ? (
                    <Alert severity='error'>
                      <b>รับเท่าไหร่ก็ไม่คุ้ม</b> — รายรับต่อหัวของประเภทนี้ไม่เกินต้นทุนผันแปรต่อหัว (AVC {fmtInt(avc)}{' '}
                      บ.) ทุกคนที่รับเพิ่มทำให้ขาดทุนมากขึ้น ต้องขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปรก่อน
                    </Alert>
                  ) : goal.status === 'already_break_even' ? (
                    <Alert severity='success'>
                      <b>ไม่ต้องรับประเภทนี้ก็คุ้มทุนแล้ว</b> — ประเภทอื่นตามแผนคุ้มต้นทุนทั้งหลักสูตรอยู่แล้ว ·
                      แผนปัจจุบันตั้งไว้ {fmtInt(goal.plannedHeadcount)} คน
                    </Alert>
                  ) : (
                    <div>
                      <Typography variant='caption' color='text.secondary'>
                        ต้องรับ
                      </Typography>
                      <Typography variant='h3' color='primary.main'>
                        {fmtInt(goal.requiredHeadcount ?? 0)}{' '}
                        <Typography component='span' variant='body2'>
                          คน
                        </Typography>
                      </Typography>
                      <Typography variant='body2' className='mbs-2'>
                        แผนปัจจุบัน <b>{fmtInt(goal.plannedHeadcount)}</b> คน ·{' '}
                        <Typography component='b' color={(goal.gap ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                          {(goal.gap ?? 0) >= 0
                            ? `เกินพอ +${fmtInt(goal.gap ?? 0)} คน`
                            : `ยังขาด ${fmtInt(-(goal.gap ?? 0))} คน`}
                        </Typography>
                      </Typography>
                      <Typography variant='caption' color='text.disabled'>
                        คำนวณโดยตรึงประเภทอื่นไว้ตามแผน จึงไม่ขึ้นกับการปันส่วน TFC
                      </Typography>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card className='bs-full'>
              <CardHeader title='ส่วนเกินรายประเภท (ล้านบาท)' />
              <CardContent>
                <BepsChart
                  type='bar'
                  height={250}
                  ariaLabel='กราฟแท่งแสดงส่วนเกินของแต่ละประเภทนิสิต'
                  data={{
                    labels: result.rows.map(row => row.label),
                    datasets: [
                      {
                        data: result.rows.map(row => toMillions(row.contribution)),
                        backgroundColor: result.rows.map(row =>
                          row.contribution >= 0 ? palette.positive : palette.cost
                        ),
                        borderRadius: 5
                      }
                    ]
                  }}
                  options={{
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: ctx => `${fmtDec(ctx.parsed.y, 2)} ล้านบาท` } }
                    },
                    scales: {
                      x: { grid: { display: false } },
                      y: { grid: { color: palette.grid }, title: { display: true, text: 'ล้านบาท' } }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </>
  )
}

export default AdmissionMixPanel
