// รายงานสำหรับพิมพ์/บันทึกเป็น PDF ผ่านกล่องโต้ตอบพิมพ์ของเบราว์เซอร์ (window.print())
// ฉบับย่อ 2 หน้า 7 หัวข้อ — แสดงทั้งกรณีรวมและไม่รวมเงินแผ่นดินคู่กัน จากภาพที่บันทึกไว้ ไม่คำนวณซ้ำจากฟอร์มปัจจุบัน
import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine';

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
        รายงานการวิเคราะห์จุดคุ้มทุน · กองแผนงาน
      </Typography>
    </Box>
    {right}
  </Box>
);

/** สีประจำกรณี — ตรงกับกรอบกรณีบนหน้าจอ */
const CASE_COLOR: Record<RevenueMode, string> = {
  with_government: PURPLE,
  without_government: AMBER,
};

interface Case {
  mode: RevenueMode;
  r: BreakEvenResult;
}

/** กราฟรายได้รวมสองกรณี/ต้นทุนรวม/ต้นทุนคงที่ แบบ SVG ล้วน — ApexCharts วัดขนาดไม่ได้ในกล่องที่ซ่อนไว้จนสั่งพิมพ์ */
const PrintChart = ({ cases }: { cases: Case[] }) => {
  const W = 640;
  const H = 230;
  const pad = { l: 50, r: 70, t: 36, b: 48 };
  const per = cases.map(({ mode, r }) => ({
    mode,
    q: r.q,
    tfc: r.tfc,
    avc: r.avc ?? 0,
    rh: r.r ?? 0,
    qStar: r.qStar !== null && r.qStar > 0 ? r.qStar : null,
  }));
  const maxQ = Math.min(
    Math.max(30, ...per.map((c) => Math.max(c.q * 1.3, c.qStar ? c.qStar * 1.6 : 0))),
    2e5,
  );
  const maxY = Math.max(...per.map((c) => Math.max(c.rh * maxQ, c.tfc + c.avc * maxQ, c.tfc))) || 1;
  const sameCost = per.every((c) => c.tfc === per[0]!.tfc && c.avc === per[0]!.avc);
  const costs = sameCost ? per.slice(0, 1) : per;
  const x = (n: number) => pad.l + (n / maxQ) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / maxY) * (H - pad.t - pad.b);
  const seg = (key: string, f: (n: number) => number, stroke: string, dash?: string) => (
    <line
      key={key}
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

      {costs.map((c, i) => (
        <g key={c.mode}>
          {seg('tfc', () => c.tfc, GREEN, '6 4')}
          {seg('tc', (n) => c.tfc + c.avc * n, '#e2457a', i > 0 ? '8 3' : undefined)}
        </g>
      ))}
      <text x={W - pad.r + 4} y={y(costs[0]!.tfc) - 4} fontSize={9} fill={GREEN}>
        ต้นทุนคงที่
      </text>
      {per.map((c) => seg(c.mode, (n) => c.rh * n, CASE_COLOR[c.mode]))}

      {per.map(
        (c, i) =>
          c.qStar !== null &&
          c.qStar <= maxQ && (
            <g key={c.mode}>
              <line
                x1={x(c.qStar)}
                y1={y(c.rh * c.qStar)}
                x2={x(c.qStar)}
                y2={y(0)}
                stroke={CASE_COLOR[c.mode]}
                strokeDasharray="3 3"
              />
              <circle cx={x(c.qStar)} cy={y(c.rh * c.qStar)} r={5} fill={CASE_COLOR[c.mode]} />
              <text
                x={x(c.qStar)}
                y={y(0) + 13 + i * 11}
                textAnchor="middle"
                fill={CASE_COLOR[c.mode]}
                {...label}
              >
                คุ้มทุน {fmtN(c.qStar)} คน
              </text>
            </g>
          ),
      )}
      {per.map(
        (c) =>
          c.q > 0 &&
          c.q <= maxQ && (
            <circle key={c.mode} cx={x(c.q)} cy={y(c.rh * c.q)} r={4} fill="#334155" />
          ),
      )}
      {[...new Set(per.map((c) => c.q))].map(
        (q) =>
          q > 0 &&
          q <= maxQ && (
            <text
              key={q}
              x={x(q)}
              y={y(Math.max(...per.map((c) => c.rh)) * q) - 9}
              textAnchor="middle"
              fill="#334155"
              {...label}
            >
              จริง {fmtN(q)} คน
            </text>
          ),
      )}

      <g fontSize={9} fill="#334155">
        {per.map((c, i) => (
          <g key={c.mode}>
            <rect x={pad.l + 10 + i * 120} y={12} width={8} height={8} fill={CASE_COLOR[c.mode]} />
            <text x={pad.l + 22 + i * 120} y={19}>
              รายได้ ({REVENUE_MODE_LABEL[c.mode]})
            </text>
          </g>
        ))}
        <rect x={pad.l + 250} y={12} width={8} height={8} fill="#e2457a" />
        <text x={pad.l + 262} y={19}>
          ต้นทุนรวม{sameCost ? '' : ' (เส้นประ = ไม่รวมฯ)'}
        </text>
        <line
          x1={pad.l + (sameCost ? 320 : 400)}
          y1={16}
          x2={pad.l + (sameCost ? 332 : 412)}
          y2={16}
          stroke={GREEN}
          strokeWidth={2.5}
          strokeDasharray="4 2"
        />
        <text x={pad.l + (sameCost ? 336 : 416)} y={19}>
          ต้นทุนคงที่
        </text>
        <circle cx={pad.l + (sameCost ? 394 : 474)} cy={16} r={4} fill="#334155" />
        <text x={pad.l + (sameCost ? 402 : 482)} y={19}>
          นิสิตจริง
        </text>
      </g>
    </svg>
  );
};

