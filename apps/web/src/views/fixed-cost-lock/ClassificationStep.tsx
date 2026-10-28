'use client';

/**
 * ขั้นจำแนกต้นทุนคงที่/ผันแปรของคณะ (มติ "ตั้งค่าต้นทุน.pdf" ขั้นที่ 1–2 · PLAN-2026-10-27-cost-config CC-2)
 *
 * - รายการมาจาก fetchExpenseAccounts (เฉพาะที่คณะมีในงบ Oracle 2568 · กติกาตั้งต้นจาก Excel) จัดกลุ่มตามหมวดรายจ่าย
 * - เก็บรายคีย์ 4 ระดับ (ตรงกับ Excel) · ปุ่ม "ใช้กับทุกแผนงาน" ตั้งรายการเดียวกันต่างแผนงานให้เท่ากันในคลิกเดียว
 * - ค่าตั้งต้น = กติกามหาวิทยาลัย (account-rules ที่อนุมัติ → Excel)
 * - ลำดับตามที่ประชุม (28 ต.ค.): เลือกประเภท คงที่ / ผันแปร / ผสม → เลือก "ผสม" แล้วช่อง % โผล่เป็นแถวย่อยใต้รายการ
 *   · ตัวกรอง "ผสม" รวมรายการผสมทุกหมวดให้ทบทวนก่อนบันทึก
 * - ร่างเก็บในเบราว์เซอร์ · บันทึกแล้วมีผลเป็นนโยบายคณะปีนั้น · ล็อกพร้อมวิธีปันส่วนเมื่อยืนยันเอกสารฉบับจริง
 */
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import NumberTextField from '@components/NumberTextField';
import { BEH, type AccountRule, type Behavior } from '@views/account-rules/data';
import { fetchExpenseAccounts, type ExpenseAccount } from '@views/account-rules/expenseSource';
import { effectiveRule, recordKey, useRuleStore } from '@views/account-rules/ruleStore';

import {
  clearClassification,
  saveClassification,
  useFacultyClassification,
  type ClassRow,
} from './classStore';
import { fmtLockedAt } from './lockStore';

type Rows = Record<string, ClassRow>;
type Filter = 'all' | 'changed' | 'mixed' | 'unclassified';

/** ตัวเลือกตามมติ 3 แบบ — "ยังไม่จำแนก" แสดงเป็นสถานะของค่าตั้งต้นเท่านั้น เลือกเองไม่ได้ */
const CHOICES: Behavior[] = ['TFC', 'TVC', 'MIXED'];
const CHOICE_LABEL: Partial<Record<Behavior, string>> = {
  TFC: 'คงที่',
  TVC: 'ผันแปร',
  MIXED: 'ผสม',
};

const fmtM = (n: number) =>
  n !== 0 && Math.abs(n) < 50_000
    ? '<0.1'
    : (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 });

const toRow = (r: Pick<AccountRule, 'beh' | 'f'>): ClassRow => ({ beh: r.beh, f: r.f });
const sameRow = (a: ClassRow, b: ClassRow) => a.beh === b.beh && (a.beh !== 'MIXED' || a.f === b.f);
const rowText = (r: ClassRow) =>
  r.beh === 'MIXED'
    ? `ผสม ${Math.round(r.f * 100)}:${100 - Math.round(r.f * 100)}`
    : (CHOICE_LABEL[r.beh] ?? BEH[r.beh].label);
const pctError = (r: ClassRow) =>
  r.beh === 'MIXED' && (r.f < 0.01 || r.f > 0.99) ? 'คงที่ 1–99%' : null;

/** เทียบชุดรายการที่ต่างจากค่าตั้งต้น 2 ชุด */
const sameRows = (a: Rows, b: Rows) => {
  const ka = Object.keys(a);

  return ka.length === Object.keys(b).length && ka.every((k) => b[k] && sameRow(a[k]!, b[k]));
};

const draftKey = (year: string, fac: string) => `beps:faculty-classification-draft:${year}|${fac}`;

const readDraft = (year: string, fac: string): Rows | null => {
  try {
    const raw = window.localStorage.getItem(draftKey(year, fac));

    return raw ? (JSON.parse(raw) as Rows) : null;
  } catch {
    return null;
  }
};

