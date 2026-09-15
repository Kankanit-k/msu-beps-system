'use client'

// React Imports
import { useState } from 'react'

// Auth Imports
import { signIn } from 'next-auth/react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

/**
 * การ์ดเข้าสู่ระบบของ W0
 *
 * mockup วางฟอร์ม "บัญชีภายในระบบ" (ชื่อผู้ใช้ + รหัสผ่าน) ไว้ใต้ปุ่ม SSO ซึ่งขัดกับข้อความ
 * ของตัวเองที่แผงซ้ายว่า "ระบบไม่เก็บรหัสผ่านของตัวเอง" — และไม่มี credentials provider
 * รองรับจริงใน src/libs/ErpAuth.ts ฟอร์มนั้นจึงไม่ถูกย้ายมา เหลือทางเข้าเดียวคือ ERP SSO
 * (แผน Phase 3.2 ระบุไว้ว่า W0 ต้องต่อ signIn('erpauth') จริง ไม่ใช่ฟอร์มปลอม)
 *
 * เช่นเดียวกับ dropdown "เข้าใช้ในบทบาท" ของ mockup — บทบาทมาจากตาราง app_user ของบัญชี
 * ไม่ใช่สิ่งที่ผู้ใช้เลือกเองตอนล็อกอิน คำอธิบายบทบาทจึงย้ายไปอยู่ในตารางสิทธิ์ด้านล่างแทน
 * และการ "สลับมุมมอง" สำหรับบัญชีที่มีสิทธิ์สูงอยู่ที่ท้าย sidebar (useRole) ตามเดิม
 */
type Props = {
  /** ปลายทางหลังล็อกอินสำเร็จ — middleware แนบมาให้ตอนเด้งผู้ใช้มาหน้านี้ */
  callbackUrl: string
  /** รหัสข้อผิดพลาดที่ NextAuth ส่งกลับมาทาง query string */
  error?: string
}

const SsoSignInCard = ({ callbackUrl, error }: Props) => {
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = () => {
    setIsSigningIn(true)
    signIn('erpauth', { callbackUrl })
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-5'>
        <div>
          <Typography variant='h5'>เข้าสู่ระบบ</Typography>
          <Typography variant='body2' color='text.secondary'>
            ใช้บัญชี MSU Account ของท่าน
          </Typography>
        </div>

        {error && (
          <Alert severity='error'>
            เข้าสู่ระบบไม่สำเร็จ ({error}) — หากยืนยันตัวตนกับ ERP ผ่านแล้วแต่ยังเข้าไม่ได้
            แปลว่าบัญชีนี้ยังไม่ถูกเพิ่มใน BEPS ติดต่อกองแผนงาน
          </Alert>
        )}

        <Button
          fullWidth
          size='large'
          variant='contained'
          disabled={isSigningIn}
          onClick={handleSignIn}
          startIcon={<i className='ri-graduation-cap-line' />}
        >
          {isSigningIn ? 'กำลังพาไปหน้า ERP…' : 'เข้าสู่ระบบด้วย MSU Account (SSO)'}
        </Button>

        <Typography variant='caption' color='text.disabled'>
          ระบบไม่รับสมัครสมาชิกเองและไม่เก็บรหัสผ่าน — การยืนยันตัวตนทำที่ ERP ของมหาวิทยาลัย
          ลืมรหัสผ่านติดต่อสำนักคอมพิวเตอร์
        </Typography>
      </CardContent>
    </Card>
  )
}

export default SsoSignInCard
