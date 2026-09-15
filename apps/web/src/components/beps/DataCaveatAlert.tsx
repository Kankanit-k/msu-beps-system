// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

// Component Imports
import Link from '@components/Link'

// Data Imports
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtMillions } from '@/utils/beps-format'

/**
 * แถบเตือนข้อจำกัดของชุดข้อมูล — ย้ายมาจาก dataCaveat() ที่ mockup/assets/core.js:281
 *
 * ค่าเสื่อมราคาอาคารยังไม่มีข้อมูล (ฟิลด์ dep มีเฉพาะครุภัณฑ์) TFC/TC จึงต่ำกว่าความจริง
 * **ต้นทุนที่ขาดไปทำให้ผลลัพธ์ดูดีเกินจริงเสมอ** — ถ้ากำไรก็สูงเกินจริง ถ้าขาดทุนก็ขาดทุน
 * น้อยกว่าจริง และ Q* ทุกระดับต่ำกว่าที่ควรเป็น ข้อความจึงต้องกลับทิศตามเครื่องหมายของ
 * ผลประกอบการ ไม่ใช่เขียนว่า "สูงเกินจริง" ไว้ตายตัว (บั๊กที่เคยแก้ไปแล้วที่ commit 6b75d9a)
 *
 * ต้องติดทุกหน้าที่แสดงส่วนเกินหรือ Q* ไม่ให้ผู้บริหารอ่านเป็นตัวเลขสุดท้าย
 */
const DataCaveatAlert = () => {
  const { byMode, depreciation } = getUniversityTotals()

  /* ใช้ฐานรวมเงินแผ่นดินเป็นตัวเล่าเสมอ — เป็นฐานที่สะท้อนต้นทุนจริงทั้งหมด
     และประเด็นของแถบนี้คือฝั่ง "ต้นทุน" ที่ยังขาด ไม่ใช่ฝั่งรายได้ที่ปุ่มบน navbar สลับ */
  const { profit } = byMode.with_government

  return (
    <Alert severity='warning'>
      <AlertTitle>ข้อจำกัดของข้อมูลชุดนี้</AlertTitle>
      ค่าเสื่อมราคาอาคารยังไม่ครบ (ฟิลด์ <code>dep</code> รวม {fmtMillions(depreciation)} ลบ. มีเฉพาะครุภัณฑ์) TFC และ
      TC จึงต่ำกว่าความจริง{' '}
      {profit >= 0 ? (
        <>
          ส่วนเกิน +{fmtMillions(profit)} ลบ. ที่รายงานอยู่จึง<b>สูงเกินจริง</b>
        </>
      ) : (
        <>
          ตัวเลขขาดทุน {fmtMillions(Math.abs(profit))} ลบ. ที่รายงานอยู่จึง<b>น้อยกว่าความจริง</b>
        </>
      )}{' '}
      และ Q* ทุกระดับ<b>ต่ำกว่าที่ควรเป็น</b> — ดูรายการค้างที่ <Link href='/admin/exceptions'>รายการค้างตรวจ</Link>
    </Alert>
  )
}

export default DataCaveatAlert
