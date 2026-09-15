// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Util Imports
import { asset } from '@/utils/asset'

/**
 * แผงซ้ายของ W0 — บอกว่าทำไมระบบนี้ถึงต้องมีการระบุตัวตน
 *
 * ย้ายจาก .login-brand ของ mockup/W0-login.html ตรงตัว ข้อความไม่เปลี่ยน
 * ต่างกันที่สีพื้นมาจาก palette ของธีม (mockup ฮาร์ดโค้ดไล่เฉดน้ำเงินไว้ใน beps.css)
 */

const points: { icon: string; text: ReactNode }[] = [
  {
    icon: 'ri-shield-keyhole-line',
    text: (
      <>
        เข้าสู่ระบบด้วยบัญชี <b>MSU Account</b> เดียวกับระบบอื่นของมหาวิทยาลัย (SSO) ระบบไม่เก็บรหัสผ่านของตัวเอง
      </>
    )
  },
  {
    icon: 'ri-eye-line',
    text: (
      <>
        ผู้รับผิดชอบหลักสูตรเห็นเฉพาะคณะที่สังกัด · ผู้บริหารเห็นทุกคณะ · เมนูจัดการข้อมูลและตั้งค่าระบบ
        <b>ไม่ปรากฏเลย</b>สำหรับผู้ที่ไม่มีสิทธิ์
      </>
    )
  },
  {
    icon: 'ri-file-list-3-line',
    text: 'ทุกการแก้ข้อมูลหลัก การอนุมัติ และการสั่งคำนวณใหม่ ถูกบันทึกพร้อมชื่อผู้ทำและเวลา เพื่อให้ตอบได้ว่าตัวเลขแต่ละชุดมาจากใครและกติกาปีไหน'
  }
]

const LoginBrandPanel = () => (
  <Box
    sx={{
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 6,
      flex: 1,
      padding: 12,
      backgroundImage: 'linear-gradient(135deg, var(--mui-palette-primary-dark), var(--mui-palette-primary-main))',
      color: 'common.white'
    }}
  >
    <div className='flex items-center gap-4'>
      {/* <img> ธรรมดา (ไม่ใช่ next/image) จึงต้องเติม basePath เองด้วย asset() */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset('/images/logos/msu.jpg')}
        alt='ตราสัญลักษณ์มหาวิทยาลัยมหาสารคาม'
        style={{
          inlineSize: 60,
          blockSize: 60,
          borderRadius: 10,
          background: '#fff',
          padding: 4,
          objectFit: 'contain'
        }}
      />
      <div>
        <Typography variant='overline' sx={{ color: 'inherit', opacity: 0.75, letterSpacing: '0.16em' }}>
          Mahasarakham University
        </Typography>
        <Typography variant='h3' sx={{ color: 'inherit', fontWeight: 800, lineHeight: 1.1 }}>
          MSU-BEPS
        </Typography>
        <Typography variant='body2' sx={{ color: 'inherit', opacity: 0.8 }}>
          ระบบวิเคราะห์จุดคุ้มทุน · Break-Even Point System
        </Typography>
      </div>
    </div>

    <Typography sx={{ color: 'inherit', opacity: 0.88, maxInlineSize: 480 }}>
      ระบบนี้แสดงต้นทุนและจุดคุ้มทุนรายหลักสูตรของทั้งมหาวิทยาลัย ซึ่งเป็นข้อมูลที่กระทบการตัดสินใจ
      เรื่องงบประมาณและการเปิด/ปิดหลักสูตรโดยตรง จึงต้องระบุตัวตนก่อนเข้าใช้เสมอ และ
      <b>สิ่งที่แต่ละคนเห็นขึ้นอยู่กับสิทธิ์</b> — prototype เดิมไม่มีชั้นนี้เลย
    </Typography>

    <div className='flex flex-col gap-4' style={{ maxInlineSize: 480 }}>
      {points.map(point => (
        <div key={point.icon} className='flex items-start gap-3'>
          <i className={point.icon} style={{ fontSize: 20, opacity: 0.9, flexShrink: 0 }} />
          <Typography variant='body2' sx={{ color: 'inherit', opacity: 0.85 }}>
            {point.text}
          </Typography>
        </div>
      ))}
    </div>

    <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.6, maxInlineSize: 480 }}>
      หน้าจอ W0 · อ้างอิง SA.md §9 — ตาราง <code>app_user</code>, <code>role</code>, <code>user_role_scope</code>
    </Typography>
  </Box>
)

export default LoginBrandPanel
