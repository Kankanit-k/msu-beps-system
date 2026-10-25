/**
 * บทวิเคราะห์อัตโนมัติ (กฎตายตัว ไม่ใช้ AI) — ทุกประโยคคำนวณจากตัวเลขในหน้าจึงตรวจย้อนได้
 * แต่ละข้อผูกหลักสูตร (ถ้ามี) เพื่อกดแล้วกรองตารางไปที่หลักสูตรนั้น
 */
import type { RevenueMode } from '@beps/calc-engine';

import { fmtMillion } from '@views/breakeven/calc';

import type { DDRow } from './DeepDiveContext';
import {
  catLabel,
  changePct,
  COST_YEARS,
  CRISIS_STREAK,
  cumulativeLoss,
  DD_LAST,
  DD_YEARS,
  DRIVER_SHARE,
  lastValue,
  median,
  PER_HEAD_ALERT,
  topCategory,
} from './deepDiveData';

export type InsightTone = 'error' | 'warning' | 'info' | 'success';

/** page = หน้าที่ควรเปิดเมื่อกด */
export interface Insight {
  tone: InsightTone;
  text: string;
  row?: DDRow;
  page: 'breakeven' | 'revenue' | 'cost';
}

/** ต้นทุนต่อหัวปีล่าสุดที่มีข้อมูล */
export const costPerHead = (x: DDRow) => {
  const tc = lastValue(x.tc);

  return tc !== null && x.p.Q > 0 ? tc / x.p.Q : null;
};

/** หลักสูตรเล็กกว่านี้ไม่เทียบต้นทุนต่อหัว (2–3 คน หารแล้วสูงเสมอ) */
export const PER_HEAD_MIN_Q = 10;

/** ค่ากลางต้นทุนต่อหัวของหลักสูตรในขอบเขตเดียวกัน (ไม่นับหลักสูตรเล็ก) */
export const perHeadMedian = (rows: DDRow[]) =>
  median(
    rows
      .filter((x) => x.p.Q >= PER_HEAD_MIN_Q)
      .map(costPerHead)
      .filter((v): v is number => v !== null && v > 0),
  );

/** ต้นทุนต่อหัวเทียบค่ากลางของหลักสูตรในขอบเขตเดียวกัน (คณะ/ระดับที่เลือก) · หลักสูตรเล็ก = null */
export const perHeadRatio = (rows: DDRow[]) => {
  const med = perHeadMedian(rows);

  return (x: DDRow) => {
    const v = x.p.Q >= PER_HEAD_MIN_Q ? costPerHead(x) : null;

    return v !== null && med > 0 ? v / med : null;
  };
};

const TOP = 3;

