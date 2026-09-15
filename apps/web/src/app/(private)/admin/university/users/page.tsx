// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Grid from '@mui/material/Grid'

// Component Imports
import RbacMatrix from '@views/beps/login/RbacMatrix'
import InsightList from '@views/beps/shared/InsightList'
import KpiCard from '@views/beps/shared/KpiCard'
import PageHeader from '@views/beps/shared/PageHeader'
import TimelineLog from '@views/beps/shared/TimelineLog'
import UserDirectory from '@views/beps/users/UserDirectory'

// Data Imports
import { getRbacMatrix, getRoles, getUserLog, getUsers } from '@/server/beps/access'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * W18 — ผู้ใช้และสิทธิ์ · ต้นฉบับ: mockup/W18-users.html
 *
 * ตารางสิทธิ์เต็มใช้คอมโพเนนต์เดียวกับหน้าเข้าสู่ระบบ (W0) — เป็นข้อมูลชุดเดียวกัน
 * ถ้าแยกกันเขียนจะค่อยๆ ไม่ตรงกัน แล้วผู้ใช้จะเห็นสิทธิ์คนละแบบในสองหน้า
 */
const UsersPage = () => {
  const users = getUsers()
  const roles = getRoles()
  const rbac = getRbacMatrix()
  const log = getUserLog()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ผู้ใช้และสิทธิ์'
          screen='W18'
          subtitle='ผู้ใช้หนึ่งคนมีหนึ่งบทบาทและหนึ่งขอบเขต — app_role_id บอกว่าทำอะไรได้ · org_unit_id บอกว่าเห็นข้อมูลของใคร'
        />
      </Grid>

      {roles.map(role => (
        <Grid key={role.key} size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={role.label}
            value={fmtInt(role.userCount)}
            unit={`บัญชี · ${role.scoped ? 'จำกัดขอบเขต' : 'เห็นทุกหน่วยงาน'}`}
          />
        </Grid>
      ))}

      <Grid size={{ xs: 12 }}>
        <Alert severity='warning'>
          <AlertTitle>ต้องตัดสินใจก่อนเริ่มเขียนโค้ด</AlertTitle>
          <code>app_role</code> มี CHECK constraint ล็อกไว้ 4 ค่า และ<b>ไม่มีบทบาท &ldquo;ผู้อนุมัติ&rdquo; แยก</b>{' '}
          ทั้งที่ SA กำหนดว่าผู้เสนอกดอนุมัติเรื่องของตัวเองไม่ได้ · ตอนนี้จึงตกเป็นภาระของ <code>admin</code>{' '}
          ซึ่งแปลว่า<b>ผู้ดูแลระบบมีอำนาจอนุมัติเชิงนโยบายด้วย</b> — ถ้าไม่ต้องการแบบนี้ ต้องเพิ่ม role{' '}
          <code>approver</code> ใน schema ก่อน
        </Alert>
      </Grid>

      <UserDirectory users={users} roles={roles} />

      <Grid size={{ xs: 12, lg: 5 }}>
        <TimelineLog
          title='บันทึกการเปลี่ยนสิทธิ์'
          subheader='การให้และเพิกถอนสิทธิ์ต้องตรวจย้อนหลังได้เสมอ'
          entries={log.map(entry => ({ at: entry.at, icon: entry.icon, tone: entry.tone, content: entry.text }))}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <RbacMatrix roles={roles} rows={rbac} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='กติกาสิทธิ์ที่ระบบต้องบังคับ'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  <b>ผู้เสนอกดอนุมัติเรื่องของตัวเองไม่ได้</b> — บังคับที่ระดับหลังบ้าน ไม่ใช่แค่ซ่อนปุ่ม เพราะเรียก API
                  ตรงได้
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>ขอบเขตต้องกรองที่ query ไม่ใช่ที่หน้าจอ</b> — <code>faculty_officer</code> ที่ผูกกับคณะหนึ่ง
                  ต้องดึงข้อมูลคณะอื่นไม่ได้แม้จะแก้ URL เอง
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>เปลี่ยนสิทธิ์ไม่ย้อนหลัง</b> — รายการที่เคยอนุมัติไปแล้วยังคงชื่อผู้อนุมัติเดิม
                  แม้คนนั้นจะถูกถอนสิทธิ์ภายหลัง
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  <b>ระบบไม่เก็บรหัสผ่านเอง</b> — ยืนยันตัวตนผ่าน MSU Account (SSO) ตารางนี้เก็บแค่บทบาทและขอบเขต
                </>
              )
            },
            {
              tone: 'ok',
              content: (
                <>
                  <b>บัญชีที่ไม่เข้าใช้เกิน 180 วันถูกระงับอัตโนมัติ</b> — ปลดล็อกได้โดยผู้ดูแลระบบ
                  ไม่ลบทิ้งเพราะยังต้องอ้างในประวัติการอนุมัติ
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default UsersPage
