// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Util Imports
import { fmtDec } from '@/utils/beps-format'

/**
 * การจำแนกประเภทต้นทุน — หมวดรายจ่ายที่นับเป็น TFC และ TVC
 *
 * รายการหมวดมาจากไฟล์ต้นฉบับ (คงที่ตามเอกสาร) ส่วน **สัดส่วน TFC : TVC คำนวณจาก
 * ชุดข้อมูลที่โหลดอยู่** ไม่ใช่ตัวเลขที่พิมพ์ไว้ตายตัวแบบใน mockup
 *
 * กติกาว่าหมวดไหนคงที่/ผันแปรจริงๆ ถูกบังคับที่ account_behavior_rule (W14) ต่อปีงบประมาณ
 * หน้านี้เป็นคำอธิบายภาพรวมเท่านั้น ไม่ใช่แหล่งอ้างอิงของเครื่องคำนวณ
 */

const FIXED_CATEGORIES = [
  '100 เงินเดือน',
  '210 ค่าจ้างประจำ',
  '220 ค่าจ้างชั่วคราว',
  '230 ค่าตอบแทน พรก.',
  '300 ค่าตอบแทน',
  '400 ค่าใช้สอย',
  '500 ค่าวัสดุ',
  '600 ค่าครุภัณฑ์',
  '800 เงินอุดหนุน',
  '900 รายจ่ายอื่น',
  '+ ค่าเสื่อมราคา'
]

const VARIABLE_CATEGORIES = [
  '300 ค่าตอบแทน',
  '400 ค่าใช้สอย',
  '410 ค่าสาธารณูปโภค',
  '500 ค่าวัสดุ',
  '800 เงินอุดหนุน',
  '900 รายจ่ายอื่น',
  '×Q ศึกษาทั่วไป',
  '×Q ค่าธรรมเนียมรายการหลัก',
  '×Q หักสมทบมหาวิทยาลัย'
]

type BoxProps = {
  title: string
  color: 'primary' | 'warning'
  categories: string[]
}

const CategoryBox = ({ title, color, categories }: BoxProps) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, padding: 4, blockSize: '100%' }}>
    <Typography variant='subtitle2' color={`${color}.main`} className='mbe-3'>
      {title}
    </Typography>
    <Box className='flex flex-wrap gap-2'>
      {categories.map(c => (
        <Chip key={c} label={c} size='small' variant='tonal' color={color} />
      ))}
    </Box>
  </Box>
)

type Props = {
  fixedCostShare: number
  variableCostShare: number
}

const CostClassification = ({ fixedCostShare, variableCostShare }: Props) => (
  <Card>
    <CardHeader avatar={<i className='ri-price-tag-3-line' />} title='การจำแนกประเภทต้นทุน (Cost Classification)' />
    <CardContent className='flex flex-col gap-4'>
      <Typography variant='body2' color='text.secondary'>
        ตามหมวดรายจ่ายในไฟล์ต้นฉบับ · สัดส่วนจากชุดข้อมูลที่โหลดอยู่ TFC : TVC ={' '}
        <b>
          {fmtDec(fixedCostShare)} : {fmtDec(variableCostShare)}
        </b>
      </Typography>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CategoryBox title='ต้นทุนคงที่ (TFC) — ไม่แปรผันตามนิสิต' color='primary' categories={FIXED_CATEGORIES} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CategoryBox title='ต้นทุนผันแปร (TVC) — แปรผันตามนิสิต' color='warning' categories={VARIABLE_CATEGORIES} />
        </Grid>
      </Grid>

      <Alert severity='warning'>
        TVC ในไฟล์ใหม่รวม <b>ค่าธรรมเนียมรายการหลัก</b> และ <b>หักสมทบมหาวิทยาลัย (2,235 บ./คน/เทอม)</b>{' '}
        ซึ่งคิดตามรายหัวนิสิต จึงทำให้สัดส่วน TVC สูงกว่าการคำนวณแบบเดิม
      </Alert>
    </CardContent>
  </Card>
)

export default CostClassification
