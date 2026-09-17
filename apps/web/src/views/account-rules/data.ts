// ข้อมูลตัวอย่างของ "กติกาผังบัญชี TFC/TVC" (account_behavior_rule)
// พอร์ตจาก mockup/assets/master-data.js (ACCOUNTS/BEH/METHOD) — ดู mockup/W14-account-rules.html
// คีย์ผสม 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) ผูกกับกติกาได้หลายช่วงปี

import type { CostType } from '@beps/shared-types';

export type Behavior = CostType | 'MIXED' | 'UNCLASSIFIED';

export interface AccountRule {
  /** ปีที่เริ่มมีผล */
  from: number;
  /** ปีสุดท้ายที่มีผล — null = ยังใช้อยู่ */
  to: number | null;
  beh: Behavior;
  /** สัดส่วนคงที่ (0-1) — มีความหมายเมื่อ beh === 'MIXED' */
  f: number;
  /** สัดส่วนผันแปร (0-1) — มีความหมายเมื่อ beh === 'MIXED' */
  v: number;
  m: keyof typeof METHOD;
  note: string;
}

export interface AccountBehaviorEntry {
  /** คีย์ผสม 4 ระดับ แสดงผล — ดูรายละเอียดจริงใน W19 (erp_account) */
  key: string;
  name: string;
  /** ตั้งเจาะจงหน่วยงาน — null = กติกากลางทั้งมหาวิทยาลัย */
  org: string | null;
  amount: number;
  rules: AccountRule[];
}

export const BEH: Record<Behavior, { label: string; color: 'info' | 'warning' | 'success' | 'error' }> = {
  TFC: { label: 'คงที่', color: 'info' },
  TVC: { label: 'ผันแปร', color: 'warning' },
  MIXED: { label: 'แบ่งสัดส่วน', color: 'success' },
  UNCLASSIFIED: { label: 'ยังไม่จำแนก', color: 'error' },
};

export const METHOD = {
  DIRECT: 'ผูกโดยตรง',
  ACTUAL_USAGE: 'ตามการใช้จริง',
  STUDENT_HEADCOUNT: 'ตามจำนวนนิสิต',
  PROGRAM_SHARE: 'ตามสัดส่วนหลักสูตร',
} as const;

export const ACCOUNTS: AccountBehaviorEntry[] = [
  {
    key: '1 · 1 · 100 · 10001',
    name: 'เงินเดือนข้าราชการ',
    org: null,
    amount: 612400000,
    rules: [
      { from: 2500, to: null, beh: 'TFC', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: 'เงินเดือนไม่แปรตามจำนวนนิสิต' },
    ],
  },
  {
    key: '1 · 1 · 210 · 21001',
    name: 'ค่าจ้างประจำ',
    org: null,
    amount: 87200000,
    rules: [{ from: 2500, to: null, beh: 'TFC', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: '' }],
  },
  {
    key: '2 · 2 · 410 · 41001',
    name: 'ค่าสาธารณูปโภค',
    org: null,
    amount: 96600000,
    rules: [
      { from: 2500, to: null, beh: 'TVC', f: 0, v: 1, m: 'ACTUAL_USAGE', note: 'มีมิเตอร์แยกอาคาร จึงปันตามการใช้จริง' },
    ],
  },
  {
    key: '2 · 4 · 800 · 80001',
    name: 'เงินอุดหนุนทั่วไป',
    org: null,
    amount: 482300,
    rules: [
      { from: 2500, to: 2568, beh: 'UNCLASSIFIED', f: 0, v: 0, m: 'PROGRAM_SHARE', note: 'ยังไม่เคยตีความ — ติดธงรอตามแก้' },
      { from: 2569, to: 2569, beh: 'TFC', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: 'มติที่ประชุม: ปี 2569 ตีเป็นต้นทุนคงที่' },
      { from: 2570, to: 2570, beh: 'TVC', f: 0, v: 1, m: 'STUDENT_HEADCOUNT', note: 'ปี 2570 เปลี่ยนเป็นผันแปรตามนิสิต' },
      { from: 2571, to: null, beh: 'MIXED', f: 0.5, v: 0.5, m: 'STUDENT_HEADCOUNT', note: 'ปี 2571 เป็นต้นไป แบ่งคนละครึ่ง' },
    ],
  },
  {
    key: '3 · 4 · 800 · 80001',
    name: 'เงินอุดหนุนโครงการวิจัย',
    org: null,
    amount: 41800000,
    rules: [
      {
        from: 2500,
        to: null,
        beh: 'TFC',
        f: 1,
        v: 0,
        m: 'PROGRAM_SHARE',
        note: 'รหัสหมวดเดียวกับด้านบน แต่คนละแผนงาน จึงเป็นคนละประเภท — เหตุผลที่ต้องใช้คีย์ผสม 4 ระดับ',
      },
    ],
  },
  {
    key: '2 · 2 · 500 · 50001',
    name: 'ค่าวัสดุการศึกษา',
    org: null,
    amount: 148900000,
    rules: [
      { from: 2500, to: null, beh: 'MIXED', f: 0.35, v: 0.65, m: 'STUDENT_HEADCOUNT', note: 'ส่วนคงที่คือวัสดุห้องปฏิบัติการพื้นฐาน' },
    ],
  },
  {
    key: '2 · 2 · 500 · 50001',
    name: 'ค่าวัสดุการศึกษา (คณะแพทยศาสตร์)',
    org: 'คณะแพทยศาสตร์',
    amount: 63200000,
    rules: [
      {
        from: 2500,
        to: null,
        beh: 'MIXED',
        f: 0.15,
        v: 0.85,
        m: 'ACTUAL_USAGE',
        note: 'ตั้งเจาะจงคณะ — วัสดุคลินิกแปรตามนิสิตมากกว่าคณะอื่น (กติกาเจาะจงหน่วยงานมาก่อนกติกากลาง)',
      },
    ],
  },
  {
    key: '2 · 2 · 400 · 40010',
    name: 'ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล',
    org: null,
    amount: 1120400,
    rules: [{ from: 2500, to: null, beh: 'UNCLASSIFIED', f: 0, v: 0, m: 'PROGRAM_SHARE', note: 'รอกองคลังยืนยันวิธีตีความ' }],
  },
  {
    key: '2 · 2 · 600 · 60001',
    name: 'ค่าครุภัณฑ์การศึกษา',
    org: null,
    amount: 58700000,
    rules: [{ from: 2500, to: null, beh: 'TFC', f: 1, v: 0, m: 'PROGRAM_SHARE', note: '' }],
  },
  {
    key: '— · — · — · DEP',
    name: 'ค่าเสื่อมราคา (อาคาร / ครุภัณฑ์)',
    org: null,
    amount: 302528496,
    rules: [
      {
        from: 2500,
        to: null,
        beh: 'TFC',
        f: 1,
        v: 0,
        m: 'PROGRAM_SHARE',
        note: 'ไม่มีรหัสผังบัญชี จึงกำหนดผ่านค่าตั้ง depreciation_behavior ใน W15 · ปัจจุบันมีเฉพาะส่วนครุภัณฑ์',
      },
    ],
  },
];

export const ruleAt = (a: AccountBehaviorEntry, y: number): AccountRule | null =>
  a.rules.find(r => y >= r.from && (r.to === null || y <= r.to)) ?? null;
