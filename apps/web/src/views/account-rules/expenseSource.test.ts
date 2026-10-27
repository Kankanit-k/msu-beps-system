import { describe, expect, it } from 'vitest';

import { ORACLE_FACULTY_USAGE } from '@/data/mockup/oracleExpenseUsage';

import { ACCOUNTS } from './data';
import { fetchExpenseAccounts } from './expenseSource';

describe('fetchExpenseAccounts (CC-6 · กรองตามงบ Oracle 2568)', () => {
  it('ระบุคณะ → เฉพาะรายการที่คณะใช้ + ค่าเสื่อมราคา', async () => {
    const fac = 'คณะวิทยาการสารสนเทศ';
    const r = await fetchExpenseAccounts(2568, fac);

    expect(r.filtered).toBe(true);
    expect(r.accounts).toHaveLength(ORACLE_FACULTY_USAGE[fac]!.length + 1);
    expect(r.accounts.some((a) => a.key.endsWith('DEP'))).toBe(true);
  });

  it('ไม่มีข้อมูล Oracle ของคณะ → ทุกรายการ', async () => {
    const r = await fetchExpenseAccounts(2568, 'คณะที่ไม่มีอยู่');

    expect(r.filtered).toBe(false);
    expect(r.accounts).toHaveLength(ACCOUNTS.length);
  });

  it('รายการเดียวกันต่างแผนงานได้ sub เดียวกัน', async () => {
    const { accounts } = await fetchExpenseAccounts(2568);

    expect(accounts.filter((a) => a.sub === '800|80001')).toHaveLength(4);
  });
});
