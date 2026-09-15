// MUI Imports
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// React Imports

/**
 * กติกาการอนุมัติรอบคำนวณ — ย้ายจากการ์ด "กติกาการอนุมัติ" ของ
 * mockup/W11-allocation-run.html
 *
 * เป็นข้อความอธิบายกติกาที่ตั้งใจออกแบบไว้ ไม่ใช่ค่าที่มาจากข้อมูล จึงเขียนไว้ตรงนี้
 * — จุดสำคัญคือ **ผู้สร้างอนุมัติเองไม่ได้** ซึ่งเป็นหลักเดียวกับทุก workflow ในระบบ
 */

const RULES: { name: string; description: ReactNode; chip: string; color: 'error' | 'default' | 'success' }[] = [
  {
    name: 'ผู้สร้างอนุมัติเองไม่ได้',
    description: 'ปุ่มอนุมัติจะถูกปิดสำหรับผู้ใช้ที่เป็นคนสั่งคำนวณ run นั้น',
    chip: 'บังคับ',
    color: 'error'
  },
  {
    name: 'อนุมัติได้เฉพาะเมื่อตรวจยอดผ่าน',
    description: 'run ที่สถานะ FAILED ต้องแก้ต้นเหตุแล้วสร้างใหม่ ไม่มีทางข้าม',
    chip: 'บังคับ',
    color: 'error'
  },
  {
    name: 'รอบที่อนุมัติแล้วแก้ไม่ได้',
    description: (
      <>
        ผลถูกเขียนลง <code>break_even_result</code> แบบอ่านอย่างเดียว
      </>
    ),
    chip: 'immutable',
    color: 'default'
  },
  {
    name: 'มีได้ครั้งละหนึ่งรอบอ้างอิง',
    description: 'อนุมัติรอบใหม่ = รอบเก่ากลายเป็นประวัติ ยังเปิดดูและเทียบได้',
    chip: 'อัตโนมัติ',
    color: 'success'
  }
]

const ApprovalRules = () => (
  <Card className='bs-full'>
    <CardHeader title='กติกาการอนุมัติ' />
    <CardContent className='flex flex-col gap-4'>
      {RULES.map(rule => (
        <Box key={rule.name} className='flex justify-between items-start gap-3'>
          <div>
            <Typography sx={{ fontWeight: 600 }}>{rule.name}</Typography>
            <Typography variant='caption' color='text.secondary' component='div'>
              {rule.description}
            </Typography>
          </div>
          <Chip size='small' variant='tonal' color={rule.color} label={rule.chip} />
        </Box>
      ))}
    </CardContent>
  </Card>
)

export default ApprovalRules
