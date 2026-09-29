// อัตราค่าธรรมเนียมรายหลักสูตร — ใช้ร่วมกันระหว่างหน้าค่าธรรมเนียม (W8) และหน้าคำนวณจุดคุ้มทุนรายหลักสูตร (W7)
import type { ApprovalStatus } from '@beps/shared-types';

export interface FeeRow {
  fac: string;
  prog: string;
  lvl: string;
  st: string;
  rate: number;
  prev: number | null;
  status: ApprovalStatus;
  by: string | null;
  at: string | null;
}

/**
 * ข้อมูลตัวอย่างอัตราค่าธรรมเนียม — พอร์ตจาก mockup/assets/master-data.js (FEES)
 * ยังไม่มีตารางนี้ใน RAW เพราะ RAW เก็บเฉพาะยอดรวมที่คำนวณแล้ว ไม่ใช่อัตรารายหลักสูตรก่อนอนุมัติ
 */
export const FEES: FeeRow[] = [
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'บัญชีบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 36000,
    prev: 34000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'ธุรกิจระหว่างประเทศ (หลักสูตรนานาชาติ)',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 90000,
    prev: 90000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'ธุรกิจระหว่างประเทศ (หลักสูตรนานาชาติ)',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ต่างชาติ',
    rate: 110000,
    prev: 110000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'บัญชีมหาบัณฑิต',
    lvl: 'ปริญญาโท',
    st: 'ภาคพิเศษ · ไทย',
    rate: 100000,
    prev: 95000,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 30000,
    prev: 30000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาโท',
    st: 'ภาคปกติ · ไทย',
    rate: 93311,
    prev: 88000,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาเอก',
    st: 'ภาคปกติ · ไทย',
    rate: 143311,
    prev: 143311,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'ชีววิทยา',
    lvl: 'ปริญญาโท',
    st: 'ภาคปกติ · ไทย',
    rate: 93311,
    prev: 88000,
    status: 'draft',
    by: null,
    at: null,
  },
  {
    fac: 'คณะแพทยศาสตร์',
    prog: 'แพทยศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 62444,
    prev: 60000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะแพทยศาสตร์',
    prog: 'วิทยาศาสตร์สุขภาพ (หลักสูตรนานาชาติ)',
    lvl: 'ปริญญาเอก',
    st: 'ภาคปกติ · ต่างชาติ',
    rate: 100000,
    prev: 100000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะนิติศาสตร์',
    prog: 'นิติศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 30000,
    prev: 28000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะพยาบาลศาสตร์',
    prog: 'ประกาศนียบัตรผู้ช่วยพยาบาล',
    lvl: 'ประกาศนียบัตร',
    st: 'ภาคปกติ · ไทย',
    rate: 45000,
    prev: 45000,
    status: 'draft',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิศวกรรมศาสตร์',
    prog: 'วิศวกรรมรถไฟความเร็วสูง',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 40000,
    prev: null,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'วิทยาลัยดุริยางคศิลป์',
    prog: 'ดุริยางคศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 38000,
    prev: 38000,
    status: 'rejected',
    by: 'คณะกรรมการการเงิน',
    at: '02 เม.ย. 2568',
  },
];

export const STATUS_META: Record<
  ApprovalStatus,
  { label: string; color: 'success' | 'warning' | 'default' | 'error' }
> = {
  approved: { label: 'อนุมัติแล้ว', color: 'success' },
  pending: { label: 'รออนุมัติ', color: 'warning' },
  draft: { label: 'ร่าง', color: 'default' },
  rejected: { label: 'ไม่อนุมัติ', color: 'error' },
};

/** อัตราทุกประเภทนิสิตของหลักสูตรหนึ่ง — จับคู่ด้วย คณะ + ชื่อหลักสูตร + ระดับ (ชื่อซ้ำกันได้ข้ามระดับ) */
export const feesForProgram = (fac: string, prog: string, lvl: string) =>
  FEES.filter((f) => f.fac === fac && f.prog === prog && f.lvl === lvl);
