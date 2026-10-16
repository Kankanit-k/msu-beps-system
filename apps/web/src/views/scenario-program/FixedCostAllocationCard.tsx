'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';
import type { ProgRow } from '@/data/mockup';
import { fmtMillion, REVENUE_MODE_LABEL, sheetQStar } from '@views/breakeven/calc';
import { fmtLockedAt, type FacultyLock } from '@views/fixed-cost-lock/lockStore';

import {
  ALLOC_METHOD_LABEL,
  type AllocChoice,
  type AllocMethod,
  type AllocOutcome,
} from './facultyAllocation';

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtD = (v: number) => {
  const x = Math.round(v);

  return x === 0 ? '0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toLocaleString('th-TH')}`;
};

export const METHOD_HINT: Record<AllocMethod, string> = {
  PER_HEAD_FTES: 'ก้อนส่วนกลางคณะแบ่งตามจำนวนนิสิตของแต่ละหลักสูตร หลักสูตรใหญ่รับมาก',
  EQUAL_PROGRAM: 'ก้อนส่วนกลางคณะหารเท่ากันทุกหลักสูตร ไม่ขึ้นกับจำนวนนิสิต',
  CUSTOM_PCT:
    'คณะกำหนด % เองรายระดับการศึกษาหรือรายหลักสูตร (ต้องรวม 100% พอดี) แล้วแบ่งต่อภายในกลุ่ม',
};

interface Props {
  faculty: string | null;
  isNew: boolean;
  /** หลักสูตรใหม่ตั้งต้นจากหลักสูตรอ้างอิง (มีส่วนแบ่งของหลักสูตรนั้นติดมา) */
  hasRef: boolean;
  /** วิธีที่คณะล็อกไว้ — หน้านี้ดูได้อย่างเดียว แก้ที่หน้าตั้งค่าวิธีปันส่วน (ผู้ดูแลคณะ) */
  lock: FacultyLock;
  pool: number;
  /** หลักสูตรเดิมของคณะ (ใช้คำนวณ Q* ของหลักสูตรอื่นแบบชีต) */
  rows: { id: string; p: ProgRow }[];
  /** ผลปันส่วนของคอลัมน์ที่ใช้คำนวณอยู่ */
  outcome: AllocOutcome | null;
  /** หลักสูตรที่กำลังคำนวณ (คอลัมน์ที่ใช้คำนวณ) */
  targetId: string | null;
  targetLabel: string;
  /** จำนวนนิสิตของหลักสูตรที่กำลังคำนวณ */
  targetQ: number;
  mode: RevenueMode;
  /** ตัวหนังสือน้อย — คำอธิบายย้ายไป tooltip และแสดงขั้นตอนเป็นแผนภาพ ก้อนคณะ → แบ่ง → หลักสูตรนี้ */
  compact?: boolean;
  /** หุบไว้เป็นค่าตั้งต้น — หัวการ์ดบอกวิธีที่คณะเลือก กดเพื่อดูรายละเอียด */
  collapsible?: boolean;
}

const ROWS_PER_PAGE = 10;

/** อธิบายวิธีแบ่งที่เลือกอยู่เป็นภาษาคน — ให้เห็นว่าทำไมแต่ละหลักสูตรได้ตัวเลขนั้น */
const howSplit = (c: AllocChoice): string => {
  switch (c.method) {
    case 'PER_HEAD_FTES':
      return 'แบ่งตามจำนวนนิสิต หลักสูตรที่มีนิสิตมากรับภาระมาก';
    case 'EQUAL_PROGRAM':
      return 'ทุกหลักสูตรได้ส่วนแบ่งเท่ากัน ไม่ว่ามีนิสิตกี่คน';
    case 'CUSTOM_PCT':
      return c.bucketLevel === 'PROGRAM'
        ? 'แต่ละหลักสูตรได้ตาม % ที่คณะกำหนด'
        : `แต่ละระดับการศึกษาได้ตาม % ที่คณะกำหนด แล้วแบ่งต่อในระดับ${
            c.subMethod === 'EQUAL_PROGRAM'
              ? 'เท่ากันทุกหลักสูตร (หลักสูตรระดับเดียวกันจึงได้ตัวเลขเท่ากัน)'
              : 'ตามจำนวนนิสิต'
          }`;
  }
};

