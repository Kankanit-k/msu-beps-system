/**
 * ตัวช่วยจัดรูปตัวเลขและชื่อ — ย้ายมาจาก mockup/assets/core.js:10-15
 *
 * เป็นเรื่องการ **แสดงผล** ล้วน ไม่ใช่สูตร — สูตรทั้งหมดอยู่ที่ @beps/calc-engine
 * เท่านั้น (ดู src/data/fixtures/raw.parity.test.ts ว่าทำไมถึงห้ามมีสูตรสองชุด)
 */

/** บังคับเป็นตัวเลข ค่าที่ไม่ใช่ตัวเลขหรือ NaN ให้เป็น 0 */
export const num = (v: unknown): number => Number(v) || 0

/** บาท → ล้านบาท */
export const toMillions = (v: unknown): number => num(v) / 1e6

/** บาท → ข้อความล้านบาท ทศนิยม 1 ตำแหน่ง เช่น 1,669.2 */
export const fmtMillions = (v: unknown): string =>
  toMillions(v).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** ตัวเลขจำนวนเต็มพร้อมตัวคั่นหลักพัน เช่น 54,949 */
export const fmtInt = (v: unknown): string => Math.round(num(v)).toLocaleString('th-TH')

/** ตัวเลขทศนิยมคงที่ เช่น สัดส่วนร้อยละ */
export const fmtDec = (v: unknown, digits = 1): string =>
  num(v).toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** ย่อชื่อหน่วยงานให้พอดีแกนกราฟ — ตัดคำนำหน้าที่ซ้ำกันทุกคณะออก */
export const shortOrgName = (s: string): string =>
  s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.')

/** เครื่องหมายนำหน้าค่าบวก/ลบ — ใช้ − (U+2212) ไม่ใช่ยัติภังค์ ให้ความกว้างตรงกับ + */
export const withSign = (v: number, format: (n: number) => string): string =>
  `${v >= 0 ? '+' : '−'}${format(Math.abs(v))}`
