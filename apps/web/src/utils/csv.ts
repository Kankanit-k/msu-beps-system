/**
 * สร้างและดาวน์โหลดไฟล์ CSV ฝั่งเบราว์เซอร์
 *
 * ใส่ BOM (\uFEFF) เสมอ — ไม่งั้น Excel บน Windows อ่านภาษาไทยเป็นตัวขยะ
 * ซึ่งเป็นปลายทางหลักของไฟล์ที่ส่งให้กองแผนงาน
 */

/** ครอบเครื่องหมายคำพูดตามมาตรฐาน RFC 4180 เมื่อมีตัวคั่น/บรรทัดใหม่/คำพูดในค่า */
const escapeCell = (value: string | number | null | undefined): string => {
  const s = value === null || value === undefined ? '' : String(value);

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: (string | number | null | undefined)[][]): string =>
  rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');

/** ตั้งชื่อไฟล์ให้ปลอดภัยกับทุกระบบไฟล์ — ชื่อหลักสูตรไทยมีอักขระที่ใช้ไม่ได้ปนมาได้ */
const safeFileName = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 120);

export const downloadCsv = (fileName: string, rows: (string | number | null | undefined)[][]) => {
  if (typeof window === 'undefined') return;

  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `${safeFileName(fileName)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
