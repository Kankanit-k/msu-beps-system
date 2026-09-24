/**
 * ทางลัด dev สำหรับข้ามการล็อกอิน — ใช้ร่วมกันทั้ง middleware และ route handler
 *
 * **ทำไมถึงดู `VERCEL_ENV` ไม่ใช่ `NODE_ENV`:** `next build` ตั้ง `NODE_ENV=production`
 * ให้ทุก deployment รวมทั้ง preview การผูกกับ `NODE_ENV` จึงดับทางลัดบน preview ไปด้วย
 * ทั้งที่ preview คือที่ที่ต้องเปิดให้คนรีวิวกดดูโดยไม่มีบัญชี ERP
 *
 * `VERCEL_ENV` แยก `preview` กับ `production` จริง และบนเครื่องตัวเองมีค่าเป็น undefined
 * → ทางลัดใช้ได้ทั้ง dev และ preview แต่ production ปิดตายเสมอไม่ว่าตั้ง env ไว้ยังไง
 */
export const AUTH_DISABLED =
  process.env.AUTH_DISABLED === 'true' && process.env.VERCEL_ENV !== 'production';
