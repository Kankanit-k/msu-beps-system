/**
 * ทางลัด dev สำหรับข้ามการล็อกอิน — ใช้ร่วมกันทั้ง middleware และ route handler
 *
 * **ทำไมถึงดู `VERCEL_ENV` ไม่ใช่ `NODE_ENV`:** `next build` ตั้ง `NODE_ENV=production`
 * ให้ทุก deployment รวมทั้ง preview การผูกกับ `NODE_ENV` จึงดับทางลัดบน preview ไปด้วย
 * ทั้งที่ preview คือที่ที่ต้องเปิดให้คนรีวิวกดดูโดยไม่มีบัญชี ERP
 *
 * เปิดให้ใช้บน production ชั่วคราว (ช่วง demo) — ควบคุมด้วย env `AUTH_DISABLED` อย่างเดียว
 * จะเปิด login กลับ: ตั้ง `AUTH_DISABLED=false` + `NEXT_PUBLIC_AUTH_DISABLED=false` แล้ว redeploy
 */
export const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';
