// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

/**
 * แถบเตือนว่ากำลังดูชุดข้อมูลตัวอย่าง — ย้ายมาจาก sampleBanner() ที่ mockup/assets/core.js:262
 *
 * ต้องติดทุกหน้าที่แสดงตัวเลขการเงิน ตราบใดที่ IS_SAMPLE_DATA ยังเป็น true
 * (ดู src/data/fixtures/raw.ts) — ถ้าวันหนึ่งสลับไปอ่านจาก apps/api แล้วลืมปิดธง
 * แถบนี้จะยังขึ้นให้เห็นทันทีว่าตัวเลขบนจอไม่ใช่ของจริง
 */
const SampleDataAlert = () => (
  <Alert severity='error'>
    <AlertTitle>ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่าง ไม่ใช่ของจริง</AlertTitle>
    repo นี้ไม่เก็บข้อมูลการเงินของมหาวิทยาลัย จึงใช้ชุดที่สุ่มรบกวนตัวเลขแล้ว ความสัมพันธ์ระหว่างสูตรทุกตัวยังถูกต้อง
    แต่<b>ห้ามนำตัวเลขไปอ้างอิง</b>
  </Alert>
)

export default SampleDataAlert
