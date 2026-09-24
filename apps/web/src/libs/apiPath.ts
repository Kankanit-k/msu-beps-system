/**
 * สร้าง URL ของ route handler สำหรับเรียกจากฝั่ง browser
 *
 * **ทำไมต้องมี:** `basePath` ใน next.config.ts เขียน URL ให้เฉพาะ `<Link>` กับ router
 * ของ Next เท่านั้น — `fetch`/`sendBeacon` ไม่ถูกเขียนให้ ยิง `/api/...` ตรงๆ บน
 * deployment ที่ `BASEPATH=/beps` จึงได้หน้า 404 กลับมาเป็น HTML แล้ว `res.json()`
 * พังด้วย "Unexpected token '<'" แทนที่จะเห็น error จริง
 *
 * ปิดท้ายด้วย `/` ให้ตรงกับ `trailingSlash: true` ไม่งั้นโดน 308 ก่อนหนึ่งรอบ
 */
const basePath = (process.env.NEXT_PUBLIC_BASEPATH ?? '')
  .replace(/^https?:\/\/[^/]+/, '')
  .replace(/\/$/, '');

/** `apiUrl('/api/log')` → `/beps/api/log/` (หรือ `/api/log/` ตอน dev) */
export const apiUrl = (path: string) => `${basePath}${path.replace(/\/$/, '')}/`;