export const buildInsights = (rows: DDRow[], mode: RevenueMode): Insight[] => {
  const out: Insight[] = [];

  if (!rows.length) return out;

  // 1. หลักสูตรวิกฤต / ข้อมูลยังไม่พอ
  const crisis = rows.filter((x) => x.status === 'crisis');

  if (crisis.length) {
    const loss = crisis.reduce((a, x) => a + cumulativeLoss(x.profit[mode]), 0);

    out.push({
      tone: 'error',
      page: 'breakeven',
      text: `หลักสูตรวิกฤต ${crisis.length} หลักสูตร (ขาดทุนติดต่อกัน ≥ ${CRISIS_STREAK} ปี) ขาดทุนสะสมรวม ${fmtMillion(loss)} ลบ.`,
    });
  } else if (COST_YEARS.length < CRISIS_STREAK) {
    out.push({
      tone: 'info',
      page: 'breakeven',
      text: `ข้อมูลต้นทุนมีเฉพาะปีงบ ${COST_YEARS.join(', ')} — ยังระบุหลักสูตรที่ขาดทุนต่อเนื่อง ${CRISIS_STREAK} ปีไม่ได้ จนกว่าจะได้งบประมาณย้อนหลังจากกองแผน`,
    });
  }

  // 2. ขาดทุนปีล่าสุด — หลักสูตรที่ขาดทุนมากสุด
  const losing = rows
    .filter((x) => (lastValue(x.profit[mode]) ?? 0) < 0)
    .sort((a, b) => lastValue(a.profit[mode])! - lastValue(b.profit[mode])!);

  if (losing.length) {
    const sum = losing.reduce((a, x) => a + lastValue(x.profit[mode])!, 0);

    out.push({
      tone: 'warning',
      page: 'breakeven',
      row: losing[0],
      text: `ปีงบ ${DD_LAST} ไม่คุ้มทุน ${losing.length} จาก ${rows.length} หลักสูตร รวมขาดทุน ${fmtMillion(-sum)} ลบ. — มากสุดคือ ${losing[0]!.p.prog} (${fmtMillion(-lastValue(losing[0]!.profit[mode])!)} ลบ.)`,
    });
  }

  // 3. ไม่มีค่าเทอมปีล่าสุด (อาจปิดรับ/งดรับ) — แยกจากกลุ่มที่ลดลง
  const iLast = DD_YEARS.length - 1;
  const stopped = rows.filter((x) => !x.tuition[iLast] && x.tuition.some((v) => v));

  if (stopped.length)
    out.push({
      tone: 'warning',
      page: 'revenue',
      row: stopped.length === 1 ? stopped[0] : undefined,
      text: `${stopped.length} หลักสูตรไม่มีค่าเทอมเรียกเก็บในปี ${DD_LAST} (เคยมีในปีก่อน — อาจงดรับหรือปิดหลักสูตร): ${stopped
        .slice(0, 3)
        .map((x) => x.p.prog)
        .join(', ')}${stopped.length > 3 ? ' …' : ''}`,
    });

  // 4. ค่าเทอมลดลงแรง 5 ปี (หลักสูตรที่ยังเก็บค่าเทอมอยู่)
  rows
    .filter((x) => x.tuition[iLast])
    .map((x) => ({ x, d: changePct(x.tuition), n: changePct(x.students) }))
    .filter((r) => r.d !== null && r.d <= -30)
    .sort((a, b) => a.d! - b.d!)
    .slice(0, TOP)
    .forEach(({ x, d, n }) =>
      out.push({
        tone: 'warning',
        page: 'revenue',
        row: x,
        text: `${x.p.prog}: ค่าเทอมเรียกเก็บลดลง ${Math.abs(d!).toFixed(0)}% ในช่วง ${DD_YEARS[0]}–${DD_LAST}${n !== null ? ` · นิสิต${n < 0 ? 'ลดลง' : 'เพิ่มขึ้น'} ${Math.abs(n).toFixed(0)}%` : ''}`,
      }),
    );

  // 5. ต้นทุนกองที่หมวดเดียว (เฉพาะหลักสูตรที่ขาดทุน)
  losing
    .map((x) => ({ x, t: topCategory(x) }))
    .filter((r) => r.t && r.t.share >= DRIVER_SHARE)
    .slice(0, TOP)
    .forEach(({ x, t }) =>
      out.push({
        tone: 'warning',
        page: 'cost',
        row: x,
        text: `${x.p.prog}: ต้นทุนกองอยู่ที่ ${catLabel(t!.cat)} ${(t!.share * 100).toFixed(0)}% ของต้นทุนทั้งหมด และยังขาดทุน`,
      }),
    );

  // 6. ต้นทุนต่อหัวสูงผิดปกติ
  const ratio = perHeadRatio(rows);

  rows
    .map((x) => ({ x, r: ratio(x) }))
    .filter((v) => v.r !== null && v.r >= PER_HEAD_ALERT)
    .sort((a, b) => b.r! - a.r!)
    .slice(0, TOP)
    .forEach(({ x, r }) =>
      out.push({
        tone: 'info',
        page: 'cost',
        row: x,
        text: `${x.p.prog}: ต้นทุนต่อหัวสูงกว่าค่ากลางของกลุ่ม ${r!.toFixed(1)} เท่า (นิสิต ${x.p.Q.toLocaleString('th-TH')} คน)`,
      }),
    );

  if (!out.some((i) => i.tone !== 'info'))
    out.push({
      tone: 'success',
      page: 'breakeven',
      text: 'ไม่พบหลักสูตรที่ขาดทุนหรือรายได้ลดลงผิดปกติในขอบเขตที่เลือก',
    });

  return out;
};
