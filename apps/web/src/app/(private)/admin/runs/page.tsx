// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'
import ApprovalRules from '@views/beps/runs/ApprovalRules'
import StepFlow from '@views/beps/shared/StepFlow'
import RunHistoryTable from '@views/beps/runs/RunHistoryTable'
import MiniStat from '@views/beps/shared/MiniStat'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'
import type { TimelineEntry } from '@views/beps/shared/TimelineLog'

// Data Imports
import { getValidationIssues } from '@/server/beps/cost-data'
import { getExceptionTotal, getExceptions } from '@/server/beps/exceptions'
import { getRunFlow, getRunLog, getRuns } from '@/server/beps/run'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * W11 — รอบคำนวณ (Allocation Run) · ต้นฉบับ: mockup/W11-allocation-run.html
 *
 * รอบคำนวณเป็น **immutable** — คำนวณใหม่คือสร้าง run ใหม่ ไม่ทับของเก่า run หนึ่งล็อกไว้ทั้ง
 * งวด · ขอบเขต · ฐานต้นทุน · เวอร์ชันกติกา เพื่อให้ย้อนกลับไปอธิบายตัวเลขเก่าได้เสมอ
 * (เป็นเหตุผลที่ทุกหน้าวิเคราะห์ต้องแสดง chip รอบคำนวณบน navbar ตลอดเวลา)
 */
const RunsPage = () => {
  const runs = getRuns()
  const flow = getRunFlow()
  const log = getRunLog()
  const totals = getUniversityTotals()
  const exceptions = getExceptions()
  const exceptionTotal = getExceptionTotal()
  const blockers = getValidationIssues().filter(issue => issue.severity === 'block')

  const current = runs[0]
  const universityTc = totals.byMode.with_government.tc

  const entries: TimelineEntry[] = log.map(entry => ({
    at: entry.at,
    icon: entry.icon,
    tone: entry.tone,
    content: entry.text
  }))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='รอบคำนวณ (Allocation Run)'
          screen='W11'
          subtitle='คำนวณใหม่คือสร้าง run ใหม่ ไม่ทับของเก่า — run หนึ่งล็อก งวด · ขอบเขต · ฐานต้นทุน · เวอร์ชันกติกา ไว้ตลอดไป'
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderInlineStart: '3px solid', borderColor: 'success.main' }}>
              <CardHeader
                title={
                  <div className='flex items-center gap-3 flex-wrap'>
                    <span>รอบคำนวณ #{current.id}</span>
                    <Chip size='small' variant='tonal' color='success' label='รอบที่ใช้อ้างอิงอยู่' />
                  </div>
                }
                subheader={`ปีงบประมาณ ${current.year} · ${current.scope} · ฐานต้นทุน ${current.basis} · กติกาผังบัญชี ${current.ruleVersion}`}
              />
              <CardContent className='flex flex-col gap-6'>
                <StepFlow flow={flow} current={current.state} />

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 4 }}>
                  <MiniStat
                    label='ต้นทุนรวมที่ปันส่วน'
                    value={fmtMillions(current.tc)}
                    sub='ล้านบาท'
                    color='primary.main'
                  />
                  <MiniStat
                    label='ส่วนต่างตรวจยอด'
                    value={fmtDec(current.diff, 2)}
                    sub='บาท · เกณฑ์ยอมรับ 0.00'
                    color={current.diff ? 'error.main' : 'success.main'}
                  />
                  <MiniStat
                    label='หน่วยที่คำนวณ'
                    value={fmtInt(totals.programCount)}
                    sub='หลักสูตร × 2 ฐานรายได้ × 3 ระดับ'
                  />
                  <MiniStat label='เวลาที่ใช้' value={current.duration} sub='เป็น batch job' />
                  <MiniStat
                    label='รายการค้างตรวจ'
                    value={fmtInt(exceptions.length)}
                    sub={`รายการ · ${fmtMillions(exceptionTotal)} ลบ. (${fmtDec((exceptionTotal / universityTc) * 100, 2)}%)`}
                    color='warning.main'
                  />
                </Box>

                <div className='flex gap-3 flex-wrap'>
                  <Button variant='outlined' component={Link} href='/admin/reconciliation'>
                    ดูผลตรวจยอด
                  </Button>
                  <Button variant='outlined' component={Link} href='/admin/exceptions'>
                    ดูรายการค้างตรวจ
                  </Button>
                  <Button variant='outlined' disabled>
                    อนุมัติแล้ว
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <RunHistoryTable runs={runs} currentRunId={current.id} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TimelineLog
              title={`บันทึกเหตุการณ์ของรอบ #${current.id}`}
              subheader='ตอบได้ว่าใครสั่ง ใครอนุมัติ และเกิดอะไรระหว่างคำนวณ'
              entries={entries}
            />
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title='สร้างรอบคำนวณใหม่' subheader='ค่าที่เลือกจะถูกล็อกติดไปกับ run ตลอดไป' />
              <CardContent className='flex flex-col gap-4'>
                <Typography variant='body2' color='text.secondary'>
                  ปีงบประมาณ · ขอบเขต · ฐานจำนวนเงิน (ACTUAL / BUDGET) · เวอร์ชันกติกาผังบัญชี —
                  ทั้งสี่ค่าถูกล็อกไว้เพื่อให้ คำนวณซ้ำแล้วได้ตัวเลขเดิมเป๊ะ แม้กติกาจะถูกแก้ไปแล้ว
                  ตั้งค่าเริ่มต้นได้ที่ <Link href='/admin/university/settings'>นโยบายการคำนวณ</Link>
                </Typography>

                {blockers.length > 0 && (
                  <Alert severity='error'>
                    <AlertTitle>สร้าง run ไม่ได้ตอนนี้</AlertTitle>
                    มี {blockers.length} ปัญหาที่ปิดกั้นอยู่ที่ <Link href='/admin/cost-data'>หน้าข้อมูลต้นทุน</Link> (
                    {blockers.map(issue => issue.title).join(' · ')})
                  </Alert>
                )}

                <Button fullWidth variant='contained' disabled startIcon={<i className='ri-play-line' />}>
                  เริ่มคำนวณ
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <ApprovalRules />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default RunsPage
