'use client'

// React Imports
import { useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Calc Imports
import { calcStudentMixBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'
import type { RevenueMode } from '@beps/calc-engine'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import MiniStat from '@views/beps/shared/MiniStat'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * จุดคุ้มทุนแยกตามแผนการรับนิสิต — ความต้องการจากบันทึกการประชุม (คุณเอื้อง):
 * *"พอเราได้จุดคุ้มทุนรวมมาแล้ว ถ้ามาแยกตามแผนการรับด้วยค่ะ"*
 *
 * ต้นแบบคือบล็อก X–AD ของชีต `4.จุดคุ้มทุนหลักสูตร(ใหม่)` แต่**ไม่ปันต้นทุนคงที่
 * ตามสัดส่วนนิสิตแบบในชีต** เพราะเกณฑ์ปันส่วนยังไม่ได้ข้อยุติจากกองแผนงาน
 * ที่นี่ใช้ CM เฉลี่ยถ่วงน้ำหนักแล้วกระจาย Q* รวมกลับเป็นโควตารายกลุ่ม
 * (ดูเหตุผลเต็มใน `packages/calc-engine/src/student-mix.ts`)
 *
 * TFC และ AVC มาจากฟอร์มด้านบนเสมอ — แผงนี้ตอบแค่ว่า "ถ้ารับตามแผนนี้ ส่วนผสมของ
 * ค่าธรรมเนียมจะทำให้จุดคุ้มทุนขยับไปเท่าไร" ไม่ได้แก้ตัวเลขต้นทุนของหลักสูตร
 */

type Row = {
  key: string
  label: string
  /** รับใหม่ต่อปี */
  intake: number
  /** จำนวนปีของหลักสูตร — ใช้แปลงแผนรับเป็นนิสิตคงอยู่ */
  years: number
  /** ค่าธรรมเนียมต่อภาคเรียน */
  fee: number
  /** เงินแผ่นดินต่อหัวต่อภาคเรียน — ใช้เฉพาะโหมดรวมเงินแผ่นดิน */
  gov: number
}

const GRADUATE_LEVELS = ['ปริญญาโท', 'ปริญญาเอก']

const DEFAULT_YEARS: Record<string, number> = {
  ปริญญาตรี: 4,
  ประกาศนียบัตร: 1,
  'ป.บัณฑิต': 1,
  ปริญญาโท: 2,
  ปริญญาเอก: 3
}

/**
 * กลุ่มนิสิตตั้งต้นตามระดับการศึกษา — ชุดเดียวกับ `Masterโครงสร้าง` คอลัมน์ K–M
 * ของไฟล์ต้นฉบับ (ตรี/ป.บัณฑิต/ประกาศนียบัตร ใช้ ปกติ–พิเศษ · บัณฑิตศึกษาใช้ ในเวลา–นอกเวลา)
 */
const presetRows = (level: string): Row[] => {
  const years = DEFAULT_YEARS[level] ?? 4
  const isGraduate = GRADUATE_LEVELS.includes(level)
  const inTime = isGraduate ? 'ในเวลา' : 'ภาคปกติ'
  const outTime = isGraduate ? 'นอกเวลา' : 'ภาคพิเศษ'

  const rows: Row[] = [
    { key: 'in-th', label: `${inTime} (นิสิตไทย)`, intake: 0, years, fee: 0, gov: 0 },
    { key: 'out-th', label: `${outTime} (นิสิตไทย)`, intake: 0, years, fee: 0, gov: 0 },
    { key: 'in-int', label: `${inTime} (นิสิตต่างชาติ)`, intake: 0, years, fee: 0, gov: 0 },
    { key: 'out-int', label: `${outTime} (นิสิตต่างชาติ)`, intake: 0, years, fee: 0, gov: 0 }
  ]

  // หลักสูตรต่อเนื่องรับเฉพาะระดับปริญญาตรี (เทียบโอน 2 ปี) — ตรงกับคอลัมน์ AC ของชีต
  return level === 'ปริญญาตรี'
    ? [...rows, { key: 'continue', label: 'ต่อเนื่อง / เทียบโอน 2 ปี', intake: 0, years: 2, fee: 0, gov: 0 }]
    : rows
}

type Props = {
  level: string
  /** ต้นทุนคงที่รวมของหลักสูตร จากฟอร์มด้านบน */
  tfc: number
  /** ต้นทุนผันแปรต่อหัว จากผลคำนวณด้านบน */
  avc: number
  revenueMode: RevenueMode
  revenueModeLabel: string
  /** Q* ที่ได้จากตัวเลขรวมด้านบน — ใช้เทียบให้เห็นว่าส่วนผสมแผนรับทำให้ขยับไปเท่าไร */
  qStarOverall: number | null
}

const StudentMixPanel = ({ level, tfc, avc, revenueMode, revenueModeLabel, qStarOverall }: Props) => {
  const [terms, setTerms] = useState(2)
  const [rows, setRows] = useState<Row[]>(() => presetRows(level))

  // เปลี่ยนระดับการศึกษา = คนละชุดประเภทนิสิต ต้องตั้งแถวใหม่ (รูปแบบ adjust-state-on-prop ของ React)
  const [levelSnapshot, setLevelSnapshot] = useState(level)

  if (levelSnapshot !== level) {
    setLevelSnapshot(level)
    setRows(presetRows(level))
  }

  const withGovernment = revenueMode === 'with_government'

  const update = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(row => (row.key === key ? { ...row, ...patch } : row)))

  const mix = useMemo(
    () =>
      calcStudentMixBreakEven(
        {
          groups: rows.map(row => ({
            key: row.key,
            label: row.label,
            q: row.intake * row.years,
            revenuePerHead: (row.fee + (withGovernment ? row.gov : 0)) * terms
          })),
          tfc,
          avc
        },
        DEFAULT_POLICY
      ),
    [rows, terms, tfc, avc, withGovernment]
  )

  const totalIntake = rows.reduce((sum, row) => sum + row.intake, 0)
  const isOk = mix.qStar !== null && mix.qPlan >= mix.qStar

  return (
    <Card>
      <CardHeader
        title='แยกจุดคุ้มทุนตามแผนการรับนิสิต'
        subheader={`ใช้ TFC และ AVC จากฟอร์มด้านบน · ฐานรายได้: ${revenueModeLabel}`}
        action={
          mix.qStar !== null && (
            <Chip
              variant='tonal'
              color={isOk ? 'success' : 'error'}
              label={isOk ? 'แผนนี้ผ่านจุดคุ้มทุน' : 'แผนนี้ยังไม่ถึงจุดคุ้มทุน'}
            />
          )
        }
        sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
      />
      <CardContent className='flex flex-col gap-4'>
        <div className='flex gap-4 items-center flex-wrap'>
          <TextField
            size='small'
            type='number'
            label='ภาคเรียนต่อปี'
            value={terms || ''}
            onChange={e => setTerms(Number(e.target.value) || 0)}
            sx={{ inlineSize: 140 }}
          />
          <Typography variant='body2' color='text.secondary'>
            กรอกแผนรับต่อปีและค่าธรรมเนียมของแต่ละกลุ่ม — ระบบแปลงเป็นนิสิตคงอยู่ (รับต่อปี × จำนวนปี)
            แล้วหาจุดคุ้มทุนจากส่วนผสมนั้น
          </Typography>
        </div>

        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>กลุ่มนิสิต</th>
                <th align='right'>รับ/ปี</th>
                <th align='right'>จำนวนปี</th>
                <th align='right'>ค่าธรรมเนียม/ภาคเรียน</th>
                {withGovernment && <th align='right'>เงินแผ่นดิน/ภาคเรียน</th>}
                <th align='right'>นิสิตคงอยู่</th>
                <th align='right'>สัดส่วน</th>
                <th align='right'>R/คน/ปี</th>
                <th align='right'>CM/คน</th>
                <th align='right'>โควตา Q*</th>
                <th align='right'>ส่วนต่าง</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const group = mix.groups[index]
                const diff = group.diff

                return (
                  <tr key={row.key}>
                    <td>
                      <Typography variant='body2' sx={{ fontWeight: 600, minInlineSize: 150 }}>
                        {row.label}
                      </Typography>
                    </td>
                    <td align='right'>
                      <TextField
                        size='small'
                        type='number'
                        placeholder='0'
                        value={row.intake || ''}
                        onChange={e => update(row.key, { intake: Number(e.target.value) || 0 })}
                        sx={{ inlineSize: 90 }}
                      />
                    </td>
                    <td align='right'>
                      <TextField
                        size='small'
                        type='number'
                        placeholder='0'
                        value={row.years || ''}
                        onChange={e => update(row.key, { years: Number(e.target.value) || 0 })}
                        sx={{ inlineSize: 80 }}
                      />
                    </td>
                    <td align='right'>
                      <TextField
                        size='small'
                        type='number'
                        placeholder='0'
                        value={row.fee || ''}
                        onChange={e => update(row.key, { fee: Number(e.target.value) || 0 })}
                        sx={{ inlineSize: 120 }}
                      />
                    </td>
                    {withGovernment && (
                      <td align='right'>
                        <TextField
                          size='small'
                          type='number'
                          placeholder='0'
                          value={row.gov || ''}
                          onChange={e => update(row.key, { gov: Number(e.target.value) || 0 })}
                          sx={{ inlineSize: 120 }}
                        />
                      </td>
                    )}
                    <td align='right'>{fmtInt(group.q)}</td>
                    <td align='right'>{mix.qPlan > 0 ? `${(group.share * 100).toFixed(1)}%` : '—'}</td>
                    <td align='right'>{fmtInt(group.revenuePerHead)}</td>
                    <td align='right'>
                      <Typography color={group.cmPerHead > 0 ? 'success.main' : 'error.main'}>
                        {group.q > 0 ? fmtInt(group.cmPerHead) : '—'}
                      </Typography>
                    </td>
                    <td align='right'>{group.qStar === null ? '—' : fmtInt(group.qStar)}</td>
                    <td align='right'>
                      {diff === null ? (
                        '—'
                      ) : (
                        <Typography color={diff >= 0 ? 'success.main' : 'error.main'}>
                          {diff > 0 ? '+' : ''}
                          {fmtInt(diff)}
                        </Typography>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td>
                  <Typography variant='body2' sx={{ fontWeight: 700 }}>
                    รวม
                  </Typography>
                </td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }}>{fmtInt(totalIntake)}</Typography>
                </td>
                <td align='right'>—</td>
                <td align='right'>—</td>
                {withGovernment && <td align='right'>—</td>}
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }}>{fmtInt(mix.qPlan)}</Typography>
                </td>
                <td align='right'>{mix.qPlan > 0 ? '100.0%' : '—'}</td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }}>{mix.r === null ? '—' : fmtInt(mix.r)}</Typography>
                </td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }} color={(mix.cm ?? 0) > 0 ? 'success.main' : 'error.main'}>
                    {mix.cm === null ? '—' : fmtInt(mix.cm)}
                  </Typography>
                </td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }}>{mix.qStar === null ? '—' : fmtInt(mix.qStar)}</Typography>
                </td>
                <td align='right'>
                  <Typography sx={{ fontWeight: 700 }} color={isOk ? 'success.main' : 'error.main'}>
                    {mix.diff === null ? '—' : `${mix.diff > 0 ? '+' : ''}${fmtInt(mix.diff)}`}
                  </Typography>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className='grid gap-3' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <MiniStat
            label='นิสิตตามแผน'
            value={`${fmtInt(mix.qPlan)} คน`}
            sub={`รับใหม่ ${fmtInt(totalIntake)} คน/ปี`}
          />
          <MiniStat
            label='จุดคุ้มทุนของแผนนี้'
            value={mix.qStar === null ? '—' : `${fmtInt(mix.qStar)} คน`}
            color='primary.main'
            sub={qStarOverall === null ? undefined : `ตัวเลขรวมด้านบน ${fmtInt(qStarOverall)} คน`}
          />
          <MiniStat
            label='ส่วนต่าง'
            value={mix.diff === null ? '—' : `${mix.diff > 0 ? '+' : ''}${fmtInt(mix.diff)} คน`}
            color={isOk ? 'success.main' : 'error.main'}
          />
          <MiniStat
            label='R เฉลี่ยถ่วงน้ำหนัก'
            value={mix.r === null ? '—' : `${fmtInt(mix.r)} บ.`}
            sub={`AVC ${fmtInt(avc)} บ.`}
          />
          <MiniStat label='รายได้ตามแผน' value={`${fmtMillions(mix.tr)} ล.`} sub='ต่อปี' />
          <MiniStat
            label='กำไร/ขาดทุนตามแผน'
            value={`${mix.profit >= 0 ? '+' : ''}${fmtMillions(mix.profit)} ล.`}
            color={mix.profit >= 0 ? 'success.main' : 'error.main'}
            sub='ต่อปี'
          />
        </div>

        {tfc <= 0 && (
          <Alert severity='info'>
            ยังไม่ได้กรอก <b>TFC รวม</b> ในฟอร์มด้านบน — จุดคุ้มทุนของแผนจะเป็น 0 จนกว่าจะมีต้นทุนคงที่
          </Alert>
        )}

        {mix.qStarStatus === 'full_cost_recovery' && (
          <Alert severity='warning'>
            ค่าธรรมเนียมเฉลี่ยของแผนนี้ต่ำกว่าต้นทุนผันแปรต่อหัว (CM ≤ 0) — <b>ไม่มีจุดคุ้มทุนจริง</b>{' '}
            รับเพิ่มเท่าไรก็ขาดทุนเพิ่ม ตัวเลข {fmtInt(mix.qStar ?? 0)} คนที่แสดงคือ{' '}
            <b>เป้าหมายขั้นต่ำเพื่อคืนต้นทุนทั้งหมด</b> ไม่ใช่จุดคุ้มทุน
          </Alert>
        )}

        <Alert severity='info' icon={<i className='ri-information-line' />}>
          โควตา Q* รายกลุ่มกระจายจาก Q* รวมตามสัดส่วนแผนรับ (ผลรวมเท่ากับ Q* รวมพอดี)
          <b> ยังไม่ได้ปันต้นทุนคงที่รายกลุ่ม</b> และใช้ AVC ค่าเดียวทุกกลุ่ม —
          ถ้ากองแผนงานกำหนดเกณฑ์ปันส่วนและต้นทุนผันแปรรายกลุ่มแล้ว จะคำนวณละเอียดกว่านี้ได้
        </Alert>
      </CardContent>
    </Card>
  )
}

export default StudentMixPanel