/** ตารางเทียบสองกรณี — แถวละรายการ คอลัมน์ละกรณี */
const CompareTable = ({
  cases,
  rows,
}: {
  cases: Case[];
  rows: {
    key: string;
    label: string;
    v: (r: BreakEvenResult) => number | null;
    fmt?: (v: number) => string;
    tone?: boolean;
    indent?: boolean;
    bold?: boolean;
  }[];
}) => (
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
        {cases.map((c) => (
          <th key={c.mode} style={{ textAlign: 'right' }}>
            {REVENUE_MODE_LABEL[c.mode]}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.key}>
          <Box
            component="td"
            sx={{
              pl: row.indent ? '28px !important' : undefined,
              fontWeight: row.bold ? 700 : 400,
            }}
          >
            {row.label}
          </Box>
          {cases.map((c) => {
            const v = row.v(c.r);

            return (
              <Box
                component="td"
                key={c.mode}
                sx={{
                  textAlign: 'right',
                  fontWeight: 700,
                  color: row.tone && v !== null ? (v >= 0 ? GREEN : RED) : undefined,
                }}
              >
                {v === null ? '—' : (row.fmt ?? fmtN)(v)}
              </Box>
            );
          })}
        </tr>
      ))}
    </tbody>
  </Box>
);

interface Props {
  entry: ProgramHistoryEntry;
}

