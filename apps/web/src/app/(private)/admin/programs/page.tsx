// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import ProgramRegistryExplorer from '@views/beps/programs/ProgramRegistryExplorer'
import InsightList from '@views/beps/shared/InsightList'
import KpiCard from '@views/beps/shared/KpiCard'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'
import StepFlow from '@views/beps/shared/StepFlow'

// Data Imports
import { getProgramFlow, getProgramLog, getProgramRegistry } from '@/server/beps/programs-registry'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * W16 — ทะเบียนหลักสูตร · ต้นฉบับ: mockup/W16-programs.html
 *
 * ปรับปรุงหลักสูตร = **สร้างรุ่นใหม่ ไม่ใช่แก้ทับของเดิม** เพราะทุกตารางในระบบอ้าง
 * `program_version_id` ถ้าแก้ทับ ตัวเลขจุดคุ้มทุนของปีเก่าจะเปลี่ยนตามไปโดยไม่มีใครรู้
 */
const ProgramsPage = () => {
  const programs = getProgramRegistry()
  const flow = getProgramFlow()
  const log = getProgramLog()
  const totals = getUniversityTotals()

  const count = (predicate: (state: string) => boolean) => programs.filter(p => predicate(p.state)).length

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ทะเบียนหลักสูตร'
          screen='W16'
          subtitle='ปรับปรุงหลักสูตร = สร้างรุ่นใหม่ ไม่ใช่แก้ทับของเดิม — ทุกตัวเลขในระบบผูกกับ program_version_id'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หลักสูตรที่เปิดสอน'
          value={fmtInt(count(state => state === 'ACTIVE'))}
          unit='เข้าสู่การคำนวณจุดคุ้มทุน'
          color='success.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='รออนุมัติ / ร่างข้อเสนอ'
          value={fmtInt(count(state => state === 'PENDING_APPROVAL' || state === 'DRAFT'))}
          unit='ยังไม่เข้าสู่การคำนวณ'
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='กำลังปรับปรุงรอบ มคอ.'
          value={fmtInt(count(state => state === 'REVISING'))}
          unit='มีรุ่นใหม่รอมีผล'
          color='primary.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='งดรับ / ปิดหลักสูตร'
          value={fmtInt(count(state => state === 'SUSPENDED' || state === 'CLOSED'))}
          unit='ยังเก็บไว้เทียบข้ามปี'
          color='error.main'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='วงจรชีวิตหลักสูตรในระบบ'
            subheader='สถานะกำหนดว่าหลักสูตรนั้นเข้าสู่การคำนวณจุดคุ้มทุนหรือไม่'
          />
          <CardContent className='flex flex-col gap-4'>
            <StepFlow flow={flow.map(step => ({ state: step.state, label: step.label }))} current='ACTIVE' />
            <Typography variant='caption' color='text.secondary'>
              หลักสูตรที่ยังไม่ถึงสถานะ <b>เปิดสอน</b> จะยังไม่มีนิสิตและไม่มีต้นทุนจริง จึงประเมินได้เฉพาะแบบจำลองที่{' '}
              <Link href='/scenario/program'>W7 คำนวณจุดคุ้มทุนรายหลักสูตร</Link> — ตัวเลขจากที่นั่นเป็น{' '}
              <code>scenario_plan</code> ไม่ปนกับผลจริง
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <ProgramRegistryExplorer programs={programs} />

      <Grid size={{ xs: 12, lg: 5 }}>
        <TimelineLog
          title='บันทึกการเปลี่ยนแปลงทะเบียน'
          subheader={
            <>
              ตาราง <code>audit_event</code>
            </>
          }
          entries={log.map(entry => ({ at: entry.at, icon: entry.icon, tone: entry.tone, content: entry.text }))}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='จุดที่ต้องระวังในหน้านี้'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  <b>ห้ามแก้ชื่อ/คณะของหลักสูตรที่คำนวณไปแล้วโดยไม่สร้างรุ่นใหม่</b> — รายงานปีเก่าจะเปลี่ยนตาม
                  และตอบไม่ได้ว่าตัวเลขที่เคยเสนอผู้บริหารมาจากอะไร
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>งดรับนิสิต ≠ ปิดหลักสูตร</b> — หลักสูตรที่งดรับยังมีนิสิตคงค้างและยังมีต้นทุน ต้องคำนวณต่อ
                  ถ้าตัดออกจากยอดรวมจะทำให้ต้นทุนหายไปทั้งก้อน
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>หลักสูตรเปิดใหม่ที่ยังไม่มีค่าธรรมเนียมอนุมัติ</b> จะติดธง <code>NO_FEE</code> ที่{' '}
                  <Link href='/admin/exceptions'>W13</Link> และถูกกันออกจากยอดรวม ไม่ใช่คำนวณด้วยค่า 0
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  <b>รหัสหลักสูตรต้องมาจากระบบทะเบียน</b> (<code>program_code</code> เป็น UNIQUE) ห้ามตั้งเองด้วยชื่อไทย
                  ไม่งั้นจับคู่ข้ามระบบไม่ได้
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default ProgramsPage
