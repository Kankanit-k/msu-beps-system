/**
 * นโยบายการคำนวณ — สิ่งที่ **ห้ามฝังในโค้ด**
 *
 * ทุกค่าในนี้ตรงกับ key ใน `system_setting_def` (db/01_schema.sql) แบบหนึ่งต่อหนึ่ง
 * เหตุผลที่ต้องส่งเข้ามาเป็นพารามิเตอร์แทนที่จะ hard-code (ข้อบกพร่อง #9):
 *
 * 1. กองแผนงานต้องเปลี่ยนได้เองรายปีโดยไม่ต้องแก้โค้ด
 * 2. ตัวเลขของปีเก่าต้องไม่เปลี่ยนตามเมื่อนโยบายปีใหม่เปลี่ยน
 * 3. prototype v8 พิสูจน์แล้วว่าถ้าฝังในโค้ด แต่ละหน้าจอจะใช้กติกาต่างกัน —
 *    หลักสูตรเคมี (ป.โท) ได้ Q* สามค่าในระบบเดียว: "ไม่มีจุดคุ้มทุน" / 24 / 23
 *    และกำไร % ก็ใช้ตัวหารคนละตัวระหว่างหน้าภาพรวมกับ Cross Analysis
 *
 * ชั้นแอปต้องอ่านค่าจาก `get_setting(key, period_id, org_unit_id)` แล้วประกอบเป็น
 * `CalcPolicy` หนึ่งชุดต่อหนึ่งงวด แล้วส่งให้ทุกฟังก์ชันในแพ็กเกจนี้ชุดเดียวกัน
 */

/** `cm_le_zero_policy` — จะทำอย่างไรเมื่อ AVC สูงกว่าหรือเท่ากับ R */
export type CmLeZeroPolicy = 'full_cost_recovery' | 'not_computable';

/** `qstar_rounding` — วิธีปัดเศษ Q* */
export type QStarRounding = 'ceil' | 'round';

/** `profit_pct_basis` — ตัวหารของ "กำไร %" */
export type ProfitPctBasis = 'TC' | 'TR';

/** `qstar_primary_method` — Q* ระดับที่สูงกว่าหลักสูตร ค่าไหนเป็นตัวหลักในรายงาน */
export type QStarPrimaryMethod = 'sum_of_programs' | 'pooled';

export interface CalcPolicy {
  cmLeZeroPolicy: CmLeZeroPolicy;
  qStarRounding: QStarRounding;
  profitPctBasis: ProfitPctBasis;
  qStarPrimaryMethod: QStarPrimaryMethod;
}

/**
 * ค่าเริ่มต้น — ต้องตรงกับคอลัมน์ `default_value` ใน `system_setting_def` เป๊ะ
 * ใช้เมื่อยังไม่มีการตั้งค่าทับสำหรับงวดนั้น (เหมือนที่ `get_setting()` fallback)
 *
 * `qStarRounding: 'ceil'` ยืนยันจาก v8 แล้ว — ตรวจ 268 แถวทุกชั้น (UNI + คณะ + ระดับ +
 * หลักสูตร) พบว่าตรงกับ `ceil` ทั้งหมด และมี 144 แถวที่ตรงกับ `ceil` เท่านั้น
 * ส่วน prototype รุ่น มิ.ย. (v2.1) ใช้ `round` — ตั้งค่าให้ตรงรุ่นก่อนเทียบตัวเลข
 */
export const DEFAULT_POLICY: CalcPolicy = {
  cmLeZeroPolicy: 'full_cost_recovery',
  qStarRounding: 'ceil',
  profitPctBasis: 'TC',
  qStarPrimaryMethod: 'sum_of_programs',
};

/**
 * ปัดเศษ Q* ตามนโยบาย
 *
 * `ceil` ลบ epsilon ออกก่อนเสมอ เพราะ Q* คำนวณจากเลขทศนิยมลอยตัว ค่าที่ควรลงตัวพอดี
 * อาจกลายเป็น 24.000000000000004 แล้วถูกปัดขึ้นเป็น 25 ผิดไปหนึ่งคน
 * (PostgreSQL ใช้ `numeric` จึงไม่เจอปัญหานี้ — ฝั่ง JS ต้องกันเอง เหมือนที่ v8 ทำ)
 */
export function roundQStar(value: number, rounding: QStarRounding): number {
  const EPSILON = 1e-9;
  return rounding === 'round' ? Math.round(value) : Math.ceil(value - EPSILON);
}
