// ข้อมูลตัวอย่างของ "ผังบัญชี 4 ระดับ" (erp_account) — พอร์ตจาก mockup/W19-erp-accounts.html
// คีย์จริงคือคีย์ผสม 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) — ดู mockup/MAPPING.md หัวข้อ 2
// การกำหนดว่าบัญชีเป็น TFC/TVC อยู่ที่กติกาผังบัญชี (W14, src/views/account-rules) — แยกกันเพราะ
// บัญชีหนึ่งใบมีกติกาได้หลายช่วงปี

export interface ErpAccount {
  plan: string;
  bud: string;
  exp: string;
  sub: string;
  name: string;
  from: string;
  to: string | null;
  amount: number;
  /** คีย์ของกติกาที่ผูกไว้ที่ W14 — null = ยังไม่มีกติกา */
  ruleKey: string | null;
  note?: string;
}

export const ERP_ACCOUNTS: ErpAccount[] = [
  { plan: '1', bud: '1', exp: '100', sub: '10001', name: 'เงินเดือนข้าราชการ', from: '2500', to: null, amount: 612400000, ruleKey: '1 · 1 · 100 · 10001' },
  { plan: '1', bud: '1', exp: '210', sub: '21001', name: 'ค่าจ้างประจำ', from: '2500', to: null, amount: 87200000, ruleKey: '1 · 1 · 210 · 21001' },
  { plan: '1', bud: '1', exp: '220', sub: '22001', name: 'ค่าจ้างชั่วคราว', from: '2500', to: null, amount: 41300000, ruleKey: null },
  { plan: '2', bud: '2', exp: '410', sub: '41001', name: 'ค่าสาธารณูปโภค', from: '2500', to: null, amount: 96600000, ruleKey: '2 · 2 · 410 · 41001' },
  { plan: '2', bud: '2', exp: '500', sub: '50001', name: 'ค่าวัสดุการศึกษา', from: '2500', to: null, amount: 212100000, ruleKey: '2 · 2 · 500 · 50001' },
  { plan: '2', bud: '2', exp: '600', sub: '60001', name: 'ค่าครุภัณฑ์การศึกษา', from: '2500', to: null, amount: 58700000, ruleKey: '2 · 2 · 600 · 60001' },
  { plan: '2', bud: '2', exp: '400', sub: '40010', name: 'ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล', from: '2500', to: null, amount: 1120400, ruleKey: '2 · 2 · 400 · 40010' },
  { plan: '2', bud: '4', exp: '800', sub: '80001', name: 'เงินอุดหนุนทั่วไป', from: '2500', to: null, amount: 482300, ruleKey: '2 · 4 · 800 · 80001' },
  {
    plan: '3', bud: '4', exp: '800', sub: '80001', name: 'เงินอุดหนุนโครงการวิจัย', from: '2500', to: null, amount: 41800000, ruleKey: '3 · 4 · 800 · 80001',
    note: 'รหัสหมวดเดียวกับแถวบน แต่คนละแผนงาน จึงเป็นคนละบัญชี',
  },
  {
    plan: '2', bud: '2', exp: '400', sub: '40022', name: 'ค่าเช่าเครื่องมือแพทย์', from: '2569', to: null, amount: 0, ruleKey: null,
    note: 'บัญชีใหม่ปีงบ 2569 — ยังไม่มีกติกา TFC/TVC',
  },
  {
    plan: '2', bud: '2', exp: '300', sub: '30004', name: 'ค่าตอบแทนวิทยากรภายนอก (ยกเลิก)', from: '2500', to: '2567', amount: 0, ruleKey: null,
    note: 'ปิดใช้ตั้งแต่ปีงบ 2568 — เก็บไว้เพื่อให้รายงานปีเก่ายังอ่านได้',
  },
];

export const keyOf = (a: ErpAccount) => `${a.plan} · ${a.bud} · ${a.exp} · ${a.sub}`;
export const inYear = (a: ErpAccount, y: number) => y >= Number(a.from) && (a.to === null || y <= Number(a.to));
