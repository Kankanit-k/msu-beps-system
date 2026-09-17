// รายการหมวดต้นทุนสำหรับ dropdown เลือกอย่างรวดเร็ว — พอร์ตจาก TFC_PRESETS/TVC_PRESETS ใน page-scenario-faculty.js
export const TFC_PRESETS = [
  '100:เงินเดือน',
  '210:ค่าจ้างประจำ',
  '220:ค่าจ้างชั่วคราว',
  '230:ค่าตอบแทนพนักงานราชการ',
  '300:ค่าตอบแทน',
  '400:ค่าใช้สอย',
  '500:ค่าวัสดุ',
  '600:ค่าครุภัณฑ์',
  '800:เงินอุดหนุน',
  '900:รายจ่ายอื่น',
  'ค่าเสื่อมราคา',
];

export const TVC_PRESETS = [
  '300:ค่าตอบแทน',
  '400:ค่าใช้สอย',
  '410:ค่าสาธารณูปโภค',
  '500:ค่าวัสดุ',
  '600:ค่าครุภัณฑ์',
  '800:เงินอุดหนุน',
  '900:รายจ่ายอื่น',
  'ค่าธรรมเนียมศึกษาทั่วไป',
  'ค่าธรรมเนียมรายการหลัก (รายหัวนิสิต)',
  'หักสมทบมหาวิทยาลัย (รายหัวนิสิต)',
];

export interface CostRow {
  id: string;
  label: string;
  amount: number;
}

let seq = 0;
export const newCostRow = (label = '', amount = 0): CostRow => ({ id: `c${++seq}`, label, amount });

export const sumCostRows = (rows: CostRow[]) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