const ProgramReport = ({ entry }: Props) => {
  const cases: Case[] = [
    { mode: 'with_government', r: entry.withGov },
    { mode: 'without_government', r: entry.withoutGov },
  ];
  // ปัดรายได้รวม/ต้นทุนรวมเป็นบาทก่อนลบ — ผู้อ่านคิดตามตัวเลขในรายงานแล้วได้ผลตรงกัน
  const profitOf = (r: BreakEvenResult) => Math.round(r.tr) - Math.round(r.tc);
  const okOf = (r: BreakEvenResult) => r.qStar !== null && r.qStar >= 0 && r.q >= r.qStar;
  const fullOf = (r: BreakEvenResult) => r.qStarStatus === 'full_cost_recovery';
  const allOk = cases.every((c) => okOf(c.r));
  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const typeLabel = entry.isNew ? 'หลักสูตรใหม่' : 'หลักสูตรเดิม';
  const status = (r: BreakEvenResult) =>
    r.qStar === null ? 'คำนวณจุดคุ้มทุนไม่ได้' : okOf(r) ? 'ผ่านจุดคุ้มทุน' : 'ยังไม่ถึงจุดคุ้มทุน';
  const tone = allOk
    ? { border: '#22a06b', bg: '#d9f7e8', icon: '✅' }
    : { border: '#e0a100', bg: '#fff4d6', icon: '⚠️' };

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
                  ฐานรายได้: รวมและไม่รวมเงินแผ่นดิน
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
            border: `2px solid ${tone.border}`,
            bgcolor: tone.bg,
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: 26 }}>{tone.icon}</Typography>
          <Box>
            {cases.map(({ mode, r }) => (
              <Typography key={mode} sx={{ fontSize: 11, color: '#374151' }}>
                <b style={{ color: CASE_COLOR[mode] }}>{REVENUE_MODE_LABEL[mode]}:</b>{' '}
                <b style={{ color: okOf(r) ? GREEN : '#8a5a00' }}>{status(r)}</b>
                {r.qStar !== null &&
                  ` · ${fullOf(r) ? 'เป้าหมายคืนทุนเต็ม' : 'จุดคุ้มทุน'} ${fmtN(r.qStar)} คน · นิสิตจริง ${fmtN(r.q)} คน · ${r.q >= r.qStar ? 'เกิน' : 'ขาด'} ${fmtN(Math.abs(r.q - r.qStar))} คน`}
              </Typography>
            ))}
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
          <CompareTable
            cases={cases}
            rows={[
              { key: 'q', label: 'จำนวนนิสิตจริง (คน)', v: (r) => r.q },
              {
                key: 'qStar',
                label: 'จำนวนนิสิต ณ จุดคุ้มทุน (คน)',
                v: (r) => r.qStar,
                bold: true,
              },
              { key: 'r', label: 'รายได้ต่อหัว (บาท/คน)', v: (r) => r.r },
              {
                key: 'cm',
                label: 'ส่วนต่างต่อหัว = รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว (บาท/คน)',
                v: (r) => r.cm,
                tone: true,
                bold: true,
              },
            ]}
          />
        </Section>

        <Section no={3} title="โครงสร้างต้นทุนและรายได้ (บาท)">
          <CompareTable
            cases={cases}
            rows={[
              { key: 'tr', label: 'รายได้รวม', v: (r) => r.tr },
              { key: 'tc', label: 'ต้นทุนรวม (ต้นทุนคงที่ + ต้นทุนผันแปร)', v: (r) => r.tc },
              { key: 'tfc', label: 'ต้นทุนคงที่รวม', v: (r) => r.tfc, indent: true },
              { key: 'tvc', label: 'ต้นทุนผันแปรรวม', v: (r) => r.tvc, indent: true },
              {
                key: 'avc',
                label: 'ต้นทุนผันแปรต่อหัว (บาทต่อคน)',
                v: (r) => r.avc,
                indent: true,
              },
              {
                key: 'profit',
                label: 'กำไร (ขาดทุน) = รายได้รวม − ต้นทุนรวม',
                v: profitOf,
                fmt: fmtD,
                tone: true,
                bold: true,
              },
              {
                key: 'ber',
                label: 'รายได้ ณ จุดคุ้มทุน',
                v: (r) => r.breakEvenRevenue,
                bold: true,
              },
              {
                key: 'mos',
                label: 'รายได้ส่วนที่เกินจุดคุ้มทุน (รายได้รวม − รายได้ ณ จุดคุ้มทุน)',
                v: (r) => r.marginOfSafety,
                fmt: fmtD,
                tone: true,
                bold: true,
              },
            ]}
          />
        </Section>
      </Page>

      {/* ---------------- หน้า 2 ---------------- */}
      <Page>
        <Letterhead />

        <Section no={4} title="การคำนวณจุดคุ้มทุน">
          {cases.map(({ mode, r }) => {
            const R = r.r ?? 0;
            const profit = profitOf(r);

            return (
              <Formula key={mode}>
                <b style={{ color: CASE_COLOR[mode] }}>{REVENUE_MODE_LABEL[mode]}</b>
                <br />
                {fullOf(r) ? (
                  <>
                    รายได้ต่อหัวไม่สูงกว่าต้นทุนผันแปรต่อหัว จึงไม่มีจุดคุ้มทุน — เป้าหมายคืนทุนเต็ม
                    = ต้นทุนรวม ÷ รายได้ต่อหัว = {fmtN(r.tc)} ÷ {fmtN(R)}
                  </>
                ) : (
                  <>
                    จำนวนนิสิต ณ จุดคุ้มทุน = ต้นทุนคงที่รวม ÷ (รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว) ={' '}
                    {fmtN(r.tfc)} ÷ ({fmtN(R)} − {fmtN(r.avc ?? 0)})
                  </>
                )}{' '}
                <b>{r.qStar === null ? '' : `→ ปัดขึ้นเป็น ${fmtN(r.qStar)} คน`}</b>
                <br />
                กำไร (ขาดทุน) = {fmtN(r.tr)} − {fmtN(r.tc)} ={' '}
                <b style={{ color: profit >= 0 ? GREEN : RED }}>{fmtD(profit)} บาท</b>
              </Formula>
            );
          })}
        </Section>

        <Section no={5} title="กราฟจุดคุ้มทุน">
          <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, p: 1.5, bgcolor: SOFT }}>
            <PrintChart cases={cases} />
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center', mt: 1 }}>
            จุดคุ้มทุนคือจุดที่เส้นรายได้รวมตัดกับเส้นต้นทุนรวม · สีม่วง = รวมเงินแผ่นดิน · สีส้ม =
            ไม่รวมเงินแผ่นดิน
          </Typography>
        </Section>

        <Section no={6} title="ข้อเสนอแนะ">
          <Box
            sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, px: 2, py: 1.5, bgcolor: SOFT }}
          >
            {cases.map(({ mode, r }) => {
              const ok = okOf(r);
              const full = fullOf(r);
              const cm = r.cm ?? 0;
              const profit = profitOf(r);
              const gap = r.qStar === null ? null : r.q - r.qStar;

              return (
                <Box key={mode} sx={{ mb: 1, '&:last-of-type': { mb: 0 } }}>
                  <Typography
                    sx={{ fontWeight: 800, fontSize: 12, color: ok ? GREEN : '#8a5a00', mb: 0.25 }}
                  >
                    {ok ? '✅' : '⚠️'} {REVENUE_MODE_LABEL[mode]} —{' '}
                    {ok ? 'ผ่านเกณฑ์จุดคุ้มทุน' : 'ยังไม่ถึงจุดคุ้มทุน'}
                  </Typography>
                  <Typography sx={{ fontSize: 11 }}>
                    นิสิตจริง <b>{fmtN(r.q)} คน</b>{' '}
                    {r.qStar === null || gap === null ? (
                      '· คำนวณจุดคุ้มทุนไม่ได้'
                    ) : (
                      <>
                        {ok ? 'มากกว่า' : 'น้อยกว่า'}
                        {full ? 'เป้าหมายคืนทุนเต็ม' : 'จุดคุ้มทุน'} (<b>{fmtN(r.qStar)} คน</b>)
                        อยู่ <b>{fmtN(Math.abs(gap))} คน</b>
                      </>
                    )}{' '}
                    · {profit >= 0 ? 'กำไร' : 'ขาดทุน'} <b>{fmtM(Math.abs(profit))} ล้านบาท</b> ·
                    แนะนำ:{' '}
                    {ok
                      ? 'รักษาจำนวนนิสิตและโครงสร้างต้นทุนให้คงที่เพื่อความยั่งยืน'
                      : cm <= 0
                        ? 'รายได้ต่อหัวไม่สูงกว่าต้นทุนผันแปรต่อหัว ยิ่งรับนิสิตยิ่งขาดทุน — ทบทวนอัตราค่าธรรมเนียมหรือลดต้นทุนผันแปรต่อหัวก่อน'
                        : `เพิ่มจำนวนรับนิสิตอีกอย่างน้อย ${fmtN(-(gap ?? 0))} คน หรือทบทวนค่าธรรมเนียม/ลดต้นทุนคงที่`}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Section>

        <Section no={7} title="ผู้รับรองรายงาน">
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