const writeDraft = (year: string, fac: string, rows: Rows | null) => {
  try {
    if (rows) window.localStorage.setItem(draftKey(year, fac), JSON.stringify(rows));
    else window.localStorage.removeItem(draftKey(year, fac));
  } catch {
    // ร่างเป็นแค่ตัวช่วย — บันทึกไม่ได้ก็ยังแก้ต่อได้
  }
};

interface Props {
  id: string;
  /** หัวการ์ดขั้นตอน (StepHeader ของหน้าตั้งค่า) */
  header: ReactNode;
  year: string;
  fac: string;
  /** ล็อกจากการยืนยันเอกสารฉบับจริงแล้ว */
  locked: boolean;
  savedBy: string;
  onToast: (t: { msg: string; ok: boolean }) => void;
}

const ClassificationStep = ({
  id,
  header,
  year,
  fac,
  locked,
  savedBy,
  onToast,
}: Props) => {
  const [accounts, setAccounts] = useState<ExpenseAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [byOracle, setByOracle] = useState(false);
  const { store: uniRules } = useRuleStore();
  const { config, effective, ready } = useFacultyClassification(year, fac);

  const [draft, setDraft] = useState<Rows>({});
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  useEffect(() => {
    let alive = true;

    setAccounts(null);
    setLoadError(false);
    fetchExpenseAccounts(Number(year), fac)
      .then((r) => {
        if (!alive) return;
        setAccounts(r.accounts);
        setByOracle(r.filtered);
      })
      .catch(() => alive && setLoadError(true));

    return () => {
      alive = false;
    };
  }, [year, fac]);

  /** ค่าตั้งต้นมหาวิทยาลัยรายบัญชี (อนุมัติแล้ว → Excel) */
  const baseline = useMemo(() => {
    const m = new Map<string, ClassRow>();

    accounts?.forEach((a) =>
      m.set(a.key, toRow(effectiveRule(a.sheetRule, uniRules[recordKey(a.key, Number(year))]))),
    );

    return m;
  }, [accounts, uniRules, year]);

  /** ค่าที่มีผลอยู่ตอนนี้ (ก่อนแก้) */
  const current = effective?.rows ?? {};

  // เปลี่ยนคณะ/ที่เก็บเปลี่ยน → ร่างที่ค้างไว้ ไม่มีก็เริ่มจากค่าที่มีผลอยู่
  useEffect(() => {
    if (!ready) return;
    setDraft((locked ? null : readDraft(year, fac)) ?? effective?.rows ?? {});
  }, [ready, year, fac, effective, locked]);

  /** ตัดรายการที่เท่ากับค่าตั้งต้นออก — ค่าตั้งต้นของมหาวิทยาลัยเปลี่ยนภายหลังแล้วรายการที่เคยต่างอาจกลับมาเท่ากัน */
  const prune = useCallback(
    (rows: Rows): Rows =>
      baseline.size
        ? Object.fromEntries(
            Object.entries(rows).filter(([k, v]) => {
              const b = baseline.get(k);

              return !b || !sameRow(v, b);
            }),
          )
        : rows,
    [baseline],
  );
  const diff = useMemo(() => prune(draft), [prune, draft]);
  const dirty = !sameRows(diff, prune(current));

  // ออกจากหน้า/ปิดแท็บโดยยังไม่บันทึก → เบราว์เซอร์ถามก่อน
  useEffect(() => {
    if (!dirty || locked) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();

    window.addEventListener('beforeunload', h);

    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, locked]);

  const valueOf = (key: string): ClassRow =>
    draft[key] ?? baseline.get(key) ?? { beh: 'UNCLASSIFIED', f: 0 };

  const commit = (next: Rows) => {
    setDraft(next);
    writeDraft(year, fac, sameRows(next, current) ? null : next);
  };

  /** ตั้งค่ารายการ — เท่ากับค่าตั้งต้นแล้วไม่เก็บ (เก็บเฉพาะที่ต่าง) */
  const setRows = (keys: string[], fn: (cur: ClassRow) => ClassRow) => {
    if (locked) return;
    const next = { ...draft };

    keys.forEach((k) => {
      const v = fn(valueOf(k));
      const base = baseline.get(k);

      if (base && sameRow(v, base)) delete next[k];
      else next[k] = v;
    });
    commit(next);
  };

  const pick = (keys: string[], beh: Behavior) =>
    setRows(keys, (cur) => ({
      beh,
      f: beh === 'TFC' ? 1 : beh === 'TVC' ? 0 : cur.beh === 'MIXED' ? cur.f : 0.5,
    }));

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const m = new Map<string, ExpenseAccount[]>();

    accounts
      ?.filter((a) => !term || a.name.toLowerCase().includes(term) || a.key.includes(term))
      .filter((a) => {
        const v = draft[a.key] ?? baseline.get(a.key);

        return filter === 'all'
          ? true
          : filter === 'changed'
            ? !!diff[a.key]
            : filter === 'mixed'
              ? v?.beh === 'MIXED'
              : v?.beh === 'UNCLASSIFIED';
      })
      .forEach((a) => m.set(a.group, [...(m.get(a.group) ?? []), a]));

    return [...m.entries()];
  }, [accounts, q, filter, draft, baseline]);

  const changedCount = Object.keys(diff).length;
  /** รายการทั้งหมวด (ไม่ขึ้นกับคำค้น) — ปุ่ม "ตั้งทั้งหมวด" ใช้กับทุกรายการในหมวด */
  const groupKeys = useMemo(() => {
    const m = new Map<string, string[]>();

    accounts?.forEach((a) => m.set(a.group, [...(m.get(a.group) ?? []), a.key]));

    return m;
  }, [accounts]);
  /** รายการเดียวกัน (หมวดรายจ่าย|หมวดย่อย) ทุกแผนงาน */
  const subKeys = useMemo(() => {
    const m = new Map<string, string[]>();

    accounts?.forEach((a) => m.set(a.sub, [...(m.get(a.sub) ?? []), a.key]));

    return m;
  }, [accounts]);
  const unclassified = accounts?.filter((a) => valueOf(a.key).beh === 'UNCLASSIFIED').length ?? 0;
  const invalid = Object.values(draft).some((r) => pctError(r));
  /** รายการผสม (รวมที่ค่าตั้งต้นเป็นผสม) — ตัวกรอง "ผสม" ใช้ทบทวน % ก่อนบันทึก */
  const mixed = accounts?.filter((a) => valueOf(a.key).beh === 'MIXED') ?? [];
  const expandAll = q.trim() !== '' || filter !== 'all';

  const toggle = (g: string) =>
    setOpen((s) => {
      const n = new Set(s);

      if (n.has(g)) n.delete(g);
      else n.add(g);

      return n;
    });

  const save = () => {
    if (invalid) {
      onToast({
        msg: 'บันทึกไม่ได้ — มีรายการผสมที่สัดส่วนคงที่ไม่อยู่ระหว่าง 1–99% (ดูได้ที่ตัวกรอง "ผสม")',
        ok: false,
      });

      return;
    }

    if (!saveClassification(year, fac, diff, savedBy)) {
      onToast({
        msg: locked
          ? 'บันทึกไม่ได้ — ปีนี้ล็อกแล้วจากการยืนยันเอกสาร ต้องทำบันทึกขออนุมัติถึงกองแผนงาน'
          : 'บันทึกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล',
        ok: false,
      });

      return;
    }

    writeDraft(year, fac, null);
    onToast({
      msg: `บันทึกการจำแนกต้นทุนของ${fac} ปี ${year} แล้ว — ต่างจากค่าตั้งต้น ${changedCount} รายการ${
        unclassified ? ` · ยังไม่จำแนก ${unclassified} รายการ (ดูได้ที่ตัวกรอง "ยังไม่จำแนก")` : ''
      }`,
      ok: true,
    });
  };

  const runConfirm = () => {
    if (confirm === 'reset') {
      commit({});
      onToast({ msg: 'คืนค่าตั้งต้นทุกรายการในร่างแล้ว — กดบันทึกเพื่อให้มีผล', ok: true });
    } else if (confirm === 'clear') {
      writeDraft(year, fac, null);
      onToast(
        clearClassification(year, fac)
          ? {
              msg: `ล้างการจำแนกปี ${year} แล้ว — กลับไปใช้ค่าปีก่อนหน้า หรือค่าตั้งต้นมหาวิทยาลัย`,
              ok: true,
            }
          : { msg: 'ล้างไม่ได้ — ปีนี้ล็อกแล้ว หรือเบราว์เซอร์ไม่อนุญาตให้บันทึก', ok: false },
      );
    }

    setConfirm(null);
  };

  return (
    <>
    <Card id={id} sx={{ scrollMarginTop: 80 }}>
      {header}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {ready && effective && (
          <Alert
            severity={locked ? 'info' : config ? 'success' : 'info'}
            icon={<i className={locked ? 'ri-lock-line' : 'ri-information-line'} />}
          >
            <AlertTitle>
              {locked
                ? '🔒 ล็อกแล้ว — ใช้ค่าที่บันทึกไว้'
                : config
                  ? `คณะตั้งค่าปี ${year} แล้ว`
                  : effective.source === 'prev-year'
                    ? `ยังไม่ได้ตั้งค่าปี ${year} — ใช้ค่าปี ${effective.fromYear}`
                    : `ยังไม่ได้ตั้งค่าปี ${year} — ใช้ค่าตั้งต้นของมหาวิทยาลัย (Excel)`}
            </AlertTitle>
            {config && `บันทึกเมื่อ ${fmtLockedAt(config.savedAt)} โดย ${config.savedBy} · `}
            ทุกหลักสูตรใน{fac}ใช้การจำแนกชุดนี้ · ค่าตั้งต้นมาจากกติกาผังบัญชีของมหาวิทยาลัย
            {locked && ' · แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน'}
          </Alert>
        )}
        <Alert severity="warning" icon={<i className="ri-error-warning-line" />}>
          ตอนนี้การจำแนกนี้<b>ยังไม่มีผลกับตัวเลข</b> — ระบบยังใช้ต้นทุนคงที่/ผันแปรตามชีต
          จนกว่าจะนำเข้างบรายบรรทัดแยกคณะ (แผน AR-1/AR-2) · ยอดเงินในตารางเป็นวงเงินทั้งมหาวิทยาลัย
          ใช้ดูขนาดของรายการเท่านั้น
        </Alert>

        {loadError ? (
          <Alert severity="error">โหลดรายการหมวดรายจ่ายไม่สำเร็จ — รีเฟรชหน้าแล้วลองใหม่</Alert>
        ) : !accounts || !ready ? (
          <Box display="flex" alignItems="center" gap={2} py={6} justifyContent="center">
            <CircularProgress size={24} />
            <Typography color="text.secondary">กำลังโหลดรายการหมวดรายจ่าย…</Typography>
          </Box>
        ) : (
          <>
            <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
              <TextField
                size="small"
                label="ค้นหารายการ"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260 } }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filter}
                onChange={(_, v: Filter | null) => v && setFilter(v)}
              >
                <ToggleButton value="all">ทั้งหมด ({accounts.length})</ToggleButton>
                <ToggleButton value="changed">ต่างจากค่าตั้งต้น ({changedCount})</ToggleButton>
                <ToggleButton value="mixed">ผสม ({mixed.length})</ToggleButton>
                <ToggleButton value="unclassified">ยังไม่จำแนก ({unclassified})</ToggleButton>
              </ToggleButtonGroup>
              <Box flexGrow={1} />
              {/* ค้นหา/กรองอยู่ = ขยายทุกหมวดที่มีผลให้อัตโนมัติ */}
              {!expandAll && (
                <Button
                  size="small"
                  onClick={() => setOpen(open.size ? new Set() : new Set(groups.map(([g]) => g)))}
                >
                  {open.size ? 'ยุบทุกหมวด' : 'ขยายทุกหมวด'}
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" mt={-2}>
              {byOracle
                ? `แสดงเฉพาะ ${accounts.length} รายการที่${fac}มีในงบปี 2568 (Oracle PPLN_BUDGET) รวมค่าเสื่อมราคา`
                : `ไม่พบข้อมูลงบ Oracle ของ${fac} — แสดงทุกรายการในผังบัญชี`}
            </Typography>

            {groups.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography fontSize={32}>🔍</Typography>
                <Typography fontWeight={600}>ไม่พบรายการที่ตรงกับตัวกรอง</Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setQ('');
                    setFilter('all');
                  }}
                >
                  ล้างตัวกรอง
                </Button>
              </Box>
            ) : (
              <Box border={1} borderColor="divider" borderRadius={1}>
                {groups.map(([g, list]) => {
                  const keys = groupKeys.get(g) ?? list.map((a) => a.key);
                  const changed = keys.filter((k) => diff[k]).length;
                  const isOpen = expandAll || open.has(g);

                  return (
                    <Box
                      key={g}
                      borderBottom={1}
                      borderColor="divider"
                      sx={{ '&:last-of-type': { borderBottom: 0 } }}
                    >
                      <Box
                        display="flex"
                        flexWrap="wrap"
                        alignItems="center"
                        gap={2}
                        px={3}
                        py={2}
                        bgcolor="action.hover"
                      >
                        <Box
                          role="button"
                          tabIndex={0}
                          onClick={() => toggle(g)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(g)}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ cursor: 'pointer', flexGrow: 1, minWidth: 200 }}
                        >
                          <i
                            className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}
                          />
                          <Typography fontWeight={700}>{g}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            · {list.length} รายการ
                          </Typography>
                          {changed > 0 && (
                            <Chip
                              size="small"
                              color="warning"
                              variant="tonal"
                              label={`ปรับ ${changed}`}
                            />
                          )}
                        </Box>
                        {!locked && (
                          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              ตั้งทั้งหมวด:
                            </Typography>
                            {CHOICES.map((c) => (
                              <Button
                                key={c}
                                size="small"
                                variant="outlined"
                                onClick={() => pick(keys, c)}
                              >
                                {CHOICE_LABEL[c]}
                              </Button>
                            ))}
                            <Button
                              size="small"
                              color="secondary"
                              disabled={!changed}
                              onClick={() =>
                                commit(
                                  Object.fromEntries(
                                    Object.entries(draft).filter(([k]) => !keys.includes(k)),
                                  ),
                                )
                              }
                            >
                              คืนค่าตั้งต้น
                            </Button>
                          </Box>
                        )}
                      </Box>
                      <Collapse in={isOpen} unmountOnExit>
                        {list.map((a) => {
                          const v = valueOf(a.key);
                          const base = baseline.get(a.key)!;
                          const isChanged = !!diff[a.key];
                          const err = pctError(v);
                          const siblings = subKeys.get(a.sub) ?? [];

                          return (
                            <Fragment key={a.key}>
                            <Box
                              display="flex"
                              flexWrap="wrap"
                              alignItems="center"
                              gap={2}
                              px={3}
                              py={2}
                              borderTop={1}
                              borderColor="divider"
                              bgcolor={isChanged ? 'warning.lighterOpacity' : undefined}
                            >
                              <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
                                <Typography fontWeight={600}>{a.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  <code>{a.key}</code> · วงเงินทั้ง ม. {fmtM(a.amount)} ลบ. ·
                                  ค่าตั้งต้น {rowText(base)}
                                </Typography>
                              </Box>
                              {base.beh === 'UNCLASSIFIED' && !isChanged && (
                                <Chip
                                  size="small"
                                  color="error"
                                  variant="tonal"
                                  label="ยังไม่จำแนก — โปรดเลือก"
                                />
                              )}
                              <ToggleButtonGroup
                                size="small"
                                exclusive
                                disabled={locked}
                                value={v.beh}
                                onChange={(_, b: Behavior | null) => b && pick([a.key], b)}
                              >
                                {CHOICES.map((c) => (
                                  <ToggleButton key={c} value={c} sx={{ whiteSpace: 'nowrap' }}>
                                    {CHOICE_LABEL[c]}
                                  </ToggleButton>
                                ))}
                              </ToggleButtonGroup>
                              {/* ช่องกว้างคงที่ ให้ปุ่มเลือกของทุกแถวตรงกัน */}
                              {!locked && (
                                <Box width={170}>
                                  {siblings.length > 1 && (
                                    <Tooltip title="ตั้งรายการนี้ทุกแผนงานให้เป็นค่าเดียวกับแถวนี้">
                                      <span>
                                        <Button
                                          size="small"
                                          disabled={siblings.every((k) => sameRow(valueOf(k), v))}
                                          onClick={() => setRows(siblings, () => v)}
                                        >
                                          ใช้กับทุกแผนงาน ({siblings.length})
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                </Box>
                              )}
                              <Box width={36}>
                                {isChanged && !locked && (
                                  <Tooltip title={`คืนค่าตั้งต้น (${rowText(base)})`}>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        const next = { ...draft };

                                        delete next[a.key];
                                        commit(next);
                                      }}
                                    >
                                      <i className="ri-arrow-go-back-line" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                            {/* เลือก "ผสม" แล้วช่อง % โผล่ใต้รายการนั้นเลย */}
                            {v.beh === 'MIXED' && (
                              <Box
                                display="flex"
                                flexWrap="wrap"
                                alignItems="center"
                                gap={2}
                                pl={8}
                                pr={3}
                                pb={2}
                                bgcolor={isChanged ? 'warning.lighterOpacity' : undefined}
                              >
                                <Box component="i" className="ri-corner-down-right-line" color="text.disabled" />
                                <Typography variant="body2" color="text.secondary">
                                  สัดส่วน:
                                </Typography>
                                <NumberTextField
                                  size="small"
                                  label="คงที่ %"
                                  disabled={locked}
                                  value={Math.round(v.f * 100)}
                                  onChange={(n) =>
                                    setRows([a.key], () => ({ beh: 'MIXED', f: Math.min(n, 100) / 100 }))
                                  }
                                  error={!!err}
                                  helperText={err ?? undefined}
                                  sx={{ width: 110 }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  ผันแปร {100 - Math.round(v.f * 100)}%
                                </Typography>
                              </Box>
                            )}
                            </Fragment>
                          );
                        })}
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            )}

            <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                ต่างจากค่าตั้งต้น <b>{changedCount}</b> รายการ · ผสม <b>{mixed.length}</b> รายการ ·
                ยังไม่จำแนก <b>{unclassified}</b> รายการ
                {dirty && !locked && ' · มีการแก้ที่ยังไม่บันทึก (เก็บเป็นร่างไว้แล้ว)'}
              </Typography>
              {!locked && (
                <>
                  <Button
                    color="secondary"
                    disabled={!changedCount}
                    onClick={() => setConfirm('reset')}
                  >
                    คืนค่าตั้งต้นทั้งหมด
                  </Button>
                  <Button
                    color="secondary"
                    disabled={!dirty}
                    onClick={() => {
                      writeDraft(year, fac, null);
                      setDraft(current);
                    }}
                  >
                    ล้างร่าง
                  </Button>
                  {config && (
                    <Button color="error" onClick={() => setConfirm('clear')}>
                      ล้างการตั้งค่าปีนี้
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    disabled={!dirty && !!config}
                    onClick={save}
                    startIcon={<i className="ri-save-line" />}
                  >
                    บันทึกการจำแนก
                  </Button>
                </>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {confirm === 'reset' ? 'คืนค่าตั้งต้นทุกรายการ?' : `ล้างการจำแนกปี ${year}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'reset'
              ? `รายการที่ปรับไว้ ${changedCount} รายการจะกลับเป็นค่าตั้งต้นของมหาวิทยาลัยในร่าง — ยังไม่มีผลจนกว่าจะกดบันทึก`
              : `${fac}จะกลับไปใช้ค่าปีก่อนหน้า หรือค่าตั้งต้นของมหาวิทยาลัย · ย้อนกลับไม่ได้`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color={confirm === 'clear' ? 'error' : 'primary'}
            onClick={runConfirm}
          >
            {confirm === 'reset' ? 'คืนค่าตั้งต้น' : 'ล้างการตั้งค่า'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClassificationStep;
