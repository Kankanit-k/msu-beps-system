// "กติกาผังบัญชี TFC/TVC" (account_behavior_rule) — ข้อมูลจริงจากแท็บ Masterแยกหมวด ปีงบ 2568
// โครงหน้าจออ้างอิง mockup/W14-account-rules.html
// คีย์ผสม 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) ผูกกับกติกาได้หลายช่วงปี

import type { CostType } from '@beps/shared-types';

import { RAW } from '@/data/mockup';
import { ACCOUNT_MASTER, type AccountMasterRow } from '@/data/mockup/accountMaster';

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

export const BEH: Record<
  Behavior,
  { label: string; color: 'info' | 'warning' | 'success' | 'error' }
> = {
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

/** คีย์ผสมสำหรับแสดงผล — ใช้ร่วมกับหน้าผังบัญชี (W19) */
export const accountKey = (a: Pick<AccountMasterRow, 'plan' | 'bud' | 'exp' | 'sub'>) =>
  `${a.plan} · ${a.bud} · ${a.exp} · ${a.sub}`;

const DEP_NOTE = 'ใช้ยอดค่าเสื่อมราคาประจำปี';

const noteOf = (a: AccountMasterRow) =>
  a.beh === 'UNCLASSIFIED'
    ? 'ไฟล์ต้นทางเว้นว่าง ไม่ได้ระบุประเภทต้นทุน — ติดธงรอตามแก้'
    : a.remark === DEP_NOTE
      ? 'งบลงทุน — หมายเหตุในไฟล์: ใช้ยอดค่าเสื่อมราคาประจำปีแทนวงเงินงบลงทุน'
      : (a.remark ?? '');

/**
 * กติกาจริงปีงบประมาณ 2568 จากแท็บ "Masterแยกหมวด" (ผ่าน ACCOUNT_MASTER)
 * ไฟล์ต้นทางมีกติกาปีเดียว ทุกบัญชีจึงมีช่วงปีเดียว · "คงที่/ผันแปร 50/50" = แบ่งสัดส่วน 0.5 : 0.5
 * เกณฑ์ปันส่วนในไฟล์เป็น "คิดตามจำนวนนิสิต" ทุกแถว
 */
export const ACCOUNTS: AccountBehaviorEntry[] = [
  ...ACCOUNT_MASTER.map((a) => ({
    key: accountKey(a),
    name: a.name,
    org: null,
    amount: a.amount,
    rules: [
      {
        from: 2568,
        to: null,
        beh: a.beh,
        f: a.beh === 'TFC' ? 1 : a.beh === 'MIXED' ? 0.5 : 0,
        v: a.beh === 'TVC' ? 1 : a.beh === 'MIXED' ? 0.5 : 0,
        m: 'STUDENT_HEADCOUNT' as const,
        note: noteOf(a),
      },
    ],
  })),
  {
    key: '— · — · — · DEP',
    name: 'ค่าเสื่อมราคา (อาคาร / ครุภัณฑ์)',
    org: null,
    amount: RAW.UNI.dep,
    rules: [
      {
        from: 2568,
        to: null,
        beh: 'TFC',
        f: 1,
        v: 0,
        m: 'STUDENT_HEADCOUNT',
        note: 'ไม่มีรหัสผังบัญชี — มาจากแท็บค่าเสื่อม ปันลงหลักสูตรตามจำนวนนิสิตของคณะ · กำหนดประเภทผ่านค่าตั้งในหน้านโยบายการคำนวณ',
      },
    ],
  },
];

export const ruleAt = (a: AccountBehaviorEntry, y: number): AccountRule | null =>
  a.rules.find((r) => y >= r.from && (r.to === null || y <= r.to)) ?? null;
