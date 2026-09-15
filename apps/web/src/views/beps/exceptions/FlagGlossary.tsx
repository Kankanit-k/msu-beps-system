// MUI Imports
import type { ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// React Imports

// Style Imports
import tableStyles from '@core/styles/table.module.css'

/**
 * ความหมายของธงแต่ละประเภท — ย้ายจากการ์ด "ธงแต่ละประเภทหมายความว่าอะไร"
 * ของ mockup/W13-exceptions.html
 *
 * สิ่งที่ต้องบอกให้ชัดคือ **ระบบทำอะไรต่อ** กับรายการที่ติดธงนั้น ไม่ใช่แค่แปลชื่อธง
 * เพราะผลต่างกันมาก: บางธงยังถูกนับในยอดรวม บางธงถูกกันออกไปเลย
 */

const GLOSSARY: { flag: string; meaning: ReactNode }[] = [
  {
    flag: 'MISSING_SOURCE',
    meaning: (
      <>
        ไม่มีข้อมูลจากระบบต้นทางเลย — ระบบ<b>คำนวณโดยไม่มีตัวเลขนี้</b> ผลลัพธ์จึงต่ำกว่าความจริง
      </>
    )
  },
  {
    flag: 'UNCLASSIFIED',
    meaning: (
      <>
        มีเงินแต่ยังไม่รู้ว่าเป็น TFC หรือ TVC — <b>พักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร</b>
      </>
    )
  },
  {
    flag: 'MISSING_DRIVER',
    meaning: (
      <>
        กติกาสั่งให้ปันตามการใช้จริง แต่ไม่มีข้อมูลการใช้ — <b>ตกไปใช้วิธีสำรอง</b> และติดธง ESTIMATED
      </>
    )
  },
  {
    flag: 'NO_FEE',
    meaning: (
      <>
        ยังไม่มีอัตราค่าธรรมเนียมที่อนุมัติ — <b>TR คำนวณไม่ได้ กันหลักสูตรออกจากยอดรวม</b>
      </>
    )
  },
  {
    flag: 'Q_ZERO',
    meaning: (
      <>
        หลักสูตรเปิดแต่ไม่มีนิสิต — <b>R และ AVC เป็น null</b> หา Q* ไม่ได้ แต่ต้นทุนยังเกิดขึ้นจริง
      </>
    )
  }
]

const FlagGlossary = () => (
  <Card className='bs-full'>
    <CardHeader title='ธงแต่ละประเภทหมายความว่าอะไร' subheader='ระบบทำอะไรต่อกับรายการที่ติดธงนั้น' />
    <CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <tbody>
            {GLOSSARY.map(row => (
              <tr key={row.flag}>
                <td>
                  <Chip size='small' variant='tonal' color='warning' label={row.flag} />
                </td>
                <td style={{ whiteSpace: 'normal' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {row.meaning}
                  </Typography>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default FlagGlossary
