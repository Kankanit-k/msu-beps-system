'use client';

// React Imports
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { isUniversityLevel, lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';
import { RAW } from '@/data/mockup';

import { DD_PROGRAMS, lastValue, lossStreak, statusOfDD } from './deepDiveData';
import type { DDProgram, DDStatus } from './deepDiveData';

/** ตัวกรองสถานะ — loss = ขาดทุนปีล่าสุด (ไม่คุ้มทุน) */
export type StatusFilter = 'all' | 'ok' | 'loss' | DDStatus;

export const STATUS_FILTER_LABEL: Record<Exclude<StatusFilter, 'nodata'>, string> = {
  all: 'ทุกสถานะ',
  ok: 'คุ้มทุน',
  loss: 'ไม่คุ้มทุน (ปีล่าสุด)',
  watch: 'เฝ้าระวัง',
  crisis: 'วิกฤต',
};

export const ALL_FACS = '';
export const FAC_NAMES = RAW.FACS.map((f) => f.name);

export type DDRow = DDProgram & { status: DDStatus; streak: number };

type Ctx = {
  canPick: boolean;
  /** '' = ทุกคณะ (เฉพาะระดับมหาวิทยาลัย) */
  fac: string;
  setFac: (v: string) => void;
  /** ระดับที่มีในขอบเขต — ห้ามรวมระดับในกราฟ/ตารางเดียวกัน */
  levels: { lvl: string; n: number }[];
  level: string;
  setLevel: (v: string) => void;
  status: StatusFilter;
  setStatus: (v: StatusFilter) => void;
  mode: RevenueMode;
  setMode: (v: RevenueMode) => void;
  search: string;
  setSearch: (v: string) => void;
  /** หลักสูตรในขอบเขต (คณะ + ระดับ) ก่อนกรองสถานะ/ค้นหา */
  scope: DDRow[];
  /** หลังกรองทุกตัว — ใช้กับกราฟและตาราง */
  rows: DDRow[];
  /** ไปหน้าอื่นในหมวดพร้อมค้นหาหลักสูตรนั้น */
  focus: (x: DDProgram) => void;
  /** หลักสูตรที่เจาะอยู่ (null = ไม่ได้เจาะ) */
  focused: DDRow | null;
  /** เลิกเจาะ — คืนคณะ/ระดับ/สถานะ/คำค้นหาก่อนกด */
  unfocus: () => void;
  /** เปิดหน้าอื่นในหมวด (path เช่น /deep-dive/cost) พร้อมกรองหลักสูตร/สถานะ */
  go: (path: string, x?: DDProgram, status?: StatusFilter) => void;
};

const C = createContext<Ctx | null>(null);

export const useDeepDive = () => {
  const v = useContext(C);

  if (!v) throw new Error('useDeepDive ต้องอยู่ใน DeepDiveProvider');

  return v;
};

const STATUS_VALUES: StatusFilter[] = ['all', 'ok', 'loss', 'watch', 'crisis'];

// คุ้มทุน/ไม่คุ้มทุน แบ่งตามปีล่าสุดเท่านั้น (สองชิปนี้รวมกัน = ทุกหลักสูตรที่มีข้อมูล) · เฝ้าระวัง/วิกฤต ดูแนวโน้ม
const matchStatus = (r: DDRow, s: StatusFilter) =>
  s === 'all' ||
  (s === 'loss'
    ? r.streak > 0
    : s === 'ok'
      ? r.streak === 0 && lastValue(r.profit.with_government) !== null
      : r.status === s);

/**
 * ตัวกรองร่วมของหมวดเจาะลึก (คณะ · ระดับ · สถานะ · ฐานรายได้ · ค้นหา) — layout ถือไว้ จึงไม่หายเมื่อสลับหน้า
 * ค่าที่เลือกเขียนลง URL · ระดับคณะ/อาจารย์ถูกล็อกที่คณะตน (กรองที่ข้อมูล ไม่ใช่แค่ซ่อนตัวเลือก)
 */
export const DeepDiveProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { role, scope: roleScope } = useRole();
  const canPick = isUniversityLevel(role);
  const locked = lockedFacultyFor(role, roleScope);

  const [pickedFac, setPickedFac] = useState(ALL_FACS);
  const [pickedLevel, setLevel] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [search, setSearchText] = useState('');
  /** เจาะจากกราฟ/บทวิเคราะห์ = หลักสูตรเดียวตรงตัว (ชื่อหลักสูตรอาจเป็นส่วนหนึ่งของชื่ออื่น) */
  const [focusKey, setFocusKey] = useState<string | null>(null);

  /** ตัวกรองก่อนเจาะ — ไว้คืนค่าเมื่อกด "แสดงทั้งหมด" */
  const beforeFocus = useRef<{ fac: string; level: string; status: StatusFilter; search: string } | null>(null);

  const setSearch = (v: string) => {
    setFocusKey(null);
    setSearchText(v);
  };
  const [urlRead, setUrlRead] = useState(false);
  const router = useRouter();
  // ระหว่างเปลี่ยนหน้า ห้ามเขียน URL ทับด้วย path เดิม (replaceState จะดึง router กลับหน้าเก่า)
  const navTarget = useRef<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fac = q.get('fac');
    const st = q.get('status') as StatusFilter | null;

    if (fac && FAC_NAMES.includes(fac)) setPickedFac(fac);
    if (q.get('lvl')) setLevel(q.get('lvl')!);
    if (st && STATUS_VALUES.includes(st)) setStatus(st);
    if (q.get('mode') === 'own') setMode('without_government');
    if (q.get('q')) setSearch(q.get('q')!);
    setUrlRead(true);
  }, []);

  // ระดับคณะไม่มีคณะในขอบเขต → ไม่เห็นข้อมูลใดเลย (RoleGuard จะถามคณะก่อนอยู่แล้ว)
  const fac = canPick ? pickedFac : (locked ?? '\u0000');

  const inFac = useMemo<DDRow[]>(
    () =>
      DD_PROGRAMS.filter((x) => fac === ALL_FACS || x.p.fac === fac).map((x) => ({
        ...x,
        status: statusOfDD(x, mode),
        streak: lossStreak(x.profit[mode]),
      })),
    [fac, mode],
  );

  const levels = useMemo(() => {
    const m = new Map<string, number>();

    inFac.forEach((x) => m.set(x.p.lvl, (m.get(x.p.lvl) ?? 0) + 1));

    return [...m].map(([lvl, n]) => ({ lvl, n }));
  }, [inFac]);

  const level = levels.some((l) => l.lvl === pickedLevel) ? pickedLevel : (levels[0]?.lvl ?? '');

  const scope = useMemo(() => inFac.filter((x) => x.p.lvl === level), [inFac, level]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();

    if (focusKey) return scope.filter((x) => x.key === focusKey);

    return scope.filter(
      (x) =>
        matchStatus(x, status) &&
        (!s || `${x.p.prog} ${x.p.deg} ${x.p.fac}`.toLowerCase().includes(s)),
    );
  }, [scope, status, search, focusKey]);

  useEffect(() => {
    if (!urlRead) return;
    if (navTarget.current) {
      if (pathname.replace(/\/$/, '') !== navTarget.current) return;
      navTarget.current = null;
    }
    const q = new URLSearchParams();

    if (canPick && pickedFac) q.set('fac', pickedFac);
    if (level) q.set('lvl', level);
    if (status !== 'all') q.set('status', status);
    if (mode === 'without_government') q.set('mode', 'own');
    if (search) q.set('q', search);
    const qs = q.toString();

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}`,
    );
  }, [urlRead, pathname, canPick, pickedFac, level, status, mode, search]);

  const focus = (x: DDProgram) => {
    if (!focusKey) beforeFocus.current = { fac: pickedFac, level: pickedLevel, status, search };
    if (canPick) setPickedFac(x.p.fac);
    setLevel(x.p.lvl);
    setStatus('all');
    setSearchText(x.p.prog);
    setFocusKey(x.key);
  };

  const value: Ctx = {
    canPick,
    fac: canPick ? pickedFac : (locked ?? ''),
    setFac: (v) => {
      setPickedFac(v);
      setLevel('');
    },
    levels,
    level,
    setLevel,
    status,
    setStatus: (v) => {
      setFocusKey(null);
      setStatus(v);
    },
    mode,
    setMode,
    search,
    setSearch,
    scope,
    rows,
    focus,
    focused: focusKey ? (rows.find((x) => x.key === focusKey) ?? null) : null,
    unfocus: () => {
      const b = beforeFocus.current;

      setFocusKey(null);
      setSearchText(b?.search ?? '');
      if (b) {
        if (canPick) setPickedFac(b.fac);
        setLevel(b.level);
        setStatus(b.status);
      }
      beforeFocus.current = null;
    },
    go: (path, x, st) => {
      if (x) focus(x);
      // ไปจากการ์ด (ไม่ระบุหลักสูตร) → ล้างคำค้นหาค้างจากการเจาะครั้งก่อน
      else setSearch('');
      if (st) {
        setFocusKey(null);
        setStatus(st);
      }
      navTarget.current = path.replace(/\/$/, '');
      router.push(`${navTarget.current}/`);
    },
  };

  return <C.Provider value={value}>{children}</C.Provider>;
};
