'use client';

// Next Imports
import NextLink from 'next/link';

// MUI Imports
import Link from '@mui/material/Link';

// Component Imports
import NoteBar from '@components/NoteBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { fmtMillion } from '@views/breakeven/calc';

/**
 * แถบข้อจำกัดของข้อมูล — ตรงกับ dataCaveat() ของ mockup
 * ทุกหน้าที่แสดงตัวเลขการเงินต้องขึ้นแถบนี้เหมือนกัน จึงรวมไว้ที่เดียว
 *
 * @param profit ส่วนเกิน/ขาดทุนของขอบเขตที่หน้านั้นแสดง ใช้อ้างในประโยคเตือน
 * @param limitations แสดงแถบข้อจำกัดของข้อมูลหรือไม่ — หน้าที่ให้ผู้ใช้กรอกตัวเลขเอง (W6/W7)
 *   ไม่ได้อ่านตัวเลขจากรอบคำนวณตรง ๆ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง เหมือน mockup
 */
const DataCaveatNotes = ({
  profit,
  limitations = true,
}: {
  profit: number;
  limitations?: boolean;
}) => (
  <>
    {limitations && (
      <NoteBar severity="warning">
        <b>ข้อจำกัดของข้อมูลชุดนี้</b> — ค่าเสื่อมราคาอาคารยังไม่ครบ (ฟิลด์ <code>dep</code> รวม{' '}
        {fmtMillion(RAW.UNI.dep)} ลบ. มีเฉพาะครุภัณฑ์) TFC และ TC จึงต่ำกว่าความจริง ตัวเลข
        {profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} {fmtMillion(Math.abs(profit))} ลบ. ที่รายงานอยู่จึง
        <b>{profit >= 0 ? 'มากกว่าความจริง' : 'น้อยกว่าความจริง'}</b> และ Q* ทุกระดับ
        ต่ำกว่าที่ควรเป็น — ดูรายการค้างตรวจที่{' '}
        <Link component={NextLink} href="/admin/exceptions" underline="hover">
          รายการค้างตรวจ
        </Link>
      </NoteBar>
    )}

    {RAW.__sample && (
      <NoteBar severity="error">
        <b>ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่าง ไม่ใช่ของจริง</b> — repo
        นี้ไม่เก็บข้อมูลการเงินจริงของมหาวิทยาลัย (ดูเหตุผลใน <code>.gitignore</code>) จึงโหลด{' '}
        <code>assets/data.sample.js</code> ที่ตัวเลขถูกสุ่มรบกวนแล้ว ความสัมพันธ์ทุกสูตรยังถูกต้อง
        แต่
        <b>ห้ามนำตัวเลขไปอ้างอิง</b> — ถ้ามี <code>assets/data.js</code> ในเครื่อง
        หน้าจะแสดงตัวเลขจริงเองโดยอัตโนมัติ
      </NoteBar>
    )}
  </>
);

export default DataCaveatNotes;
