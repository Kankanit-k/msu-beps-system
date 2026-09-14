/**
 * เติม basePath ให้ path ของไฟล์ใน public/
 *
 * Next.js เติม basePath ให้เองเฉพาะ next/image และ next/link — แท็ก <img src> ธรรมดา
 * ไม่ได้ เทมเพลตจึงต้องเติมเอง และมีหลายจุดที่เขียน '/images/...' ดิบไว้จนโหลดไม่ขึ้น
 * เมื่อ basePath ไม่ใช่ '/' (ของเรา = /beps)
 *
 *   <img src={asset('/images/logos/msu.jpg')} />
 */
export const asset = (path: string): string => {
  const base = (process.env.NEXT_PUBLIC_BASEPATH ?? '').replace(/\/$/, '')

  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
