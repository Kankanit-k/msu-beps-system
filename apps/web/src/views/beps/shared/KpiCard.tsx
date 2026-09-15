// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Theme Imports
import { headingFontFamily } from '@core/theme/fonts'

/**
 * การ์ดตัวเลขสรุปหนึ่งตัว — แทน .kpi ของ mockup (beps.css)
 *
 * ใช้ร่วมกันทุกหน้าที่มีแถบ KPI ด้านบน (W1, W4a–c, W5, W12) เพื่อให้ขนาดและระยะเท่ากันหมด
 * สีรับเป็นชื่อ token ของธีมเท่านั้น ไม่รับค่าสีดิบ — จะได้อ่านออกทั้งโหมดสว่างและมืด
 */

type Props = {
  label: string
  /** ตัวเลขที่จัดรูปแล้ว — ตัวช่วยจัดรูปอยู่ที่ @/utils/beps-format */
  value: string
  /** บรรทัดหน่วย/คำอธิบายใต้ตัวเลข */
  unit?: ReactNode
  color?: 'text.primary' | 'primary.main' | 'success.main' | 'error.main' | 'warning.main' | 'info.main'
}

const KpiCard = ({ label, value, unit, color = 'text.primary' }: Props) => (
  <Card className='bs-full'>
    <CardContent className='flex flex-col gap-1'>
      <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ color, fontFamily: headingFontFamily, fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {unit && (
        <Typography variant='caption' color='text.disabled'>
          {unit}
        </Typography>
      )}
    </CardContent>
  </Card>
)

export default KpiCard
