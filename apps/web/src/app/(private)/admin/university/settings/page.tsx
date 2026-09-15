// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import SettingsEditor from '@views/beps/settings/SettingsEditor'
import InsightList from '@views/beps/shared/InsightList'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'

// Data Imports
import { getQStarMethodComparison, getSettingLog, getSettings } from '@/server/beps/settings'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * W15 — นโยบายการคำนวณ (ค่าตั้งระบบ) · ต้นฉบับ: mockup/W15-settings.html
 *
 * ค่าตั้งที่มีเวอร์ชันรายปีคือสิ่งที่ทำให้ **เทียบตัวเลขข้ามปีได้** — ตอบได้ว่าตัวเลขปี 2567
 * คำนวณด้วยกติกาใด ถ้าไม่มีหน้านี้ นโยบายจะกลับไปฝังในโค้ดเหมือน prototype
 */
const SettingsPage = () => {
  const settings = getSettings()
  const log = getSettingLog()
  const comparison = getQStarMethodComparison()

  const pending = settings.filter(setting => setting.currentValue === null && setting.affectsNumbers)

  const qStarNote =
    comparison.sum_of_programs !== null && comparison.pooled !== null
      ? `คำนวณจากชุดข้อมูลที่โหลดอยู่: sum_of_programs = ${fmtInt(comparison.sum_of_programs)} คน · pooled = ${fmtInt(
          comparison.pooled
        )} คน — ต่างกัน ${fmtInt(comparison.difference ?? 0)} คน`
      : 'คำนวณเทียบสองวิธีไม่ได้กับชุดข้อมูลนี้ (มีหลักสูตรที่หา Q* ไม่ได้)'

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='นโยบายการคำนวณ (ค่าตั้งระบบ)'
          screen='W15'
          subtitle='ค่าตั้งมีเวอร์ชันรายปีและต้องอนุมัติ — ทุกส่วนของระบบอ่านจากค่าเดียวกัน'
        />
      </Grid>

      {pending.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            <AlertTitle>ยังไม่มีมติกำหนดค่าที่กระทบตัวเลข {pending.length} รายการ</AlertTitle>
            รายการที่ยังรอมติที่ประชุม: {pending.map(setting => setting.key).join(' · ')} ·
            ตัวเลขที่นำเสนออยู่ตอนนี้จึงเป็นผลของ<b>ค่าเริ่มต้น</b> ไม่ใช่นโยบายที่ผ่านการรับรอง
          </Alert>
        </Grid>
      )}

      <SettingsEditor settings={settings} qStarNote={qStarNote} />

      <Grid size={{ xs: 12, lg: 6 }}>
        <TimelineLog
          title='ประวัติการเปลี่ยนค่าตั้ง'
          subheader='ตอบได้ว่าตัวเลขปีไหนคำนวณด้วยกติกาใด'
          entries={log.map(entry => ({ at: entry.at, icon: entry.icon, tone: 'info' as const, content: entry.text }))}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='ทำไมค่าตั้งต้องมีเวอร์ชันรายปี'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  ถ้าไม่มีหน้านี้ นโยบายจะกลับไป<b>ฝังในโค้ด</b> และ<b>เทียบตัวเลขข้ามปีไม่ได้</b>{' '}
                  เพราะไม่รู้ว่าแต่ละปีคำนวณด้วยกติกาใด
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  ค่าที่ติดป้าย <b>กระทบตัวเลข</b> เปลี่ยนแล้วต้องสร้างรอบคำนวณใหม่ที่{' '}
                  <Link href='/admin/runs'>W11</Link> — ตัวเลขเก่าจะไม่เปลี่ยนตามเอง
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  <code>qstar_primary_method</code> สองวิธีให้ผลต่างกัน <b>{fmtInt(comparison.difference ?? 0)} คน</b>{' '}
                  ในระดับมหาวิทยาลัย — ไม่ใช่รายละเอียดปลีกย่อย แต่เป็นเรื่องที่ต้องมีมติ
                </>
              )
            },
            {
              tone: 'ok',
              content: (
                <>
                  ระบบ<b>คำนวณเก็บไว้ทั้ง 2 วิธีเสมอ</b> ค่าตั้งนี้เลือกแค่ว่าตัวไหนเป็นตัวหลักในรายงาน
                  จึงสลับได้โดยไม่ต้องคำนวณใหม่
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default SettingsPage
