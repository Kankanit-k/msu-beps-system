// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Theme Imports
import { headingFontFamily } from '@core/theme/fonts'

/**
 * การ์ดอธิบายสูตรหนึ่งสูตร — แทน .fm-card / .fm-eq ของ mockup (beps.css:206-210)
 *
 * สีทั้งหมดมาจาก palette ของธีม ไม่มีค่าฮาร์ดโค้ด เพราะ mockup ไม่เคยมี dark mode
 * แต่หน้าที่ย้ายมาต้องอ่านได้ทั้ง 2 โหมด (ดูเกณฑ์ Verification ข้อ 7 ในแผน)
 */

type FormulaCardProps = {
  title: string
  /** คลาสไอคอน Remix เช่น ri-function-line */
  icon: string
  children: ReactNode
  /** ปุ่ม/ป้ายมุมขวาของหัวการ์ด */
  action?: ReactNode
}

export const FormulaCard = ({ title, icon, children, action }: FormulaCardProps) => (
  <Card className='bs-full'>
    <CardHeader avatar={<i className={icon} />} title={title} action={action} />
    <CardContent className='flex flex-col gap-3'>{children}</CardContent>
  </Card>
)

type FormulaEquationProps = {
  children: ReactNode
  /**
   * `warning` = กรณียกเว้นของสูตร (ฐานไม่รวมเงินแผ่นดิน · สูตร 7)
   * ตรงกับ .fm-eq.gold ของ mockup ที่ใช้สีทองเพื่อบอกว่า "ไม่ใช่เส้นทางปกติ"
   */
  color?: 'primary' | 'warning'
}

export const FormulaEquation = ({ children, color = 'primary' }: FormulaEquationProps) => (
  <Box
    component='p'
    sx={{
      backgroundColor: `${color}.main`,
      color: `${color}.contrastText`,
      borderRadius: 1,
      paddingBlock: 3,
      paddingInline: 4,
      textAlign: 'center',
      fontFamily: headingFontFamily,
      fontWeight: 600,
      fontSize: '0.9375rem',
      letterSpacing: '0.3px'
    }}
  >
    {children}
  </Box>
)
