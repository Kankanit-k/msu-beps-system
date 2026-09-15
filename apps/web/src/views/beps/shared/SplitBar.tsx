// MUI Imports
import Box from '@mui/material/Box'

/**
 * แถบสัดส่วนสองสี — แทน .split ของ mockup (extra.css)
 *
 * ใช้บอกสัดส่วน "ตรง : ปันส่วน" ใน W12 ทั้งระดับมหาวิทยาลัยและในแต่ละแถวของตารางรายคณะ
 */

type Props = {
  /** สัดส่วนส่วนแรก (ร้อยละ 0–100) */
  percent: number
  firstColor: string
  secondColor: string
  height?: number
  title?: string
}

const SplitBar = ({ percent, firstColor, secondColor, height = 10, title }: Props) => (
  <Box
    title={title}
    sx={{ display: 'flex', blockSize: height, borderRadius: 5, overflow: 'hidden', inlineSize: '100%' }}
  >
    <Box sx={{ flex: Math.max(percent, 0), backgroundColor: firstColor }} />
    <Box sx={{ flex: Math.max(100 - percent, 0), backgroundColor: secondColor }} />
  </Box>
)

export default SplitBar
