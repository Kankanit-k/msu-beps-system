// นิยามคอลัมน์ของ Heatmap + ฟังก์ชันไล่สี — พอร์ตจาก HM[] และ hmColor() ใน page-cross.js

import type { FacultyCrossRow } from './crossData';

export type MetricGoodDirection = 'high' | 'low';

export interface HeatmapMetric {
  key: keyof FacultyCrossRow;
  label: string;
  unit: string;
  good: MetricGoodDirection;
  format: (v: number) => string;
}

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

export const HEATMAP_METRICS: HeatmapMetric[] = [
  { key: 'util', label: 'Utilization', unit: 'Q/Q* %', good: 'high', format: (v) => (v > 0 ? `${v}%` : '—') },
  { key: 'profitPct', label: 'กำไร %', unit: 'Profit', good: 'high', format: (v) => `${v >= 0 ? '+' : ''}${v}%` },
  { key: 'progOkRatio', label: 'หลักสูตรคุ้ม', unit: '%', good: 'high', format: (v) => `${v}%` },
  { key: 'CM', label: 'CM/หัว', unit: 'บาท', good: 'high', format: fmtB },
  { key: 'R', label: 'R/หัว', unit: 'บาท', good: 'high', format: fmtB },
  { key: 'AVC', label: 'AVC/หัว', unit: 'บาท', good: 'low', format: fmtB },
  { key: 'avcRRatio', label: 'AVC/R', unit: '%', good: 'low', format: (v) => (v >= 999 ? '—' : `${v}%`) },
  { key: 'tfcTcRatio', label: 'TFC/TC', unit: '%', good: 'low', format: (v) => `${v}%` },
  {
    key: 'profitM',
    label: 'ส่วนเกิน',
    unit: 'ลบ.',
    good: 'high',
    format: (v) =>
      `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
  },
  { key: 'Q', label: 'Q จริง', unit: 'คน', good: 'high', format: fmtN },
];

/** ไล่สีแดง→ทอง→เขียว ตามตำแหน่งสัมพัทธ์ในคอลัมน์เดียวกัน (min-max ต่อคอลัมน์ ไม่ใช่ทั้งตาราง) */
export function heatCellColor(val: number, good: MetricGoodDirection, allInColumn: number[]) {
  const sorted = [...allInColumn].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  if (max === min) return { bg: '#f1f5f9', fg: '#6f6880' };

  const norm = (val - min) / (max - min);
  const score = good === 'high' ? norm : 1 - norm;

  let r: number, g: number, b: number;

  if (score < 0.25) {
    const t = score / 0.25;
    r = 252;
    g = Math.round(205 + 15 * t);
    b = Math.round(210 - 24 * t);
  } else if (score < 0.5) {
    const t = (score - 0.25) / 0.25;
    r = 255;
    g = Math.round(220 + 23 * t);
    b = Math.round(186 + 5 * t);
  } else if (score < 0.75) {
    const t = (score - 0.5) / 0.25;
    r = Math.round(255 - 46 * t);
    g = Math.round(243 - 7 * t);
    b = Math.round(191 + 22 * t);
  } else {
    const t = (score - 0.75) / 0.25;
    r = Math.round(209 - 21 * t);
    g = Math.round(236 - 4 * t);
    b = Math.round(213 + 6 * t);
  }

  return { bg: `rgb(${r},${g},${b})`, fg: '#334155' };
}
