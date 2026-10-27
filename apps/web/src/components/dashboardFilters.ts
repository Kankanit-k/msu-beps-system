import type { RevenueMode } from '@beps/calc-engine';

/**
 * ตัวกรองที่ค้างข้ามหน้า Dashboard + ผลการดำเนินงาน (ภาพรวม ม. · ภาพรวมคณะ · รายได้/ต้นทุน/จุดคุ้มทุน)
 * เก็บใน sessionStorage — ลิงก์ในเมนูซ้ายไม่มี query จึงใช้ URL อย่างเดียวพาค่าข้ามหน้าไม่ได้
 * lvl = ชื่อระดับเต็ม ('ปริญญาตรี' …) · '' = ทุกระดับ · facs = คณะที่เลือก (ว่าง = ทุกคณะ)
 */
export type DashFilter = { mode: RevenueMode; lvl: string; facs: string[]; year: string };

const KEY = 'beps.dashFilter';

export const loadDashFilter = (): Partial<DashFilter> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Partial<DashFilter>;
  } catch {
    return {};
  }
};

export const saveDashFilter = (patch: Partial<DashFilter>) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...loadDashFilter(), ...patch }));
  } catch {
    // โหมดส่วนตัว/ปิดที่เก็บข้อมูล — ตัวกรองแค่ไม่ค้างข้ามหน้า
  }
};
