'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import HighlightText from '@views/beps/shared/HighlightText'
import TableToolbar from '@views/beps/shared/TableToolbar'

// Type Imports
import type { AppUser, BepsRoleInfo } from '@/server/beps/access'
import type { BepsRole } from '@/configs/accessControl'

/**
 * รายชื่อผู้ใช้ + สิทธิ์ที่ได้จริง — ย้ายจาก `user-tb` / `detail` ของ mockup/W18-users.html
 *
 * ผู้ใช้หนึ่งคนมี **หนึ่งบทบาท** และ **หนึ่งขอบเขต** ตามตาราง `app_user` —
 * `app_role_id` บอกว่าทำอะไรได้ · `org_unit_id` บอกว่าเห็นข้อมูลของใคร (NULL = ทุกหน่วยงาน)
 */

const roleColor: Record<BepsRole, 'error' | 'primary' | 'success' | 'warning'> = {
  admin: 'error',
  budget_office: 'primary',
  faculty_officer: 'success',
  viewer: 'warning'
}

type Props = {
  users: AppUser[]
  roles: BepsRoleInfo[]
}

const UserDirectory = ({ users, roles }: Props) => {
  const [role, setRole] = useState<'all' | BepsRole>('all')
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(users[0]?.email ?? '')

  const query = search.trim().toLowerCase()

  const rows = users
    .filter(user => role === 'all' || user.role === role)
    .filter(
      user => !query || [user.name, user.email, user.org ?? ''].some(value => value.toLowerCase().includes(query))
    )

  const selected = users.find(user => user.email === selectedEmail) ?? users[0]
  const selectedRole = roles.find(r => r.key === selected?.role)

  const filters: { value: 'all' | BepsRole; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    ...roles.map(r => ({ value: r.key, label: r.label }))
  ]

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder='ค้นหาชื่อ / อีเมล / หน่วยงาน…'
            filters={filters}
            filter={role}
            onFilterChange={setRole}
          />
          <Chip size='small' variant='tonal' color='primary' label={`${rows.length} จาก ${users.length} บัญชี`} />
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title='รายชื่อผู้ใช้'
            subheader={
              <>
                คลิกแถวเพื่อดูสิทธิ์ที่ได้จริง · ตาราง <code>app_user</code>
              </>
            }
          />
          <CardContent>
            <div className='overflow-auto' style={{ maxBlockSize: 520 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>ชื่อ / อีเมล</th>
                    <th>บทบาท</th>
                    <th>ขอบเขตที่เห็น</th>
                    <th>เข้าใช้ล่าสุด</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} align='center'>
                        <Typography color='text.disabled'>ไม่พบผู้ใช้ที่ตรงกับตัวกรอง</Typography>
                      </td>
                    </tr>
                  ) : (
                    rows.map(user => (
                      <tr
                        key={user.email}
                        onClick={() => setSelectedEmail(user.email)}
                        style={{
                          cursor: 'pointer',
                          opacity: user.isActive ? 1 : 0.6,
                          backgroundColor:
                            user.email === selectedEmail ? 'var(--mui-palette-primary-lighterOpacity)' : undefined
                        }}
                      >
                        <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            <HighlightText text={user.name} query={query} />
                          </Typography>
                          <Typography variant='caption' color='text.disabled'>
                            <HighlightText text={user.email} query={query} />
                          </Typography>
                        </td>
                        <td>
                          <Chip size='small' variant='tonal' color={roleColor[user.role]} label={user.roleLabel} />
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <Typography variant='body2' color='text.secondary'>
                            {user.org ?? 'ทุกหน่วยงาน'}
                          </Typography>
                        </td>
                        <td>
                          <Typography variant='caption' color='text.disabled'>
                            {user.lastSignIn}
                          </Typography>
                        </td>
                        <td>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={user.isActive ? 'success' : 'default'}
                            label={user.isActive ? 'ใช้งาน' : 'ระงับ'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card className='bs-full'>
          <CardHeader
            title={selected?.name ?? '—'}
            subheader={selected?.email}
            action={
              selected && (
                <Chip size='small' variant='tonal' color={roleColor[selected.role]} label={selected.roleLabel} />
              )
            }
          />
          <CardContent className='flex flex-col gap-4'>
            <div>
              <Typography variant='caption' color='text.secondary'>
                บทบาทนี้ทำอะไรได้
              </Typography>
              <Typography variant='body2'>{selectedRole?.description}</Typography>
            </div>

            <div>
              <Typography variant='caption' color='text.secondary'>
                ขอบเขตข้อมูลที่เห็น (org_unit_id)
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{selected?.org ?? 'ทุกหน่วยงาน (NULL)'}</Typography>
              {selectedRole?.scoped && (
                <Typography variant='caption' color='warning.main'>
                  บทบาทนี้ถูกจำกัดขอบเขต — ต้องกรองที่ query ไม่ใช่ที่หน้าจอ
                </Typography>
              )}
            </div>

            <div>
              <Typography variant='caption' color='text.secondary'>
                ชั้นสิทธิ์ที่ระบบใช้บังคับจริง (middleware)
              </Typography>
              <Typography component='code' sx={{ fontWeight: 600 }}>
                {selectedRole?.accessLevel}
              </Typography>
            </div>

            <Typography variant='caption' color='text.secondary'>
              ระบบไม่เก็บรหัสผ่านเอง — ยืนยันตัวตนผ่าน MSU Account (SSO) ตารางนี้เก็บแค่บทบาทและขอบเขต
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default UserDirectory
