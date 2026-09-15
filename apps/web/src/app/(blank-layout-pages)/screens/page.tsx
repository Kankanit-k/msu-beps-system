// Next Imports
import type { Metadata } from 'next'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'
import DataCaveatAlert from '@components/beps/DataCaveatAlert'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import ScreenCatalog from '@views/beps/screens/ScreenCatalog'

// Data Imports
import { bepsNavGroups, bepsOutsideShell } from '@/data/navigation/bepsNav'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { asset } from '@/utils/asset'
import { fmtInt, fmtMillions } from '@/utils/beps-format'

export const metadata: Metadata = {
  title: 'สารบัญหน้าจอ W0–W19 · MSU-BEPS',
  description: 'รายชื่อหน้าจอทั้งหมดของระบบวิเคราะห์จุดคุ้มทุน มหาวิทยาลัยมหาสารคาม'
}

/**
 * สารบัญหน้าจอทั้งระบบ — ต้นฉบับ: mockup/screens.html
 *
 * อยู่นอก shell และเปิดดูได้โดยไม่ต้องล็อกอิน (publicRoutes ใน accessControl.ts)
 * เพื่อให้ผู้เกี่ยวข้องเปิดดูโครงระบบได้ ลิงก์ที่ชี้เข้าหน้าที่ต้องมีสิทธิ์จะโดน middleware
 * เด้งไปหน้าเข้าสู่ระบบเอง
 */
const ScreensPage = () => {
  const totals = getUniversityTotals()

  const groups = [
    { label: 'เข้าใช้ระบบ', icon: 'ri-shield-keyhole-line', level: 'public' as const, items: bepsOutsideShell },
    ...bepsNavGroups
  ]

  return (
    <Box
      sx={{
        minBlockSize: '100dvh',
        backgroundColor: 'background.default',
        paddingBlock: 10,
        paddingInline: { xs: 6, md: 10 }
      }}
    >
      <div className='flex flex-col gap-8 mli-auto' style={{ maxInlineSize: 1280 }}>
        <div className='flex items-center gap-4'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset('/images/logos/msu.jpg')}
            alt='ตราสัญลักษณ์มหาวิทยาลัยมหาสารคาม'
            style={{
              inlineSize: 56,
              blockSize: 56,
              borderRadius: 10,
              background: '#fff',
              padding: 3,
              objectFit: 'contain'
            }}
          />
          <div>
            <Typography variant='overline' color='primary.main' sx={{ letterSpacing: '0.16em' }}>
              Mahasarakham University
            </Typography>
            <Typography variant='h4'>MSU-BEPS — สารบัญหน้าจอ</Typography>
          </div>
        </div>

        <Typography color='text.secondary' sx={{ maxInlineSize: 900 }}>
          หน้าจอครบทั้งระบบ <b>W0–W19</b> ตามที่ระบุใน <code>SA.md §9</code> · ตัวเลขทุกหน้ามาจาก{' '}
          <code>@beps/calc-engine</code> ชุดเดียวกัน · กำลังแสดง
          {totals.isSample ? <b> ชุดข้อมูลตัวอย่าง </b> : <b> ข้อมูลจริง </b>}
          (นิสิต {fmtInt(totals.q)} คน · {totals.facultyCount} คณะ · {fmtInt(totals.programCount)} หลักสูตร · ต้นทุนรวม{' '}
          {fmtMillions(totals.byMode.with_government.tc)} ลบ.)
        </Typography>

        {totals.isSample && <SampleDataAlert />}
        <DataCaveatAlert />

        <div className='flex gap-3 flex-wrap'>
          <Button variant='contained' component={Link} href='/overview' startIcon={<i className='ri-dashboard-line' />}>
            ไปหน้าแรก — ภาพรวมมหาวิทยาลัย
          </Button>
          <Button
            variant='outlined'
            component={Link}
            href='/login'
            startIcon={<i className='ri-shield-keyhole-line' />}
          >
            หน้าเข้าสู่ระบบ (W0)
          </Button>
        </div>

        <ScreenCatalog groups={groups} />

        <Typography
          variant='caption'
          color='text.disabled'
          sx={{ borderBlockStart: '1px solid', borderColor: 'divider', paddingBlockStart: 5 }}
        >
          <b>โครงสร้างไฟล์</b> — หน้าจออยู่ที่ <code>apps/web/src/app/</code> ส่วน UI จริงอยู่ที่{' '}
          <code>apps/web/src/views/beps/</code> · ข้อมูลอ่านผ่าน <code>apps/web/src/server/beps/</code> ชั้นเดียว
          (วันนี้เป็น fixture พรุ่งนี้เป็น API) · สูตร 1–7 อยู่ที่ <code>packages/calc-engine</code> ที่เดียวเท่านั้น ·{' '}
          <code>mockup/</code> เก็บไว้เป็นต้นฉบับอ้างอิง ไม่ได้ถูกใช้ตอนรัน
        </Typography>
      </div>
    </Box>
  )
}

export default ScreensPage