const FlowBox = (props: { label: string; value: string; note?: string; strong?: boolean }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 0,
      p: 2,
      borderRadius: 1,
      bgcolor: props.strong ? 'primary.lightOpacity' : 'action.hover',
      border: props.strong ? 1 : 0,
      borderColor: 'primary.main',
    }}
  >
    <Typography variant="caption" color="text.secondary" display="block">
      {props.label}
    </Typography>
    <Typography variant="h6" fontWeight={800}>
      {props.value}
    </Typography>
    {props.note && (
      <Typography variant="caption" color="text.secondary">
        {props.note}
      </Typography>
    )}
  </Box>
);

/** Q* เป็นคำอ่าน — ติดลบ = รายได้ต่อคน ≤ ต้นทุนผันแปรต่อคน */
const fmtNeed = (qStar: number) =>
  qStar < 0 ? 'รับเพิ่มก็ไม่คุ้ม' : `${Math.round(qStar).toLocaleString('th-TH')} คน`;

const isBreakEven = (q: number, qStar: number) => qStar >= 0 && q >= qStar;

/** หัวตารางของป็อปอัปผลกระทบ — ตัวใหญ่กว่า default ธีม (0.625rem) และไม่ uppercase ให้อ่านภาษาไทยง่าย */
const headSx = {
  fontSize: '0.75rem',
  textTransform: 'none',
  letterSpacing: 0,
  lineHeight: 1.4,
  color: 'text.primary',
  bgcolor: 'var(--mui-palette-customColors-tableHeaderBg)',
  borderBottom: '1px solid var(--mui-palette-divider)',
} as const;

/** คอลัมน์ "หลังแบ่งใหม่" — พื้นสีอ่อนให้ตาจับผลลัพธ์ได้ทันที */
const resultSx = { bgcolor: 'rgb(var(--mui-palette-primary-mainChannel) / 0.05)' } as const;

const numSx = {
  fontSize: '0.8125rem',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
} as const;

/** ผลต่างส่วนแบ่ง — ชิปสีอ่อน: แดง = รับภาระเพิ่ม · เขียว = ภาระลดลง */
const DiffChip = ({ d }: { d: number }) => {
  const x = Math.round(d);

  if (x === 0) return <Typography sx={{ ...numSx, color: 'text.disabled' }}>0</Typography>;

  return (
    <Chip
      size="small"
      variant="tonal"
      color={x > 0 ? 'error' : 'success'}
      icon={<i className={x > 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} />}
      label={fmtD(x).replace(/^[+−]/, '')}
      sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
    />
  );
};

/** สถานะหลังแบ่งใหม่เทียบนิสิตจริง · บอกด้วยเมื่อสถานะต่างจากเดิม */
const ImpactStatus = ({ q, before, after }: { q: number; before: number; after: number }) => {
  const ok = isBreakEven(q, after);
  const changed = isBreakEven(q, before) !== ok;

  return (
    <Box>
      <Chip
        size="small"
        variant="tonal"
        color={ok ? 'success' : after < 0 ? 'warning' : 'error'}
        icon={<i className={ok ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} />}
        label={
          ok
            ? 'คุ้มทุน'
            : after < 0
              ? 'ยิ่งรับยิ่งขาดทุน'
              : `ขาด ${Math.round(after - q).toLocaleString('th-TH')} คน`
        }
      />
      {changed && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
        >
          เดิม{isBreakEven(q, before) ? 'คุ้มทุน' : 'ไม่คุ้มทุน'}
        </Typography>
      )}
    </Box>
  );
};

/** แถวผลกระทบแบบการ์ด — จอเล็กแทนตารางกว้าง */
const ImpactCard = ({ r }: { r: ImpactRow }) => {
  const line = (label: string, before: string, after: ReactNode) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ ...numSx, color: 'text.secondary' }}>{before}</Typography>
        <i
          className="ri-arrow-right-s-line"
          style={{ color: 'var(--mui-palette-text-disabled)' }}
        />
        <Typography component="div" sx={{ ...numSx, fontWeight: 600, color: 'text.primary' }}>
          {after}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: r.selected ? 'primary.main' : 'divider',
        bgcolor: r.selected ? 'primary.lightOpacity' : undefined,
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {r.prog}
            {r.selected && (
              <Chip size="small" color="primary" label="หลักสูตรที่เลือก" sx={{ ml: 1.5 }} />
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.deg} · {r.lvl} · นิสิต {fmtB(r.q)} คน
          </Typography>
        </Box>
        <ImpactStatus q={r.q} before={r.qBefore} after={r.qAfter} />
      </Box>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {line('ส่วนแบ่ง (บาท/ปี)', fmtB(r.before), fmtB(r.after))}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <DiffChip d={r.after - r.before} />
        </Box>
        {line('ต้องมีนิสิตจึงคุ้มทุน', fmtNeed(r.qBefore), fmtNeed(r.qAfter))}
      </Box>
    </Box>
  );
};

