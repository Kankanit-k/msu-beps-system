// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// หน้าจอ W4 — ยังไม่ได้ย้ายเนื้อหาจาก mockup (ดูแผน Phase 3)
const CostStructurePage = () => {
  return (
    <Card>
      <CardHeader title='โครงสร้างต้นทุน' action={<Chip label='W4' size='small' color='primary' variant='tonal' />} />
      <CardContent>
        <Typography color='text.secondary'>
          ยังไม่ได้ย้ายเนื้อหาของหน้านี้จาก mockup — ต้นฉบับอยู่ที่ mockup/W4-*.html
        </Typography>
      </CardContent>
    </Card>
  )
}

export default CostStructurePage
