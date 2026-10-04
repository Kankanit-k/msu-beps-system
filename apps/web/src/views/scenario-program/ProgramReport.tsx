// รายงานสำหรับพิมพ์/บันทึกเป็น PDF ผ่านกล่องโต้ตอบพิมพ์ของเบราว์เซอร์ (window.print())
// ฉบับย่อ 2 หน้า — แสดงเฉพาะฐานรายได้ที่ใช้คำนวณ (entry.mode) จากภาพที่บันทึกไว้ ไม่คำนวณซ้ำจากฟอร์มปัจจุบัน
import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { REVENUE_MODE_LABEL } from '@views/breakeven/calc';

import type { ProgramHistoryEntry } from './types';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtD = (v: number) => {
  const x = Math.round(v);

  return x === 0 ? '0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toLocaleString('th-TH')}`;
};

const NAVY = '#36268c';
const PURPLE = '#6d4cff';
const GREEN = '#0f8a5f';
const RED = '#c2383c';
const AMBER = '#b7791f';
const BORDER = '#e2e8f2';
const SOFT = '#f8fafd';

/** กระดาษ A4 หนึ่งแผ่น (794×1123 px ที่ 96 dpi) — ดาวน์โหลด PDF จับภาพทีละแผ่นจาก data-report-page */
const Page = ({ children }: { children: ReactNode }) => (
  <Box
    data-report-page
    sx={{
      width: 794,
      minHeight: 1123,
      px: 6,
      py: 5,
      boxSizing: 'border-box',
      bgcolor: '#fff',
      borderRadius: 1,
      boxShadow: '0 4px 20px rgba(0,0,0,.15)',
      '@media print': {
        width: 'auto',
        minHeight: 0,
        p: 0,
        boxShadow: 'none',
        borderRadius: 0,
        breakAfter: 'page',
        '&:last-of-type': { breakAfter: 'auto' },
      },
    }}
  >
    {children}
  </Box>
);

const Section = ({ no, title, children }: { no: number; title: string; children: ReactNode }) => (
  <Box sx={{ mb: 3, breakInside: 'avoid' }}>
    <Typography
      sx={{
        fontWeight: 800,
        color: PURPLE,
        fontSize: 11,
        borderLeft: `3px solid ${PURPLE}`,
        pl: 1,
        mb: 1.25,
        breakAfter: 'avoid',
      }}
    >
      {no}. {title}
    </Typography>
    {children}
  </Box>
);

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box sx={{ bgcolor: SOFT, border: `1px solid ${BORDER}`, borderRadius: 1.5, px: 1.5, py: 1 }}>
    <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{value}</Typography>
  </Box>
);

const Kpi = ({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) => (
  <Box
    sx={{
      border: `1px solid ${BORDER}`,
      borderRadius: 1.5,
      py: 1,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontWeight: 800, fontSize: 17, color }}>{value}</Typography>
    <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{unit}</Typography>
  </Box>
);

const Formula = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      bgcolor: '#eee8ff',
      border: '1px solid #c9bcff',
      borderRadius: 1.5,
      px: 1.5,
      py: 1.25,
      mb: 1,
      fontSize: 12,
      color: NAVY,
    }}
  >
    {children}
  </Box>
);

const Pill = ({ children, bg, color }: { children: ReactNode; bg: string; color: string }) => (
  <Box
    component="span"
    sx={{ bgcolor: bg, color, borderRadius: 5, px: 1, py: 0.25, fontSize: 9, fontWeight: 700 }}
  >
    {children}
  </Box>
);

/** หัวกระดาษ — หน้าแรกมีปี/วันที่/ป้าย หน้าถัดไปแสดงเฉพาะชื่อหน่วยงาน */
const Letterhead = ({ right }: { right?: ReactNode }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      borderBottom: `3px solid ${NAVY}`,
      pb: 1.5,
      mb: 2.5,
    }}
  >
    <Box
      component="img"
      src={`${process.env.NEXT_PUBLIC_BASEPATH ?? ''}/images/logos/msu.jpg`}
      alt=""
      sx={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 1 }}
    />
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>
        มหาวิทยาลัยมหาสารคาม | Mahasarakham University
      </Typography>
      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>
        รายงานการวิเคราะห์จุดคุ้มทุน (Break-Even Analysis Report) · กองแผนงาน
      </Typography>
    </Box>
    {right}
  </Box>
);