/** ตัวเลขสรุปบนป็อปอัป */
type ImpactRow = {
  id: string;
  prog: string;
  deg: string;
  lvl: string;
  q: number;
  before: number;
  after: number;
  qBefore: number;
  qAfter: number;
  /** หลักสูตรที่กำลังปรับปรุง — ปักไว้แถวแรกเพื่อเทียบ */
  selected?: boolean;
};

const ImpactStat = (props: { icon: string; color: string; label: string; value: string }) => (
  <Box
    sx={{
      flex: '1 1 160px',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2.5,
      borderRadius: 1,
      border: '1px solid var(--mui-palette-divider)',
    }}
  >
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        inlineSize: 36,
        blockSize: 36,
        borderRadius: 1,
        color: `${props.color}.main`,
        bgcolor: `${props.color}.lightOpacity`,
        fontSize: 20,
      }}
    >
      <i className={props.icon} />
    </Box>
    <Box>
      <Typography variant="h6" sx={{ lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
        {props.value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
    </Box>
  </Box>
);

/** ขั้นตอนการปันเป็นภาพ: ก้อนส่วนกลางคณะ → แบ่งทุกหลักสูตรด้วยวิธีที่เลือก → ส่วนแบ่งของหลักสูตรนี้ */
const AllocFlow = (props: {
  pool: number;
  count: number;
  method: string;
  targetLabel: string;
  target: { before: number; after: number } | null;
}) => {
  const arrow = (
    <Box
      component="i"
      className="ri-arrow-right-line"
      sx={{
        alignSelf: 'center',
        fontSize: 22,
        color: 'text.disabled',
        transform: { xs: 'rotate(90deg)', sm: 'none' },
      }}
    />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'stretch',
        gap: 1.5,
        mb: 3,
      }}
    >
      <FlowBox label="ก้อนส่วนกลางคณะ" value={`${fmtMillion(props.pool)} ลบ.`} />
      {arrow}
      <FlowBox label={props.method} value={`÷ ${props.count} หลักสูตร`} />
      {arrow}
      <FlowBox
        strong
        label={props.targetLabel}
        value={props.target ? `${fmtB(props.target.after)} บาท` : '—'}
        note={
          props.target
            ? `ชีต ${fmtB(props.target.before)} (${fmtD(props.target.after - props.target.before)})`
            : undefined
        }
      />
    </Box>
  );
};

/**
 * ขั้น "ปันส่วนต้นทุนคงที่" ก่อนคำนวณจุดคุ้มทุน — ใช้วิธีที่คณะล็อกไว้ (1 ใน 3 วิธีตามมติ) แก้ไม่ได้
 * ปันใหม่ทั้งคณะเสมอ (หลักสูตรใหม่เข้าไปแบ่งก้อนเดิม) แล้วเปิดดูผลกระทบต่อหลักสูตรอื่นได้
 */
