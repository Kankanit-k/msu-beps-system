// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * แถวสรุป "ชื่อ — จำนวน (สัดส่วน)" พร้อมจุดสีที่ตรงกับกราฟข้างบน
 *
 * ย้ายจาก row2() ที่ mockup/assets/core.js:56 — ใช้ร่วมกันหลายหน้า (W1, W4b, W4c)
 * สีรับเป็นค่าที่ resolve แล้วจาก useChartPalette เพื่อให้จุดสีตรงกับสีในกราฟเป๊ะๆ
 */

type Props = {
  label: string
  value: string
  share: string
  color: string
}

const ShareRow = ({ label, value, share, color }: Props) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 2,
      paddingBlock: 2,
      paddingInline: 3,
      backgroundColor: 'action.hover',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1
    }}
  >
    <Typography variant='body2' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ inlineSize: 9, blockSize: 9, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 700 }}>
      {value}{' '}
      <Typography component='span' variant='caption' color='text.disabled'>
        {share}
      </Typography>
    </Typography>
  </Box>
)

export default ShareRow
