/**
 * รายการหมวดรายจ่ายสำหรับหน้าตั้งค่า (มติ "ตั้งค่าต้นทุน.pdf" ขั้นที่ 1 · CC-6)
 *
 * - กติกาตั้งต้นมาจาก Excel แท็บ Masterแยกหมวด (ผ่าน ACCOUNTS)
 * - ระบุคณะ → แสดงเฉพาะรายการที่คณะมีในงบ Oracle PPLN_BUDGET ปี 2568 (ORACLE_FACULTY_USAGE) + ค่าเสื่อมราคา
 *   ไม่มีข้อมูลของคณะนั้น → แสดงทุกรายการ · ทุกปีใช้ชุดปี 2568 จนกว่าจะได้ข้อมูลปีอื่น
 * ⚠️ ยังไม่มี API ระบบบัญชีจริง — เมื่อได้ API เปลี่ยนเฉพาะ `fetchExpenseAccounts`
 */
import { ACCOUNT_MASTER } from '@/data/mockup/accountMaster';
import { ORACLE_FACULTY_USAGE } from '@/data/mockup/oracleExpenseUsage';

import { ACCOUNTS, ruleAt, type AccountRule } from './data';

export interface ExpenseAccount {
  /** คีย์ผสม 4 ระดับ — ใช้ผูกกติกา */
  key: string;
  name: string;
  /** หมวดรายจ่าย เช่น "300:ค่าตอบแทน" — ใช้จัดกลุ่มในตาราง */
  group: string;
  /** หมวดรายจ่าย|หมวดย่อย (ไม่แยกแผนงาน) — รายการเดียวกันต่างแผนงานมีค่าเท่ากัน */
  sub: string;
  /** วงเงินอนุมัติทั้งมหาวิทยาลัย (บาท) — ใช้อ้างอิงขนาด ไม่ใช่ยอดของคณะ */
  amount: number;
  /** กติกาตาม Excel ของปีนั้น */
  sheetRule: AccountRule;
}

export interface ExpenseAccountList {
  accounts: ExpenseAccount[];
  /** true = กรองตามรายการที่คณะใช้ใน Oracle แล้ว */
  filtered: boolean;
}

const META = new Map(
  ACCOUNT_MASTER.map((m) => [
    `${m.plan} · ${m.bud} · ${m.exp} · ${m.sub}`,
    { group: `${m.exp}:${m.expName}`, sub: `${m.exp}|${m.sub}` },
  ]),
);

export const fetchExpenseAccounts = async (
  year: number,
  faculty?: string,
): Promise<ExpenseAccountList> => {
  const used = faculty ? ORACLE_FACULTY_USAGE[faculty] : undefined;
  const keep = used && new Set(used);

  const accounts = ACCOUNTS.flatMap((a) => {
    const r = ruleAt(a, year);
    const meta = META.get(a.key);

    // ค่าเสื่อมราคาไม่มีรหัสใน Oracle → แสดงเสมอ
    if (!r || (keep && meta && !keep.has(a.key))) return [];

    return [
      {
        key: a.key,
        name: a.name,
        group: meta?.group ?? 'ค่าเสื่อมราคา',
        sub: meta?.sub ?? a.key,
        amount: a.amount,
        sheetRule: r,
      },
    ];
  });

  return { accounts, filtered: !!keep };
};
