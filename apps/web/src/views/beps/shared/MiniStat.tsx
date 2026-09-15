// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Theme Imports
import { headingFontFamily } from '@core/theme/fonts'

/**
 * ตัวเลขสรุปขนาดเล็กในการ์ด — แทน .mini-stat ของ mockup (extra.css)
 *
 * ต่างจาก KpiCard ตรงที่อยู่ **ภายใน** การ์ดอื่น จึงไม่มีกรอบเป็นของตัวเอง
 * ใช้ในหน้าที่ต้องสรุปหลายตัวเลขของสิ่งเดียวกัน (W11 รอบคำนวณ · W12 ผลตรวจยอด)
 */

type Props = {
  label: string
  value: string
  sub?: ReactNode
  color?: string
}

const MiniStat = ({ label, value, sub, color = 'text.primary' }: Props) => (
  <Box
    sx={{
      paddingBlock: 3,
      paddingInline: 4,
      borderRadius: 1,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'action.hover'
    }}
  >
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography sx={{ color, fontFamily: headingFontFamily, fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3 }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant='caption' color='text.disabled'>
        {sub}
      </Typography>
    )}
  </Box>
)

export default MiniStat
