// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// หน้าจอ W7 — ยังไม่ได้ย้ายเนื้อหาจาก mockup (ดูแผน Phase 3)
const ScenarioProgramPage = () => {
  return (
    <Card>
      <CardHeader
        title='จุดคุ้มทุนรายหลักสูตร'
        action={<Chip label='W7' size='small' color='primary' variant='tonal' />}
      />
      <CardContent>
        <Typography color='text.secondary'>
          ยังไม่ได้ย้ายเนื้อหาของหน้านี้จาก mockup — ต้นฉบับอยู่ที่ mockup/W7-*.html
        </Typography>
      </CardContent>
    </Card>
  )
}

export default ScenarioProgramPage
