// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

/**
 * หัวหน้าจอมาตรฐานของทุกหน้า BEPS — ชื่อหน้า + รหัสหน้าจอ + คำอธิบายหนึ่งบรรทัด
 *
 * รหัส W ต้องติดอยู่ทุกหน้า เพื่อให้อ้างกลับไปยัง SA.md §9 และ mockup ต้นฉบับได้
 * (mockup แสดงไว้ที่ topbar ผ่าน buildShell — เทมเพลตมี navbar เป็นของตัวเองแล้ว
 * รหัสหน้าจอจึงย้ายลงมาอยู่กับหัวข้อของหน้าแทน)
 */

type Props = {
  title: string
  /** รหัสหน้าจอ เช่น W1 */
  screen: string
  subtitle?: ReactNode
  /** ปุ่ม/ตัวกรองที่วางชิดขวาของหัวข้อ */
  action?: ReactNode
}

const PageHeader = ({ title, screen, subtitle, action }: Props) => (
  <div className='flex justify-between items-start gap-4 flex-wrap'>
    <div>
      <div className='flex items-center gap-3 flex-wrap'>
        <Typography variant='h4'>{title}</Typography>
        <Chip label={screen} size='small' color='primary' variant='tonal' />
      </div>
      {subtitle && <Typography color='text.secondary'>{subtitle}</Typography>}
    </div>
    {action}
  </div>
)

export default PageHeader
