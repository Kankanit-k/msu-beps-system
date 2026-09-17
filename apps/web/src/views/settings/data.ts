// ข้อมูลตัวอย่างของ "นโยบายการคำนวณ (ค่าตั้งระบบ)" — system_setting_def / system_setting
//
// ขอบเขตของหน้านี้ยึดตาม `packages/calc-engine/src/policy.ts` (CalcPolicy) ซึ่งเป็นชุด
// ค่าตั้งที่มีสูตรคำนวณรองรับจริงแล้ว (ข้อตัดสินใจ B/C ปิดแล้ว ดู types.ts) — mockup ต้นฉบับ
// (W15-settings.html) เสนอค่าตั้งเพิ่มอีกหลายตัว (depreciation_behavior, amount_basis,
// outlier_min_q, ...) ที่ยังไม่มีสูตร/ฟิลด์รองรับใน calc-engine หรือ shared-types ในตอนนี้
// จึงตัดออกจากหน้านี้เพื่อไม่ให้ UI สัญญาสิ่งที่ระบบยังทำไม่ได้จริง — เพิ่มกลับได้ทันทีที่
// calc-engine รองรับ

export type SettingType = 'enum' | 'number';

export interface CalcSetting {
  /** ตรงกับ key ของ CalcPolicy ใน policy.ts (snake_case ตาม system_setting_def) */
  key: string;
  name: string;
  desc: string;
  type: SettingType;
  opts?: string[];
  /** ค่าเริ่มต้นจากนิยามระบบ — ต้องตรงกับ DEFAULT_POLICY ใน policy.ts */
  def: string;
  /** ค่าที่ตั้งทับไว้สำหรับปีที่เลือก — null = ยังไม่ตั้งทับ ใช้ค่าเริ่มต้น */
  cur: string | null;
  /** true = เปลี่ยนค่านี้แล้วต้องสร้างรอบคำนวณใหม่ที่จะมีผล */
  affects: boolean;
  /** คำอธิบายผลกระทบต่อค่าที่เป็นไปได้แต่ละค่า ('*' สำหรับค่าตัวเลข) */
  impact: Record<string, string>;
}

export const SETTINGS: CalcSetting[] = [
  {
    key: 'qstar_primary_method',
    name: 'วิธีคำนวณ Q* ระดับคณะ / มหาวิทยาลัย',
    desc: 'sum_of_programs = รวม Q* รายหลักสูตร (เข้มงวด ชดเชยข้ามหลักสูตรไม่ได้) · pooled = คำนวณจากยอดรวมครั้งเดียว · ระบบเก็บผลทั้งสองวิธีเสมอ ค่านี้เลือกว่าค่าไหนเป็นตัวหลักในรายงาน',
    type: 'enum',
    opts: ['sum_of_programs', 'pooled'],
    def: 'sum_of_programs',
    cur: null,
    affects: true,
    impact: {
      sum_of_programs: 'Q* มหาวิทยาลัย = 42,203 คน · เข้มงวดกว่าเพราะแต่ละหลักสูตรต้องคุ้มต้นทุนคงที่ของตัวเอง',
      pooled: 'Q* มหาวิทยาลัย = 47,644 คน · ยอมให้หลักสูตรที่กำไรอุ้มหลักสูตรที่ขาดทุน — ต่างจากอีกวิธี 5,441 คน',
    },
  },
  {
    key: 'cm_le_zero_policy',
    name: 'เมื่อ CM ≤ 0 (ต้นทุนผันแปร/หัว สูงกว่ารายได้/หัว)',
    desc: 'full_cost_recovery = รายงานเป้าหมายขั้นต่ำ Q* = TC ÷ R (สูตรที่ 7) · not_computable = รายงานว่าไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน',
    type: 'enum',
    opts: ['full_cost_recovery', 'not_computable'],
    def: 'full_cost_recovery',
    cur: null,
    affects: true,
    impact: {
      full_cost_recovery: '18 หลักสูตร จะแสดงเป้าหมายขั้นต่ำเป็นตัวเลข เช่น เคมี (ป.โท) = 24 คน — ผู้ใช้อาจเข้าใจผิดว่าเป็นจุดคุ้มทุนจริง',
      not_computable: '18 หลักสูตร จะแสดงว่า "ไม่มีจุดคุ้มทุน" ตรงไปตรงมา — ต้องแก้ที่ค่าธรรมเนียมหรือต้นทุนผันแปร ไม่ใช่เพิ่มนิสิต',
    },
  },
  {
    key: 'qstar_rounding',
    name: 'การปัดเศษ Q*',
    desc: 'ceil = ปัดขึ้นเสมอ (รับนิสิต 238.4 คนไม่ได้ ต้องรับ 239) · round = ปัดตามหลักคณิตศาสตร์ ตรงกับ prototype เดิม',
    type: 'enum',
    opts: ['ceil', 'round'],
    def: 'ceil',
    cur: null,
    affects: true,
    impact: {
      ceil: 'ปลอดภัยกว่าในเชิงวางแผนรับนิสิต — Q* จะไม่ต่ำกว่าความเป็นจริง (ยืนยันจาก v8: ตรง 268 แถวทุกชั้นข้อมูล)',
      round: 'ตรงกับตัวเลขที่ prototype รุ่น มิ.ย. (v2.1) เคยแสดง แต่อาจต่ำกว่าจุดคุ้มทุนจริงได้ถึง 1 คน ในทุกหลักสูตร',
    },
  },
  {
    key: 'profit_pct_basis',
    name: 'ตัวหารของ "กำไร %"',
    desc: 'TC = กำไร ÷ ต้นทุนรวม (มองเป็น margin เทียบต้นทุน) · TR = กำไร ÷ รายได้รวม (มองเป็น margin เทียบยอดขาย) — v8 ใช้ตัวหารคนละตัวระหว่างหน้าภาพรวมกับ Cross Analysis จนตัวเลขไม่ตรงกัน จึงต้องบังคับให้ชัดเป็นค่าตั้งเดียว',
    type: 'enum',
    opts: ['TC', 'TR'],
    def: 'TC',
    cur: null,
    affects: false,
    impact: {
      TC: 'กำไร % คำนวณจากฐานต้นทุนรวม — ตัวเลขจะสูงกว่าฐาน TR เมื่อกำไรเป็นบวก',
      TR: 'กำไร % คำนวณจากฐานรายได้รวม — ตรงกับวิธีอ่าน margin ทั่วไปทางบัญชี',
    },
  },
];

export const SETTING_LOG = [
  {
    t: 'ปีการศึกษา 2568',
    ic: '🎛',
    h: 'ยังไม่มีมติ — ทุกค่ายังใช้ค่าเริ่มต้นจากนิยามระบบ · รอมติที่ประชุมกำหนด cm_le_zero_policy, qstar_primary_method, qstar_rounding และ profit_pct_basis',
  },
  {
    t: 'ปีการศึกษา 2567',
    ic: '📌',
    h: 'qstar_rounding = round (ตามที่ prototype เดิมคำนวณ) · อนุมัติโดย กองแผนงาน 14 ส.ค. 2568',
  },
];
