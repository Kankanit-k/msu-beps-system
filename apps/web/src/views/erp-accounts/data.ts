// "ผังบัญชี 4 ระดับ" (erp_account) — ข้อมูลจริงปีงบ 2568 จากแท็บ Masterแยกหมวด + งบประมาณ68
// โครงหน้าจออ้างอิง mockup/W19-erp-accounts.html
// คีย์จริงคือคีย์ผสม 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) — ดู mockup/MAPPING.md หัวข้อ 2
// การกำหนดว่าบัญชีเป็น TFC/TVC อยู่ที่กติกาผังบัญชี (W14, src/views/account-rules) — แยกกันเพราะ
// บัญชีหนึ่งใบมีกติกาได้หลายช่วงปี

import { ACCOUNT_MASTER, type AccountMasterRow } from '@/data/mockup/accountMaster';

import { accountKey } from '../account-rules/data';

export interface ErpAccount extends AccountMasterRow {
  from: string;
  to: string | null;
  /** คีย์ของกติกาที่ผูกไว้ที่ W14 — null = ยังไม่มีกติกา */
  ruleKey: string | null;
}

/** ผังบัญชีจริง 114 คีย์ที่มีวงเงินในแท็บ งบประมาณ68 — ทุกคีย์มีกติกาในแท็บ Masterแยกหมวด */
export const ERP_ACCOUNTS: ErpAccount[] = ACCOUNT_MASTER.map((a) => ({
  ...a,
  from: '2568',
  to: null,
  ruleKey: accountKey(a),
}));

export const keyOf = accountKey;
export const inYear = (a: ErpAccount, y: number) =>
  y >= Number(a.from) && (a.to === null || y <= Number(a.to));