const FixedCostAllocationCard = ({
  faculty,
  isNew,
  hasRef,
  lock,
  pool,
  rows,
  outcome,
  targetId,
  targetLabel,
  targetQ,
  mode,
  compact = false,
  collapsible = false,
}: Props) => {
  const [impactOpen, setImpactOpen] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  const [page, setPage] = useState(0);

  const choice: AllocChoice = lock.choice;
  const target = outcome?.shares.find((s) => s.id === targetId) ?? null;
  const errors = outcome?.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings = outcome?.issues.filter((i) => i.severity === 'warning') ?? [];
  const blocked = !!outcome && !outcome.applied;

  // ผลกระทบต่อหลักสูตรอื่นในคณะ — Q* ใช้สูตรชีตเดียวกับหน้ารายงาน เทียบก่อน/หลังด้วยสูตรเดียวกัน
  const impact = useMemo((): ImpactRow[] => {
    if (!outcome?.applied) return [];
    const byId = new Map(outcome.shares.map((s) => [s.id, s]));

    return rows
      .map(({ id, p }) => {
        const s = byId.get(id)!;
        const after = { ...p, TFC: p.TFC - s.before + s.after };

        return {
          id,
          prog: p.prog,
          deg: p.deg,
          lvl: p.lvl,
          q: p.Q,
          before: s.before,
          after: s.after,
          qBefore: sheetQStar(p, mode),
          qAfter: sheetQStar(after, mode),
          ...(id === targetId ? { q: targetQ, selected: true } : {}),
        };
      })
      .sort(
        (a, b) =>
          Number(!!b.selected) - Number(!!a.selected) ||
          Math.abs(b.after - b.before) - Math.abs(a.after - a.before),
      );
  }, [outcome, rows, targetId, targetQ, mode]);
  /** หลักสูตรอื่นในคณะ (ไม่รวมหลักสูตรที่เลือก) — ใช้นับสรุป */
  const others = impact.filter((r) => !r.selected);

  const smallScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'));

  const impactSummary = useMemo(
    () => ({
      up: others.filter((r) => Math.round(r.after - r.before) > 0).length,
      down: others.filter((r) => Math.round(r.after - r.before) < 0).length,
      flipped: others.filter((r) => isBreakEven(r.q, r.qBefore) && !isBreakEven(r.q, r.qAfter))
        .length,
    }),
    [others],
  );

  const counted = outcome?.shares.reduce((s, x) => s + x.after, 0) ?? 0;

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <DotTitle color="info.main">ปันส่วนต้นทุนคงที่ส่วนกลางคณะ</DotTitle>
            {collapsible && !open && faculty && (
              <Chip
                size="small"
                color="primary"
                variant="tonal"
                icon={<i className="ri-lock-line" />}
                label={`คณะเลือก: ${ALLOC_METHOD_LABEL[choice.method]}`}
              />
            )}
          </Box>
        }
        action={
          collapsible ? (
            <Button
              size="small"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              endIcon={<i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
            >
              {open ? 'ซ่อน' : 'ดูรายละเอียด'}
            </Button>
          ) : undefined
        }
      />
      <Collapse in={open} unmountOnExit>
        <CardContent>
          {!faculty ? (
            <Alert severity="info" variant="outlined">
              เลือกคณะก่อน — การปันส่วนต้องคำนวณทั้งคณะ
            </Alert>
          ) : (
            <>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}
              >
                <Chip
                  color="primary"
                  icon={<i className="ri-lock-line" />}
                  label={ALLOC_METHOD_LABEL[choice.method]}
                />
                <Typography variant="caption" color="text.secondary">
                  ล็อกโดย {lock.lockedBy} · {fmtLockedAt(lock.lockedAt)}
                </Typography>
              </Box>

              {compact ? (
                <AllocFlow
                  pool={pool}
                  count={rows.length + (isNew ? 1 : 0)}
                  method={ALLOC_METHOD_LABEL[choice.method]}
                  targetLabel={targetLabel}
                  target={target}
                />
              ) : (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {(
                    [
                      ['ก้อนส่วนกลางคณะ', `${fmtMillion(pool)} ลบ.`, ''],
                      [
                        'หลักสูตรที่ร่วมแบ่ง',
                        `${rows.length + (isNew ? 1 : 0)} หลักสูตร`,
                        isNew ? `เดิม ${rows.length} + หลักสูตรใหม่ 1` : '',
                      ],
                      [
                        `ส่วนแบ่งของ${targetLabel}`,
                        target ? `${fmtB(target.after)} บาท` : '—',
                        target
                          ? `ตามชีต ${fmtB(target.before)} · ผลต่าง ${fmtD(target.after - target.before)}`
                          : '',
                      ],
                    ] as const
                  ).map(([label, value, note]) => (
                    <Grid key={label} size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover', height: '100%' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {label}
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                          {value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {note}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}

              {isNew && !hasRef && (
                <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                  ไม่มีหลักสูตรอ้างอิง — ต้นทุนคงที่ที่กรอกในตารางถือเป็นต้นทุนตรงของหลักสูตร
                  ระบบบวกส่วนแบ่งส่วนกลางคณะให้ตามวิธีที่คณะล็อกไว้
                </Alert>
              )}

              {target && pool > 0 && (
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
                  <Typography variant="body2">
                    {targetLabel} มีนิสิต <b>{fmtB(targetQ)} คน</b>
                  </Typography>
                  <Typography variant="body2">
                    ได้สัดส่วน{' '}
                    <b>
                      {((target.after / pool) * 100).toLocaleString('th-TH', {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </b>{' '}
                    ของก้อนส่วนกลางคณะ
                  </Typography>
                </Box>
              )}

              {errors.map((i) => (
                <Alert key={i.code} severity="error" sx={{ mb: 2 }}>
                  {i.message}
                  {i.refs?.length ? ` — ${i.refs.join(', ')}` : ''}
                </Alert>
              ))}
              {blocked && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  วิธีที่คณะล็อกไว้ใช้กับกรณีนี้ไม่ได้
                  {isNew && choice.method === 'CUSTOM_PCT' && choice.bucketLevel === 'PROGRAM'
                    ? ' (คณะกำหนด % รายหลักสูตร จึงยังไม่มี % ของหลักสูตรใหม่)'
                    : ''}{' '}
                  — แจ้งผู้ดูแลคณะให้ปลดล็อกและปรับสัดส่วน หรือทำบันทึกขออนุมัติถึงกองแผนงาน
                  {!compact && ' · ยังบันทึกผลไม่ได้'}
                </Alert>
              )}
              {warnings.map((i) => (
                <Alert key={i.code} severity="warning" variant="outlined" sx={{ mb: 2 }}>
                  {i.message}
                </Alert>
              ))}

              {outcome?.applied && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<i className="ri-git-branch-line" />}
                    onClick={() => {
                      setPage(0);
                      setImpactOpen(true);
                    }}
                  >
                    {compact ? 'ผลกระทบต่อหลักสูตรอื่น' : 'ดูผลกระทบต่อหลักสูตรอื่นในคณะ'} (
                    {others.length})
                  </Button>
                  {compact ? (
                    <Tooltip title={`ส่วนกลางคณะที่ถูกนับรวมทุกหลักสูตร ${fmtB(counted)} บาท`}>
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        icon={<i className="ri-check-line" />}
                        label="ปันครบก้อนคณะ"
                      />
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      ส่วนกลางคณะที่ถูกนับรวมทุกหลักสูตร {fmtB(counted)} บาท = ก้อนของคณะพอดี
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Collapse>

      <Dialog
        open={impactOpen}
        onClose={() => setImpactOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={smallScreen}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 12 }}>
          <Box>
            <Typography variant="h5" component="span" display="block">
              ผลกระทบต่อหลักสูตรอื่นใน{faculty}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ALLOC_METHOD_LABEL[choice.method]} · {REVENUE_MODE_LABEL[mode]}
            </Typography>
          </Box>
          <IconButton
            aria-label="ปิด"
            onClick={() => setImpactOpen(false)}
            sx={{ position: 'absolute', insetInlineEnd: 16, insetBlockStart: 16 }}
          >
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ก้อนส่วนกลางคณะ <b>{fmtMillion(pool)} ลบ.</b> มีเท่าเดิม
            แต่ถูกแบ่งใหม่ให้ทุกหลักสูตรในคณะ — {howSplit(choice)}
            {isNew && ' · หลักสูตรใหม่เข้ามาแบ่งก้อนเดียวกัน หลักสูตรเดิมจึงได้ส่วนแบ่งลดลง'}
          </Typography>

          {others.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <ImpactStat
                icon="ri-arrow-up-line"
                color="error"
                label="หลักสูตรที่รับภาระเพิ่ม"
                value={`${impactSummary.up} หลักสูตร`}
              />
              <ImpactStat
                icon="ri-arrow-down-line"
                color="success"
                label="หลักสูตรที่ภาระลดลง"
                value={`${impactSummary.down} หลักสูตร`}
              />
              <ImpactStat
                icon="ri-error-warning-line"
                color="warning"
                label="เดิมคุ้มทุน → หลังแบ่งใหม่ไม่คุ้มทุน"
                value={`${impactSummary.flipped} หลักสูตร`}
              />
            </Box>
          )}

          {impact.length === 0 ? (
            <Alert severity="info">คณะนี้ไม่มีหลักสูตรอื่น</Alert>
          ) : (
            <>
              {smallScreen ? (
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {impact
                    .slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE)
                    .map((r) => (
                      <ImpactCard key={r.id} r={r} />
                    ))}
                </Box>
              ) : (
                <TableContainer
                  sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 1 }}
                >
                  <Table
                    size="small"
                    sx={{
                      minWidth: 900,
                      '& td': { py: 2 },
                      // เส้นแบ่งคอลัมน์สีอ่อน — เว้นขอบซ้ายสุดที่ TableContainer มีกรอบอยู่แล้ว
                      '& th, & td': { borderLeft: '1px solid var(--mui-palette-divider)' },
                      '& thead tr:first-of-type th:first-of-type, & tbody td:first-of-type': {
                        borderLeft: 0,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell rowSpan={2} sx={headSx}>
                          หลักสูตร
                        </TableCell>
                        <TableCell rowSpan={2} align="right" sx={headSx}>
                          นิสิตที่มีจริง
                          <Typography variant="caption" color="text.secondary" display="block">
                            คน · รวมทุกชั้นปี
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={3} align="center" sx={headSx}>
                          ส่วนแบ่งต้นทุนส่วนกลางคณะ (บาท/ปี)
                        </TableCell>
                        <TableCell colSpan={2} align="center" sx={headSx}>
                          ต้องมีนิสิตจึงคุ้มทุน (Q*)
                          <Typography variant="caption" color="text.secondary" display="block">
                            คน · รวมทุกชั้นปีในปีการศึกษาเดียว
                          </Typography>
                        </TableCell>
                        <TableCell rowSpan={2} sx={headSx}>
                          สถานะหลังแบ่งใหม่
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell align="right" sx={headSx}>
                          ตามชีต
                        </TableCell>
                        <TableCell align="right" sx={{ ...headSx, color: 'primary.main' }}>
                          ใหม่
                        </TableCell>
                        <TableCell align="right" sx={headSx}>
                          ผลต่าง
                        </TableCell>
                        <TableCell align="right" sx={headSx}>
                          เดิม
                        </TableCell>
                        <TableCell align="right" sx={{ ...headSx, color: 'primary.main' }}>
                          ใหม่
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {impact
                        .slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE)
                        .map((r) => (
                          <TableRow
                            key={r.id}
                            hover
                            sx={r.selected ? { bgcolor: 'primary.lightOpacity' } : undefined}
                          >
                            <TableCell sx={{ minWidth: 220 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: r.selected ? 700 : 500, color: 'text.primary' }}
                              >
                                {r.prog}
                                {r.selected && (
                                  <Chip
                                    size="small"
                                    color="primary"
                                    label="หลักสูตรที่เลือก"
                                    sx={{ ml: 1.5 }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {r.deg} · {r.lvl}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={numSx}>
                              {fmtB(r.q)}
                            </TableCell>
                            <TableCell align="right" sx={{ ...numSx, color: 'text.secondary' }}>
                              {fmtB(r.before)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ ...numSx, ...resultSx, fontWeight: 600, color: 'text.primary' }}
                            >
                              {fmtB(r.after)}
                            </TableCell>
                            <TableCell align="right">
                              <DiffChip d={r.after - r.before} />
                            </TableCell>
                            <TableCell align="right" sx={{ ...numSx, color: 'text.secondary' }}>
                              {fmtNeed(r.qBefore)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                ...numSx,
                                ...resultSx,
                                fontWeight: 600,
                                color: r.qAfter < 0 ? 'warning.main' : 'text.primary',
                              }}
                            >
                              {fmtNeed(r.qAfter)}
                            </TableCell>
                            <TableCell>
                              <ImpactStatus q={r.q} before={r.qBefore} after={r.qAfter} />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {impact.length > ROWS_PER_PAGE && (
                <TablePagination
                  component="div"
                  count={impact.length}
                  page={page}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[ROWS_PER_PAGE]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                  onPageChange={(_, p) => setPage(p)}
                />
              )}
              <Box
                component="ul"
                sx={{ m: 0, mt: 2, pl: 5, typography: 'caption', color: 'text.secondary' }}
              >
                <li>
                  <b>ผลต่าง</b> = ส่วนแบ่งใหม่ − ส่วนแบ่งตามชีต · ลูกศรขึ้นสีแดง = ต้องรับภาระเพิ่ม
                  · ลูกศรลงสีเขียว = ภาระลดลง
                </li>
                <li>
                  <b>ต้องมีนิสิต</b> = จำนวนนิสิตอย่างน้อยที่ต้องมีจึงจะคุ้มทุน
                  นับรวมทุกชั้นปีที่กำลังเรียนอยู่ในปีการศึกษาเดียว (ไม่ใช่ยอดสะสมตลอดหลักสูตร 4 ปี)
                  เทียบกับต้นทุนต่อปี · <b>สถานะ</b> = เทียบกับนิสิตที่มีจริง
                </li>
                <li>เรียงจากหลักสูตรที่ส่วนแบ่งเปลี่ยนมากที่สุด</li>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setImpactOpen(false)}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default FixedCostAllocationCard;