/** กราฟ TR/TC/TFC แบบ SVG ล้วน — ApexCharts วัดขนาดไม่ได้ในกล่องที่ซ่อนไว้จนสั่งพิมพ์ */
const PrintChart = ({
  q,
  tfc,
  avc,
  r,
  qStar,
}: {
  q: number;
  tfc: number;
  avc: number;
  r: number;
  qStar: number | null;
}) => {
  const W = 640;
  const H = 230;
  const pad = { l: 50, r: 50, t: 36, b: 36 };
  const hasStar = qStar !== null && qStar > 0;
  const maxQ = Math.min(Math.max(q * 1.3, hasStar ? qStar * 1.6 : 0, 30), 2e5);
  const maxY = Math.max(r * maxQ, tfc + avc * maxQ, tfc) || 1;
  const x = (n: number) => pad.l + (n / maxQ) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / maxY) * (H - pad.t - pad.b);
  const seg = (f: (n: number) => number, stroke: string, dash?: string) => (
    <line
      x1={x(0)}
      y1={y(f(0))}
      x2={x(maxQ)}
      y2={y(f(maxQ))}
      stroke={stroke}
      strokeWidth={2.5}
      strokeDasharray={dash}
    />
  );
  const label = {
    fontSize: 9,
    fontWeight: 700,
    stroke: '#fff',
    strokeWidth: 3,
    paintOrder: 'stroke',
  };

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟเส้นจุดคุ้มทุน">
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad.l}
          x2={W - pad.r}
          y1={y(maxY * t)}
          y2={y(maxY * t)}
          stroke="#eef1f6"
        />
      ))}
      <line x1={pad.l} y1={y(0)} x2={W - pad.r} y2={y(0)} stroke="#475569" />
      <line x1={pad.l} y1={pad.t - 8} x2={pad.l} y2={y(0)} stroke="#475569" />
      <text x={14} y={H / 2} fontSize={9} fill="#475569" transform={`rotate(-90 14 ${H / 2})`}>
        ล้านบาท
      </text>
      <text x={(pad.l + W - pad.r) / 2} y={H - 6} fontSize={9} fill="#475569" textAnchor="middle">
        จำนวนนิสิต (คน)
      </text>

      {seg(() => tfc, GREEN, '6 4')}
      <text x={W - pad.r + 6} y={y(tfc) + 3} fontSize={9} fill={GREEN}>
        TFC
      </text>
      {seg((n) => tfc + avc * n, '#e2457a')}
      {seg((n) => r * n, PURPLE)}

      {hasStar && qStar <= maxQ && (
        <g>
          <line
            x1={x(qStar)}
            y1={y(r * qStar)}
            x2={x(qStar)}
            y2={y(0)}
            stroke={NAVY}
            strokeDasharray="3 3"
          />
          <circle cx={x(qStar)} cy={y(r * qStar)} r={5} fill={NAVY} />
          <text x={x(qStar)} y={y(0) + 13} textAnchor="middle" fill={NAVY} {...label}>
            Q*={fmtN(qStar)}
          </text>
        </g>
      )}
      {q > 0 && q <= maxQ && (
        <g>
          <circle cx={x(q)} cy={y(r * q)} r={4.5} fill="#f59e0b" />
          <text x={x(q)} y={y(r * q) - 9} textAnchor="middle" fill="#d97706" {...label}>
            Q={fmtN(q)}
          </text>
        </g>
      )}

      <g fontSize={9} fill="#334155">
        <rect x={pad.l + 10} y={12} width={8} height={8} fill={PURPLE} />
        <text x={pad.l + 22} y={19}>
          TR
        </text>
        <rect x={pad.l + 46} y={12} width={8} height={8} fill="#e2457a" />
        <text x={pad.l + 58} y={19}>
          TC
        </text>
        <circle cx={pad.l + 86} cy={16} r={4} fill={NAVY} />
        <text x={pad.l + 94} y={19}>
          Q*
        </text>
        <circle cx={pad.l + 120} cy={16} r={4} fill="#f59e0b" />
        <text x={pad.l + 128} y={19}>
          Q จริง
        </text>
      </g>
    </svg>
  );
};

