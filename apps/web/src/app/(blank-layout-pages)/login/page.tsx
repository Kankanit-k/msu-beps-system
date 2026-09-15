// Next Imports
import type { Metadata } from 'next'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

// Component Imports
import Link from '@components/Link'
import LoginBrandPanel from '@views/beps/login/LoginBrandPanel'
import RbacMatrix from '@views/beps/login/RbacMatrix'
import SsoSignInCard from '@views/beps/login/SsoSignInCard'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Data Imports
import { getRbacMatrix, getRoles } from '@/server/beps/access'

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ · MSU-BEPS',
  description: 'เข้าสู่ระบบวิเคราะห์จุดคุ้มทุน มหาวิทยาลัยมหาสารคาม ด้วยบัญชี MSU Account'
}

/**
 * W0 — เข้าสู่ระบบ + ตารางสิทธิ์
 *
 * อยู่นอก shell จึงใช้ (blank-layout-pages) และเป็นเส้นทางสาธารณะ (accessControl.ts)
 * ต้นฉบับ: mockup/W0-login.html
 */
type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

const LoginPage = async ({ searchParams }: Props) => {
  const roles = getRoles()
  const rows = getRbacMatrix()

  /* อ่าน query string ฝั่ง server แล้วส่งลงไปเป็น prop — ถ้าให้การ์ดเรียก useSearchParams เอง
     Next จะกัน subtree นั้นออกจาก SSR ทั้งก้อน (ต้องมี Suspense ครอบ) แล้วผู้ใช้จะเห็น
     placeholder แทนปุ่มเข้าสู่ระบบจนกว่า JS จะโหลดเสร็จ */
  const { callbackUrl, error } = await searchParams

  return (
    <div className='flex bs-full min-bs-[100dvh]'>
      <LoginBrandPanel />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          flex: 1,
          overflowY: 'auto',
          padding: { xs: 6, md: 10 },
          backgroundColor: 'background.default'
        }}
      >
        <div className='flex flex-col gap-6 is-full' style={{ maxInlineSize: 680 }}>
          <SsoSignInCard callbackUrl={callbackUrl || themeConfig.homePageUrl} error={error} />

          <RbacMatrix roles={roles} rows={rows} />

          <div className='flex justify-center gap-2 flex-wrap'>
            <Button variant='text' component={Link} href='/screens' startIcon={<i className='ri-menu-line' />}>
              สารบัญหน้าจอทั้งหมด
            </Button>
          </div>
        </div>
      </Box>
    </div>
  )
}

export default LoginPage
