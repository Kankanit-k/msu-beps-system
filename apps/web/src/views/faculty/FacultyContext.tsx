'use client';

// React Imports
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine';

// Component Imports
import { MOCK_RUN } from '@components/PageHeaderBar';
import { loadDashFilter, saveDashFilter } from '@components/dashboardFilters';
import { isUniversityLevel, lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { FacRow, ProgRow } from '@/data/mockup';
import { computeBreakEven, levelRank, sheetQStar, sumRows } from '@views/breakeven/calc';
import { progKey, progName } from '@views/cross/crossData';
import type { AfterResult } from '@views/cross/CrossPanels';
import { useFacultyLock } from '@views/fixed-cost-lock/lockStore';
import type { FacultyLock } from '@views/fixed-cost-lock/lockStore';
import { loadHistory } from '@views/scenario-program/historyStore';
import { isSubmitted } from '@views/scenario-program/types';
import { progOptionLabel } from '@views/scenario-program/programData';

import ProgramDialog from './ProgramDialog';
import type { DetailTab } from './ProgramDialog';

export const FAC_NAMES = RAW.FACS.map((f) => f.name);

/** ตัวเลือก "ทุกระดับ" ของช่องระดับการศึกษา — ใช้หลักสูตรทุกระดับของคณะ (ค่าเริ่มต้น · ตรงกับภาพรวมมหาวิทยาลัย) */
export const ALL_LEVELS = 'ทุกระดับ';

export type ProgStat = {
  p: ProgRow;
  key: string;
  label: string;
  /** จุดคุ้มทุนแบบชีต — ติดลบ = รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ไม่มีจุดคุ้มทุน) */
  qStarGov: number;
  qStarOwn: number;
};

export type LevelOption = { lvl: string; n: number; Q: number };

type FacultyCtx = {
  fac: FacRow;
  canPick: boolean;
  setFac: (name: string) => void;
  year: string;
  setYear: (y: string) => void;
  mode: RevenueMode;
  setMode: (m: RevenueMode) => void;
  /** ระดับการศึกษาที่มีหลักสูตรในคณะนี้ (ไม่รวมตัวเลือก ALL_LEVELS) */
  levels: LevelOption[];
  /** ระดับที่เลือก — ALL_LEVELS = ทุกระดับ */
  level: string;
  setLevel: (lvl: string) => void;
  /** หลักสูตรที่มีนิสิตทุกระดับ (ใช้เฉพาะตัวเลขรวมทั้งคณะ) */
  allProgs: ProgStat[];
  /** หลักสูตรของระดับที่เลือก (ทุกระดับ = allProgs) — ใช้กับกราฟและตารางทุกตัว */
  progs: ProgStat[];
  /** ผลทั้งคณะ (แถวคณะในชีต) */
  facRes: BreakEvenResult;
  /** ผลของระดับที่เลือก (ผลรวมหลักสูตรในระดับ · Q* = ผลบวกแบบชีต) */
  levelRes: BreakEvenResult;
  lock: FacultyLock | null;
  lockReady: boolean;
  /** ผลหลังปรับที่บันทึกในเบราว์เซอร์เครื่องนี้ (key = progKey) — ยืนยันแล้วก่อน ไม่มีจึงใช้ร่างล่าสุด · รอย้ายลงฐานข้อมูล */
  after: Map<string, AfterResult>;
  /** เปิดป๊อปอัปหลักสูตร · tab = แท็บที่เปิดก่อน (ค่าเริ่ม จุดคุ้มทุน) */
  openDetail: (key?: string, tab?: DetailTab) => void;
};

const Ctx = createContext<FacultyCtx | null>(null);

export const useFaculty = () => {
  const v = useContext(Ctx);

  if (!v) throw new Error('useFaculty ต้องอยู่ใน FacultyProvider');

  return v;
};

const toStat = (p: ProgRow): ProgStat => ({
  p,
  key: progKey(p),
  label: progName(p),
  qStarGov: sheetQStar(p, 'with_government'),
  qStarOwn: sheetQStar(p, 'without_government'),
});

/**
 * สถานะร่วมของภาพรวมคณะและหน้าย่อย — layout ของ /faculty ถือไว้ จึงไม่หายเมื่อสลับหน้า
 * ค่าที่เลือกเขียนลง URL (?fac=&lvl=&mode=) เพื่อแชร์ลิงก์/รีเฟรชแล้วได้หน้าเดิม
 */
export const FacultyProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { role, scope } = useRole();
  const canPick = isUniversityLevel(role);
  const lockedFac = lockedFacultyFor(role, scope);

  const [pickedFac, setPickedFac] = useState<string>(FAC_NAMES[0] ?? '');
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [pickedLevel, setLevel] = useState('');
  // ชุดข้อมูลมีเฉพาะปีงบล่าสุด — ปีอื่นแสดงไว้แต่เลือกไม่ได้จนกว่าจะนำเข้าข้อมูล
  const [year, setYear] = useState(MOCK_RUN.budgetYear);
  const [detail, setDetail] = useState<ProgRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('be');
  const [urlRead, setUrlRead] = useState(false);

  // อ่านค่าเริ่มจาก URL (เช่น ป็อปอัปอันดับคณะส่ง ?fac=ชื่อคณะ มา) · ไม่มีใน URL → ตัวกรองที่ค้างจากหน้า Dashboard อื่น
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const saved = loadDashFilter();
    const fac = q.get('fac') ?? (saved.facs?.length === 1 ? saved.facs[0] : null);
    const lvl = q.get('lvl') ?? saved.lvl;
    const own = q.has('mode') ? q.get('mode') === 'own' : saved.mode === 'without_government';

    if (fac && FAC_NAMES.includes(fac)) setPickedFac(fac);
    if (lvl) setLevel(lvl);
    if (own) setMode('without_government');
    if (saved.year) setYear(saved.year);
    setUrlRead(true);
  }, []);

  const facName = lockedFac ?? pickedFac;
  const fac = RAW.FACS.find((f) => f.name === facName) ?? RAW.FACS[0]!;
  const { lock, ready: lockReady } = useFacultyLock(year, fac.name);

  const allProgs = useMemo(
    () =>
      RAW.PROGS.filter((p) => p.fac === fac.name && p.Q > 0)
        .sort((a, b) => levelRank(a.lvl) - levelRank(b.lvl) || b.Q - a.Q)
        .map(toStat),
    [fac.name],
  );

  const levels = useMemo<LevelOption[]>(() => {
    const m = new Map<string, LevelOption>();

    allProgs.forEach(({ p }) => {
      const l = m.get(p.lvl) ?? { lvl: p.lvl, n: 0, Q: 0 };

      l.n += 1;
      l.Q += p.Q;
      m.set(p.lvl, l);
    });

    return [...m.values()];
  }, [allProgs]);

  // ยังไม่เลือก / ระดับที่เลือกไม่มีในคณะนี้ → ทุกระดับ
  const level = levels.some((l) => l.lvl === pickedLevel) ? pickedLevel : ALL_LEVELS;

  const progs = useMemo(
    () => (level === ALL_LEVELS ? allProgs : allProgs.filter((x) => x.p.lvl === level)),
    [allProgs, level],
  );

  const facRes = useMemo(() => computeBreakEven(fac, mode), [fac, mode]);

  const levelRes = useMemo(
    () => computeBreakEven(sumRows(progs.map((x) => x.p)), mode),
    [progs, mode],
  );

  // เขียนค่าที่เลือกกลับลง URL โดยไม่โหลดหน้าใหม่
  useEffect(() => {
    if (!urlRead) return;
    const q = new URLSearchParams(window.location.search);

    if (canPick) q.set('fac', fac.name);
    else q.delete('fac');
    if (level !== ALL_LEVELS) q.set('lvl', level);
    else q.delete('lvl');
    if (mode === 'without_government') q.set('mode', 'own');
    else q.delete('mode');
    const qs = q.toString();

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}`,
    );
  }, [urlRead, pathname, canPick, fac.name, level, mode]);

  // ผลหลังปรับ (D8) = รายการที่ยืนยัน (SUBMITTED) ล่าสุด · ไม่มี → ร่างล่าสุด (ติดป้าย "ร่าง") — เก็บในเบราว์เซอร์เครื่องนี้
  const [history, setHistory] = useState<ReturnType<typeof loadHistory>>([]);

  useEffect(() => setHistory(loadHistory()), []);

  const after = useMemo(() => {
    const out = new Map<string, AfterResult>();

    allProgs.forEach(({ p, key }) => {
      const mine = history
        .filter(
          (h) =>
            !h.isNew &&
            h.fac === p.fac &&
            (h.ref ? h.ref === progOptionLabel(p) : h.name === p.prog && h.level === p.lvl),
        )
        .sort((a, b) => b.id - a.id);
      const hit = mine.find(isSubmitted) ?? mine[0];

      if (!hit) return;
      const r = mode === 'with_government' ? hit.withGov : hit.withoutGov;
      const valid = r.qStarStatus === 'normal' && r.qStar !== null && r.qStar > 0;

      out.set(key, {
        q: r.q,
        qStar: r.qStar,
        profit: r.profit,
        tr: r.tr,
        tc: r.tc,
        draft: !isSubmitted(hit),
        valid,
        ok: valid && r.q >= (r.qStar ?? 0),
        savedAt: hit.time,
      });
    });

    return out;
  }, [allProgs, history, mode]);

  const value: FacultyCtx = {
    fac,
    canPick,
    // เปลี่ยนคณะ → คงระดับเดิม (คณะใหม่ไม่มีระดับนั้น = ทุกระดับ)
    // ค่าที่ผู้ใช้เลือกเองบันทึกให้หน้า Dashboard อื่นด้วย
    setFac: (name) => {
      setPickedFac(name);
      saveDashFilter({ facs: [name] });
    },
    year,
    setYear: (y) => {
      setYear(y);
      saveDashFilter({ year: y });
    },
    mode,
    setMode: (m) => {
      setMode(m);
      saveDashFilter({ mode: m });
    },
    levels,
    level,
    setLevel: (lvl) => {
      setLevel(lvl);
      saveDashFilter({ lvl: lvl === ALL_LEVELS ? '' : lvl });
    },
    allProgs,
    progs,
    facRes,
    levelRes,
    lock,
    lockReady,
    after,
    openDetail: (key, tab = 'be') => {
      setDetailTab(tab);
      setDetail(allProgs.find((x) => x.key === key)?.p ?? null);
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <ProgramDialog
        key={detail ? `${progKey(detail)}|${detailTab}` : 'none'}
        p={detail}
        after={detail ? after.get(progKey(detail)) : undefined}
        initialTab={detailTab}
        onClose={() => setDetail(null)}
      />
    </Ctx.Provider>
  );
};