interface Props {
  entry: ProgramHistoryEntry;
}

const ProgramReport = ({ entry }: Props) => {
  const d = entry.detail;
  const mode = entry.mode;
  const r = mode === 'with_government' ? entry.withGov : entry.withoutGov;
  const R = r.r ?? 0;
  const avc = r.avc ?? 0;
  const cm = r.cm ?? 0;
  const qStar = r.qStar;
  const ok = qStar !== null && qStar >= 0 && entry.q >= qStar;
  const gap = qStar === null ? null : entry.q - qStar;
  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const typeLabel = entry.isNew ? 'หลักสูตรใหม่ (New Program)' : 'หลักสูตรเดิม (Existing Program)';

  // ปันส่วนต้นทุนคงที่ส่วนกลางคณะ — คอลัมน์ที่ใช้คำนวณของฐานรายได้นี้
  const alloc = d?.alloc ?? null;
  const group = d?.groups.find((g) => g.mode === mode);
  const col = group ? (group.cols.find((c) => c.active) ?? group.cols.at(-1)) : undefined;
  const target = alloc?.shares.find((s) => s.target);
  const sharesChanged = !!alloc?.shares.some((s) => Math.round(s.after) !== Math.round(s.before));

  const costRows: {
    label: string;
    sym: string;
    v: number;
    unit?: string;
    color?: string;
    indent?: boolean;
    bold?: boolean;
    hl?: boolean;
  }[] = [
    { label: 'รายได้รวม', sym: 'TR', v: r.tr, color: NAVY },
    { label: 'ต้นทุนรวม', sym: 'TC', v: r.tc },
    { label: 'ต้นทุนคงที่รวม', sym: 'TFC', v: r.tfc, color: NAVY, indent: true },
    { label: 'ต้นทุนผันแปรรวม', sym: 'TVC', v: r.tvc, color: AMBER, indent: true },
    {
      label: 'ต้นทุนผันแปรต่อหน่วย',
      sym: 'AVC',
      v: avc,
      unit: 'บ./คน',
      color: AMBER,
      indent: true,
    },
    {
      label: 'Contribution Margin/หน่วย',
      sym: 'CM',
      v: cm,
      unit: 'บ./คน',
      color: cm >= 0 ? GREEN : RED,
      bold: true,
    },
    {
      label: 'ส่วนเกิน / ขาดทุน',
      sym: 'π',
      v: r.profit,
      color: r.profit >= 0 ? GREEN : RED,
      bold: true,
      hl: true,
    },
    ...(r.breakEvenRevenue === null
      ? []
      : [{ label: 'รายได้ ณ จุดคุ้มทุน', sym: 'BE Rev', v: r.breakEvenRevenue, bold: true }]),
    ...(r.marginOfSafety === null
      ? []
      : [
          {
            label: 'Margin of Safety',
            sym: 'MoS',
            v: r.marginOfSafety,
            color: r.marginOfSafety >= 0 ? GREEN : RED,
            bold: true,
          },
        ]),
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        color: '#1f2937',
        fontFamily: 'inherit',
        '@media print': { display: 'block' },
      }}
    >
      {/* ---------------- หน้า 1 ---------------- */}
      <Page>
        <Letterhead
          right={
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 11 }}>
                ปีการศึกษา 2568
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 0.75 }}>
                {dateStr}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
                <Pill bg="#e7e1ff" color={NAVY}>
                  {typeLabel}
                </Pill>
                <Pill bg="#fff1cc" color="#8a5a00">
                  ฐานรายได้: {REVENUE_MODE_LABEL[mode]}
                </Pill>
              </Box>
            </Box>
          }
        />

        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 20 }}>
          รายงานการวิเคราะห์จุดคุ้มทุนหลักสูตร
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 2 }}>
          {entry.name} · {entry.fac || '-'} · {entry.level}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: `2px solid ${ok ? '#22a06b' : '#e0a100'}`,
            bgcolor: ok ? '#d9f7e8' : '#fff4d6',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: 26 }}>{ok ? '✅' : '⚠️'}</Typography>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: ok ? GREEN : '#8a5a00' }}>
              {qStar === null
                ? 'คำนวณจุดคุ้มทุนไม่ได้'
                : ok
                  ? 'ผ่านจุดคุ้มทุน'
                  : 'ยังไม่ถึงจุดคุ้มทุน'}
            </Typography>
            {qStar !== null && gap !== null && (
              <Typography sx={{ fontSize: 11, color: '#374151' }}>
                จำนวนนิสิต ณ จุดคุ้มทุน = {fmtN(qStar)} คน · นิสิตจริง = {fmtN(entry.q)} คน ·
                ส่วนต่าง {fmtD(gap)} คน
                {r.breakEvenRevenue !== null &&
                  ` · รายได้ ณ จุดคุ้มทุน = ${fmtM(r.breakEvenRevenue)} ล้านบาท`}
              </Typography>
            )}
          </Box>
        </Box>

        <Section no={1} title="ข้อมูลหลักสูตร">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Field label="ชื่อหลักสูตร" value={entry.name} />
            <Field label="สังกัดคณะ / วิทยาลัย" value={entry.fac || '-'} />
            <Field label="ระดับการศึกษา" value={entry.level} />
            <Field label="ประเภทหลักสูตร" value={typeLabel} />
          </Box>
        </Section>

        <Section no={2} title="ตัวชี้วัดทางการเงิน">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            <Kpi label="นิสิตจริง (Q)" value={fmtN(entry.q)} unit="คน" color={NAVY} />
            <Kpi
              label="Q* จุดคุ้มทุน"
              value={qStar === null ? '—' : fmtN(qStar)}
              unit="คน"
              color={ok ? GREEN : RED}
            />
            <Kpi label="รายได้/หัว (R)" value={fmtN(R)} unit="บาท/คน" color={PURPLE} />
            <Kpi label="CM/หัว" value={fmtN(cm)} unit="บาท/คน" color={cm >= 0 ? GREEN : RED} />
          </Box>
        </Section>

        <Section no={3} title="โครงสร้างต้นทุนและรายได้">
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
              '& th': {
                bgcolor: NAVY,
                color: '#fff',
                textAlign: 'left',
                px: 1.5,
                py: 0.9,
                fontWeight: 700,
              },
              '& td': { px: 1.5, py: 0.8, borderBottom: `1px solid ${BORDER}` },
              '& tr:nth-of-type(even) td': { bgcolor: SOFT },
            }}
          >
            <thead>
              <tr>
                <th>รายการ</th>
                <th>สัญลักษณ์</th>
                <th>จำนวนเงิน (บาท)</th>
                <th style={{ textAlign: 'right' }}>ล้านบาท</th>
              </tr>
            </thead>
            <tbody>
              {costRows.map((x) => (
                <tr key={x.sym}>
                  <Box
                    component="td"
                    sx={{
                      pl: x.indent ? '28px !important' : undefined,
                      fontWeight: x.bold ? 700 : 400,
                      ...(x.hl && { bgcolor: `${x.v >= 0 ? '#d9f7e8' : '#fde2e3'} !important` }),
                    }}
                  >
                    {x.label}
                  </Box>
                  <Box
                    component="td"
                    sx={
                      x.hl
                        ? { bgcolor: `${x.v >= 0 ? '#d9f7e8' : '#fde2e3'} !important` }
                        : undefined
                    }
                  >
                    {x.sym}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      fontWeight: 700,
                      color: x.color,
                      ...(x.hl && { bgcolor: `${x.v >= 0 ? '#d9f7e8' : '#fde2e3'} !important` }),
                    }}
                  >
                    {x.sym === 'π' || x.sym === 'MoS' ? fmtD(x.v) : fmtN(x.v)}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      textAlign: 'right',
                      fontWeight: x.color ? 700 : 400,
                      color: x.color,
                      ...(x.hl && { bgcolor: `${x.v >= 0 ? '#d9f7e8' : '#fde2e3'} !important` }),
                    }}
                  >
                    {x.unit ?? `${x.sym === 'π' && x.v > 0 ? '+' : ''}${fmtM(x.v)}`}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Section>

        <Section no={4} title="การคำนวณจุดคุ้มทุน">
          <Formula>
            Q* = TFC ÷ (R − AVC) = {fmtN(r.tfc)} ÷ ({fmtN(R)} − {fmtN(avc)}){' '}
            <b>{qStar === null ? '' : `= ${fmtN(qStar)} คน`}</b>
            {r.qStarStatus === 'full_cost_recovery' && ' (CM ≤ 0 · ใช้เป้าคืนทุนเต็ม TC ÷ R)'}
          </Formula>
          <Formula>
            π = (R − AVC) × Q − TFC = ({fmtN(R)} − {fmtN(avc)}) × {fmtN(entry.q)} − {fmtN(r.tfc)} ={' '}
            <b style={{ color: r.profit >= 0 ? GREEN : RED }}>{fmtD(r.profit)} บาท</b>
          </Formula>
        </Section>
      </Page>

      {/* ---------------- หน้า 2 ---------------- */}
      <Page>
        <Letterhead />

        <Section no={5} title="การปันส่วนต้นทุนคงที่ส่วนกลางคณะ">
          {!alloc ? (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              วิธี: {entry.allocMethod ?? 'ตามชีต (เดิม)'} —
              ไม่มีรายละเอียดการปันส่วนรายคณะในผลที่บันทึกนี้
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1 }}>
                <Field label="วิธีปันส่วน" value={alloc.method} />
                <Field
                  label="ก้อนส่วนกลางคณะ (งบสำนักงาน + ค่าเสื่อม)"
                  value={`${fmtM(alloc.pool)} ลบ. · ${alloc.programs} หลักสูตร`}
                />
                <Field
                  label={`ส่วนแบ่งของ${alloc.targetLabel}`}
                  value={
                    target
                      ? `${fmtN(target.after)} บาท${
                          Math.round(target.after) !== Math.round(target.before)
                            ? ` (ตามชีต ${fmtN(target.before)})`
                            : ''
                        }`
                      : '—'
                  }
                />
              </Box>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 1 }}>
                {alloc.hint}
                {alloc.source ? ` · ${alloc.source}` : ''}
              </Typography>
              {col && (
                <Formula>
                  TFC ที่ใช้คำนวณ = TFC ในตาราง {fmtN(col.result.tfc - col.result.fixAdj)}
                  {target && col.result.fixAdj !== 0
                    ? ` − ส่วนแบ่งตามชีต ${fmtN(target.before)} + ส่วนแบ่งตามวิธีที่เลือก ${fmtN(target.after)}`
                    : ' (รวมส่วนแบ่งตามชีตแล้ว ไม่ปรับ)'}{' '}
                  = <b>{fmtN(col.result.tfc)} บาท</b>
                </Formula>
              )}
              {alloc.warnings.map((w) => (
                <Typography key={w} sx={{ fontSize: 10, color: AMBER }}>
                  ⚠ {w}
                </Typography>
              ))}
              {sharesChanged && (
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10,
                    mt: 1,
                    '& th': { bgcolor: SOFT, textAlign: 'right', px: 1, py: 0.5, fontWeight: 700 },
                    '& th:first-of-type, & td:first-of-type': { textAlign: 'left' },
                    '& td': {
                      textAlign: 'right',
                      px: 1,
                      py: 0.4,
                      borderBottom: `1px solid ${BORDER}`,
                    },
                    '& tr': { breakInside: 'avoid' },
                  }}
                >
                  <thead>
                    <tr>
                      <th>หลักสูตรในคณะ</th>
                      <th>นิสิต</th>
                      <th>ส่วนแบ่งตามชีต</th>
                      <th>ตามวิธีที่เลือก</th>
                      <th>ผลต่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alloc.shares.map((s) => (
                      <Box
                        component="tr"
                        key={s.label}
                        sx={s.target ? { bgcolor: '#eee8ff', fontWeight: 700 } : undefined}
                      >
                        <td>
                          {s.label}
                          {s.target ? ' (หลักสูตรนี้)' : ''}
                        </td>
                        <td>{s.q === undefined ? '—' : fmtN(s.q)}</td>
                        <td>{fmtN(s.before)}</td>
                        <td>{fmtN(s.after)}</td>
                        <td>{fmtD(s.after - s.before)}</td>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              )}
            </>
          )}
        </Section>

        <Section no={6} title="กราฟเส้นจุดคุ้มทุน (Break-Even Chart)">
          <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, p: 1.5, bgcolor: SOFT }}>
            <PrintChart q={entry.q} tfc={r.tfc} avc={avc} r={R} qStar={qStar} />
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center', mt: 1 }}>
            จุดสีเข้ม (●) = Q* จุดคุ้มทุน = {qStar === null ? '—' : fmtN(qStar)} คน · จุดสีทอง (●) =
            นิสิตจริง {fmtN(entry.q)} คน
          </Typography>
        </Section>

        <Section no={7} title="ข้อเสนอแนะ">
          <Box
            sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, px: 2, py: 1.5, bgcolor: SOFT }}
          >
            <Typography
              sx={{ fontWeight: 800, fontSize: 13, color: ok ? GREEN : '#8a5a00', mb: 0.5 }}
            >
              {ok ? '✅ หลักสูตรผ่านเกณฑ์จุดคุ้มทุน' : '⚠️ หลักสูตรยังไม่ถึงจุดคุ้มทุน'}
            </Typography>
            <Typography sx={{ fontSize: 12, mb: 0.5 }}>
              มีนิสิตจริง <b>{fmtN(entry.q)} คน</b>{' '}
              {qStar === null || gap === null ? (
                '· คำนวณจุดคุ้มทุนไม่ได้'
              ) : (
                <>
                  {ok ? 'เกิน' : 'ต่ำกว่า'}จุดคุ้มทุน <b>{fmtN(qStar)} คน</b> อยู่{' '}
                  <b>{fmtD(gap)} คน</b>
                </>
              )}{' '}
              · CM <b>{fmtN(cm)} บ./คน</b> · {r.profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'}{' '}
              <b>{fmtM(Math.abs(r.profit))} ล้านบาท</b>
            </Typography>
            <Typography sx={{ fontSize: 12 }}>
              แนะนำ:{' '}
              {ok
                ? 'รักษาจำนวนนิสิตและโครงสร้างต้นทุนให้คงที่เพื่อความยั่งยืน และพิจารณานำส่วนเกินไปพัฒนาคุณภาพ'
                : cm <= 0
                  ? 'รายได้ต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว ยิ่งรับนิสิตยิ่งขาดทุน — ทบทวนอัตราค่าธรรมเนียมหรือลดต้นทุนผันแปรต่อหัวก่อน'
                  : `เพิ่มจำนวนรับนิสิตอีกอย่างน้อย ${fmtN(-(gap ?? 0))} คน หรือทบทวนค่าธรรมเนียม/ลดต้นทุนคงที่เพื่อลดจุดคุ้มทุน`}
            </Typography>
          </Box>
        </Section>

        <Section no={8} title="ผู้รับรองรายงาน">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mt: 4 }}>
            {['ผู้จัดทำ', 'ประธานหลักสูตร', 'คณบดี / ผู้อำนวยการ'].map((role, i) => (
              <Box key={role} sx={{ textAlign: 'center', pt: 5, borderTop: '1px solid #334155' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{role}</Typography>
                <Typography sx={{ fontSize: 10, mt: 0.5 }}>
                  (...................................)
                </Typography>
                <Typography sx={{ fontSize: 10, mt: 0.5 }}>
                  วันที่: {i === 0 ? dateStr : '.........................'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Section>

        <Box
          sx={{
            bgcolor: '#eee8ff',
            border: '1px solid #c9bcff',
            borderRadius: 1.5,
            px: 1.5,
            py: 1,
            fontSize: 10,
            color: NAVY,
          }}
        >
          <b>อ้างอิงมาตรฐาน:</b> การวิเคราะห์จุดคุ้มทุนอ้างอิงตาม Horngren, Datar &amp; Rajan (2015)
          และหลักเกณฑ์กรมบัญชีกลาง (2566) ว่าด้วยการคำนวณต้นทุนต่อหน่วยผลผลิตของสถาบันอุดมศึกษา
        </Box>
      </Page>
    </Box>
  );
};

export default ProgramReport;
