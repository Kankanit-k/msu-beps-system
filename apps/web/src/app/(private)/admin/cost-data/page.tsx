// MUI Imports
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import SampleDataAlert from '@components/beps/SampleDataAlert'
import ReadinessChecklist from '@views/beps/cost-data/ReadinessChecklist'
import SourceTable from '@views/beps/cost-data/SourceTable'
import KpiCard from '@views/beps/shared/KpiCard'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'
import type { TimelineEntry, TimelineTone } from '@views/beps/shared/TimelineLog'

// Data Imports
import { getCostDataSources, getImportLog, getValidationIssues } from '@/server/beps/cost-data'
import type { ImportLogKind } from '@/server/beps/cost-data'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtMillions } from '@/utils/beps-format'

/**
 * W9 — ข้อมูลต้นทุน & การนำเข้า · ต้นฉบับ: mockup/W9-cost-data.html
 *
 * หน้านี้ **ไม่มี** ปุ่มคำนวณใหม่ — การคำนวณคือการสร้าง run ที่ต้องมีผู้อนุมัติ จึงอยู่ที่
 * W11 (/admin/runs) ส่วนกติกา TFC/TVC ที่แบบร่างเดิมเคยรวมไว้ที่นี่ ย้ายไป W14 เพราะ
 * ต้องมีช่วงปีที่มีผลและต้องอนุมัติ ไม่ใช่ช่องติ๊กในหน้านำเข้า
 */

const logStyle: Record<ImportLogKind, { icon: string; tone: TimelineTone }> = {
  OK: { icon: 'ri-check-line', tone: 'ok' },
  FILE: { icon: 'ri-file-excel-2-line', tone: 'info' },
  FAIL: { icon: 'ri-close-circle-line', tone: 'error' },
  BATCH: { icon: 'ri-archive-line', tone: 'info' }
}

const CostDataPage = () => {
  const totals = getUniversityTotals()
  const sources = getCostDataSources()
  const issues = getValidationIssues()
  const importLog = getImportLog()

  const okCount = sources.filter(source => source.state === 'OK').length
  const blockCount = issues.filter(issue => issue.severity === 'block').length

  const lastSync =
    sources
      .map(s => s.syncedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? '—'

  const entries: TimelineEntry[] = importLog.map(entry => ({
    at: entry.at,
    icon: logStyle[entry.kind].icon,
    tone: logStyle[entry.kind].tone,
    content: entry.text
  }))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ข้อมูลต้นทุน & การนำเข้า'
          screen='W9'
          subtitle='สถานะแหล่งข้อมูลต้นทาง · นำเข้า Excel · ตรวจความพร้อมก่อนสั่งคำนวณ'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ต้นทุนรวมที่นำเข้าแล้ว'
          value={fmtMillions(totals.byMode.with_government.tc)}
          unit='ล้านบาท'
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='แหล่งข้อมูลที่ครบถ้วน'
          value={`${okCount}`}
          unit={`จาก ${sources.length} แหล่ง`}
          color='success.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ปัญหาที่ปิดกั้นการคำนวณ'
          value={`${blockCount}`}
          unit='รายการ · ต้องแก้ก่อนสร้าง run'
          color='error.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ซิงก์ล่าสุด' value={lastSync} unit='อัตโนมัติทุกวัน' color='warning.main' />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <SourceTable sources={sources} />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <ReadinessChecklist issues={issues} />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title='นำเข้าด้วยไฟล์ Excel' subheader='สำรองไว้สำหรับแหล่งที่ยังไม่มี API' />
              <CardContent className='flex flex-col gap-4'>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    paddingBlock: 8,
                    paddingInline: 4,
                    textAlign: 'center',
                    backgroundColor: 'action.hover'
                  }}
                >
                  <Typography component='i' className='ri-file-excel-2-line' sx={{ fontSize: '2rem' }} />
                  <Typography sx={{ fontWeight: 600 }}>ลากไฟล์มาวาง หรือกดเลือกไฟล์</Typography>
                  <Typography variant='caption' color='text.disabled' component='div'>
                    รองรับ .xlsx ตามแม่แบบ &ldquo;จุดคุ้มทุน update.xlsx&rdquo; ชีต 1.รายได้ และ 2.ค่าใช้จ่าย
                  </Typography>
                  <Button variant='contained' size='small' disabled className='mbs-3'>
                    เลือกไฟล์
                  </Button>
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  ระบบจะ<b>ตรวจก่อนบันทึกเสมอ</b> — ตรวจหัวคอลัมน์ ตรวจว่าหน่วยงานมีอยู่จริง
                  ตรวจว่ายอดรวมตรงกับหน้าสรุปของไฟล์ ถ้าไม่ผ่านจะไม่เขียนลงฐานข้อมูลแม้แต่แถวเดียว
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TimelineLog
              title='ประวัติการนำเข้า'
              subheader={
                <>
                  ตาราง <code>import_batch</code>
                </>
              }
              entries={entries}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default CostDataPage
