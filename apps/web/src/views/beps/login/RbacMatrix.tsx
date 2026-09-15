// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { BepsRoleInfo, RbacMark, RbacRow } from '@/server/beps/access'

/**
 * ตารางว่าแต่ละบทบาทเห็นหน้าจอไหนบ้าง — ย้ายจาก .rbac ของ mockup/W0-login.html
 *
 * 4 บทบาทตรงกับ CHECK constraint ของตาราง app_role ใน db/01_schema.sql ส่วนคอลัมน์
 * "ชั้นสิทธิ์" เป็นของใหม่: บอกว่าบทบาทนั้นแปลงไปเป็นชั้นไหนของเทมเพลต ซึ่งเป็นค่าที่
 * src/middleware.ts ใช้บังคับจริง (mockup ไม่มีชั้นนี้ให้เทียบ)
 */

const marks: Record<RbacMark, { symbol: string; label: string; color: string }> = {
  y: { symbol: '✓', label: 'ทำได้', color: 'var(--mui-palette-success-main)' },
  p: { symbol: '◑', label: 'ได้เฉพาะหน่วยงานที่ผูกไว้', color: 'var(--mui-palette-warning-main)' },
  n: { symbol: '−', label: 'ไม่เห็นเมนูเลย', color: 'var(--mui-palette-text-disabled)' }
}

type Props = {
  roles: BepsRoleInfo[]
  rows: RbacRow[]
}

const RbacMatrix = ({ roles, rows }: Props) => (
  <Card>
    <CardHeader
      title='สิทธิ์แต่ละบทบาทเห็นอะไรบ้าง'
      subheader={
        <>
          {marks.y.symbol} = {marks.y.label} · {marks.p.symbol} = ได้เฉพาะหน่วยงานที่ผูกไว้ใน <code>org_unit_id</code> ·{' '}
          {marks.n.symbol} = {marks.n.label}
        </>
      }
    />
    <CardContent className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        {roles.map(role => (
          <div key={role.key} className='flex items-baseline gap-2 flex-wrap'>
            <Chip size='small' variant='tonal' color='primary' label={`${role.label} · ${role.key}`} />
            <Typography variant='caption' color='text.secondary'>
              {role.description} ·{' '}
              {role.scoped ? <b>ขอบเขตถูกจำกัดด้วยหน่วยงานที่ผูกไว้กับบัญชี</b> : 'เห็นทุกหน่วยงาน'} · {role.userCount}{' '}
              บัญชี
            </Typography>
          </div>
        ))}
      </div>

      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>หน้าจอ / การกระทำ</th>
              {roles.map(role => (
                <th key={role.key} align='center'>
                  <div>{role.label}</div>
                  <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'none' }}>
                    {role.key}
                  </Typography>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.screen}-${row.label}`}>
                <td>
                  <Typography component='span' color='primary.main' sx={{ fontWeight: 600 }}>
                    {row.screen}
                  </Typography>{' '}
                  <Typography component='span' variant='body2'>
                    {row.label}
                  </Typography>
                </td>
                {row.marks.map((mark, index) => (
                  <td key={roles[index]?.key ?? index} align='center'>
                    <span
                      title={marks[mark].label}
                      style={{ color: marks[mark].color, fontSize: '1.125rem', fontWeight: 600 }}
                    >
                      {marks[mark].symbol}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Typography variant='body2' color='text.secondary'>
        <b>จุดที่ตั้งใจออกแบบ</b> — การอนุมัติแยกจากการแก้ไขเสมอ ผู้ที่เสนอเรื่องกดอนุมัติเรื่องของตัวเองไม่ได้
        ทั้งค่าธรรมเนียม (W8) หลักสูตร (W16) กติกาผังบัญชี (W14) นโยบาย (W15) และรอบคำนวณ (W11)
      </Typography>

      <Alert severity='warning'>
        <AlertTitle>ยังไม่ฟันธง</AlertTitle>
        schema มี 4 บทบาทและ<b>ไม่มีบทบาท &ldquo;ผู้อนุมัติ&rdquo; แยกต่างหาก</b> ตารางนี้จึงให้ <code>admin</code>{' '}
        เป็นผู้อนุมัติทุกเรื่อง ซึ่งแปลว่าผู้ดูแลระบบมีอำนาจอนุมัติเชิงนโยบายด้วย — ถ้าไม่ต้องการแบบนั้นต้องเพิ่ม role{' '}
        <code>approver</code> ใน <code>app_role</code> ก่อนเริ่มเขียนโค้ด
      </Alert>
    </CardContent>
  </Card>
)

export default RbacMatrix
