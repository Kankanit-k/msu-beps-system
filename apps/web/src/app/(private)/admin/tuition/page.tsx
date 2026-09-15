// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import FeeScheduleTable from '@views/beps/tuition/FeeSchedule'
import InsightList from '@views/beps/shared/InsightList'
import KpiCard from '@views/beps/shared/KpiCard'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'

// Data Imports
import { getProgramRegistry } from '@/server/beps/programs-registry'
import { getFeeLog, getFeeSchedules } from '@/server/beps/tuition'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * W8 — ค่าธรรมเนียมการศึกษา · ต้นฉบับ: mockup/W8-tuition.html
 *
 * prototype เดิมไม่มีหน้านี้เพราะค่าธรรมเนียมถูก fix มาในไฟล์ Excel แล้ว ระบบจริงต้องมี
 * ที่ให้กรอกและอนุมัติ — และอัตราที่ยังไม่อนุมัติ **ห้ามเข้าไปในการคำนวณ** ไม่งั้นจะได้ TR
 * ที่ยังไม่มีใครรับรอง แล้วผู้บริหารเอาไปตัดสินใจ
 */
const TuitionPage = () => {
  const fees = getFeeSchedules()
  const log = getFeeLog()
  const totals = getUniversityTotals()
  const programs = getProgramRegistry()

  const count = (status: string) => fees.filter(fee => fee.status === status).length

  /* หลักสูตรที่ยังไม่มีอัตราอนุมัติ — นับจากผลตรวจความพร้อมของทะเบียนหลักสูตร (W16)
     จะได้ไม่ต้องพิมพ์จำนวนไว้ตายตัวแบบที่ mockup ทำ */
  const missingFee = programs.filter(
    program => !program.readiness.find(check => check.label.includes('ค่าธรรมเนียม'))?.passed
  ).length

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ค่าธรรมเนียมการศึกษา'
          screen='W8'
          subtitle='ค่าธรรมเนียมเป็นต้นทางของ TR ทั้งระบบ — อัตราที่ยังไม่ผ่านอนุมัติจะไม่ถูกนำไปคำนวณ'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='อัตราที่อนุมัติแล้ว'
          value={fmtInt(count('APPROVED'))}
          unit='รายการ · พร้อมใช้คำนวณ'
          color='success.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='รออนุมัติ'
          value={fmtInt(count('PENDING_APPROVAL'))}
          unit='รายการ · เสนอแล้วรอผู้อนุมัติ'
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ร่าง (ยังไม่เสนอ)' value={fmtInt(count('DRAFT'))} unit='รายการ' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หลักสูตรที่ยังไม่มีอัตราอนุมัติ'
          value={fmtInt(missingFee)}
          unit='หลักสูตรในทะเบียน · TR คำนวณไม่ได้'
          color='error.main'
        />
      </Grid>

      <FeeScheduleTable fees={fees} />

      <Grid size={{ xs: 12, lg: 6 }}>
        <TimelineLog
          title='ประวัติการเสนอ / อนุมัติ'
          subheader={
            <>
              ตาราง <code>fee_approval_log</code>
            </>
          }
          entries={log.map(entry => ({ at: entry.at, icon: entry.icon, tone: entry.tone, content: entry.text }))}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='ทำไมหน้านี้ถึงต้องมี'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  <b>prototype เดิมไม่มีหน้านี้</b> เพราะค่าธรรมเนียมถูก fix มาในไฟล์ Excel แล้ว
                  ระบบจริงต้องมีที่ให้กรอกและอนุมัติ
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  อัตราที่ยังไม่อนุมัติ <b>ห้ามเข้าไปในการคำนวณ</b> — หลักสูตรนั้นจะติดธง <code>NO_FEE</code> ที่{' '}
                  <Link href='/admin/exceptions'>รายการค้างตรวจ</Link> และถูกกันออกจากยอดรวม
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  คนที่เสนออัตราและคนที่อนุมัติ<b>ต้องเป็นคนละคน</b> ปุ่มอนุมัติจะถูกปิดถ้าผู้ใช้ปัจจุบันเป็นผู้เสนอเอง
                </>
              )
            },
            {
              tone: 'ok',
              content: (
                <>
                  ทุกอัตรามี<b>ช่วงปีที่มีผล</b> — ขึ้นค่าเทอมปี 2569 แล้วรายงานปี 2568 ต้องไม่เปลี่ยนตาม
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default TuitionPage
