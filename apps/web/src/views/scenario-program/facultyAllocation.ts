/**
 * ปันส่วนต้นทุนคงที่ส่วนกลางคณะใหม่ทั้งคณะ สำหรับหน้า W7 (จุดคุ้มทุนรายหลักสูตร)
 *
 * TFC ในตารางต้นทุน (แท็บ 4) มี "ส่วนแบ่งส่วนกลางคณะ" (งบสำนักงาน + ค่าเสื่อม) ที่ชีตปันไว้แล้ว
 * ตามจำนวนนิสิตฝังอยู่ — ถ้าคณะเลือกวิธีอื่นตามมติ (FIXED-COST-WORKFLOW.md) ต้องถอดส่วนแบ่งเดิมออก
 * แล้วใส่ส่วนแบ่งตามวิธีใหม่แทน:  TFC ใหม่ = TFC ในตาราง − ส่วนแบ่งเดิม + ส่วนแบ่งตามวิธีที่เลือก
 *
 * การปันส่วนต้องทำ "ทั้งคณะ" เสมอ ไม่ใช่คิดหลักสูตรเดียว เพราะ
 * - หลักสูตรใหม่เข้ามาแบ่งก้อนเดิมของคณะ → หลักสูตรเดิมทุกหลักสูตรได้ส่วนแบ่งลดลง
 * - ปรับจำนวนนิสิตของหลักสูตรเดิม → ตามรายหัวแล้วสัดส่วนของทุกหลักสูตรขยับ
 * ก้อนรวมของคณะไม่เปลี่ยน (หลักการข้อ 4) — เปิดหลักสูตรใหม่ไม่ได้ทำให้งบสำนักงานคณะเพิ่ม
 *
 * ใช้ `buildFixedCostDrivers` / `allocateFixedCost` ตัวเดียวกับ W20 และรอบคำนวณจริง
 * ตัวเลขที่นี่จึงตรงกับหน้านโยบายทุกสตางค์
 */
import { allocateFixedCost, buildFixedCostDrivers } from '@beps/calc-engine';
import type {
  BucketLevel,
  FixedCostMethod,
  FixedCostPolicy,
  FixedCostSubMethod,
  PolicyIssue,
} from '@beps/calc-engine';

/** 3 วิธีตามมติ — คณะเลือกและล็อกที่หน้าตั้งค่าวิธีปันส่วน (ไม่มีแบบ "ตามชีต" แล้ว) */
export type AllocMethod = FixedCostMethod;

export const ALLOC_METHOD_LABEL: Record<AllocMethod, string> = {
  PER_HEAD_FTES: 'หารตามรายหัวนิสิต',
  EQUAL_PROGRAM: 'หารเท่ากันทุกหลักสูตร',
  CUSTOM_PCT: 'กำหนดสัดส่วน % เอง',
};

export interface AllocProgram {
  id: string;
  label: string;
  educationLevel: string;
  /** จำนวนนิสิต — ใช้เป็น FTES (ชุดข้อมูลยังไม่มีน้ำหนักรายประเภทนิสิต) */
  q: number;
  /** ส่วนแบ่งส่วนกลางคณะที่ชีตปันไว้ในตัวเลขของหลักสูตรนี้แล้ว */
  sheetShare: number;
}

/** คีย์ของหลักสูตรที่จะเปิดใหม่ — ใช้เป็น bucket ได้เมื่อกำหนดสัดส่วนรายหลักสูตร */
export const NEW_PROGRAM_ID = 'pv-new';

export interface NewProgram {
  label: string;
  educationLevel: string;
  q: number;
  /**
   * ส่วนแบ่งส่วนกลางที่ติดมากับตัวเลขในตาราง — ตั้งต้นจากหลักสูตรอ้างอิงจึงติดส่วนแบ่งของหลักสูตรนั้นมาด้วย
   * กรอกต้นทุนเองไม่มีหลักสูตรอ้างอิง = 0 (ถือว่าที่กรอกเป็นต้นทุนตรงของหลักสูตร)
   */
  sheetShare: number;
}

export interface FacultyScenario {
  /** ต้นทุนคงที่ส่วนกลางคณะทั้งก้อน — ไม่เปลี่ยนตามวิธีหรือจำนวนหลักสูตร */
  pool: number;
  programs: readonly AllocProgram[];
  /** จำนวนนิสิตที่ใช้แทนของจริง (ปรับปรุงหลักสูตรเดิมแล้วเปลี่ยนจำนวนนิสิต) */
  qOverride?: { id: string; q: number };
  /** หลักสูตรที่จะเปิดเพิ่มในคณะ */
  newProgram?: NewProgram;
  /**
   * ส่วนแบ่งที่ฝังอยู่ในตัวเลขของตารางต้นทุน (แท็บ 4) ของหลักสูตรที่กำลังคำนวณ — แทน `sheetShare` (แท็บ 3)
   * แท็บ 4 ปันส่วนกลางต่างจากแท็บ 3 ในบางหลักสูตร ถ้าถอด `sheetShare` ออกจากตัวเลขแท็บ 4 ตรงๆ
   * จะถอดเกินจน TFC ติดลบได้ (เช่น ศึกษาศาสตร์ ป.บัณฑิต การศึกษา)
   */
  embedded?: { id: string; amount: number };
}

export interface ProgramShare {
  id: string;
  label: string;
  /** ส่วนแบ่งที่อยู่ในตัวเลขตอนนี้ */
  before: number;
  /** ส่วนแบ่งตามวิธีที่เลือก */
  after: number;
}

export interface AllocOutcome {
  /** ใช้วิธีที่เลือกได้จริง — `false` = นโยบายยังไม่ผ่านการตรวจ จึงคงตัวเลขตามชีตไว้ */
  applied: boolean;
  /** ทุกหลักสูตรในคณะ (รวมหลักสูตรใหม่ ถ้ามี) — ผลรวม `after` = `pool` พอดีเมื่อ applied */
  shares: ProgramShare[];
  issues: PolicyIssue[];
}

/** ส่วนแบ่งของหลักสูตรหนึ่ง — `adj` คือยอดที่ต้องบวกเข้า TFC ในตาราง */
export const shareOf = (o: AllocOutcome, id: string) => {
  const s = o.shares.find((x) => x.id === id);

  return s ? { ...s, adj: s.after - s.before } : null;
};

/** รายชื่อหลักสูตรของสถานการณ์นี้ ในรูปที่ engine ต้องการ */
const weightInputs = (sc: FacultyScenario) => [
  ...sc.programs.map((p) => ({
    programVersionId: p.id,
    label: p.label,
    educationLevel: p.educationLevel,
    ftes: sc.qOverride?.id === p.id ? sc.qOverride.q : p.q,
  })),
  ...(sc.newProgram
    ? [
        {
          programVersionId: NEW_PROGRAM_ID,
          label: sc.newProgram.label,
          educationLevel: sc.newProgram.educationLevel,
          ftes: sc.newProgram.q,
        },
      ]
    : []),
];

/**
 * หารรายหัวแบบชีต: ชีตแยกก้อนส่วนกลางตามระดับการศึกษาก่อน (ป.ตรี / โท / เอก / …) แล้วหารรายหัวในระดับนั้น
 * — อัตราต่อหัวจึงต่างกันระหว่างระดับ (เช่น วิทยาศาสตร์ ป.ตรี 63,257 · บัณฑิต 56,299)
 * ทำเป็นกำหนด % รายระดับ = สัดส่วนที่ชีตปันให้ระดับนั้น แล้วแบ่งต่อตามหัว — จำนวนนิสิตเท่าชีต ตัวเลขจึงเท่าชีต
 *
 * @returns `null` เมื่อใช้แบบชีตไม่ได้ (ก้อน 0 หรือหลักสูตรใหม่เปิดระดับที่คณะยังไม่มี) → หารรายหัวทั้งคณะแทน
 */
function sheetPerHead(sc: FacultyScenario) {
  if (!(sc.pool > 0)) return null;
  const byLevel = new Map<string, number>();

  for (const p of sc.programs)
    byLevel.set(p.educationLevel, (byLevel.get(p.educationLevel) ?? 0) + p.sheetShare);
  const sum = [...byLevel.values()].reduce((a, v) => a + v, 0);

  if (!(sum > 0)) return null;
  const lines = [...byLevel].map(([bucketKey, v]) => ({ bucketKey, pct: (v / sum) * 100 }));

  // กันผลรวมทศนิยมลอยตัวไม่ถึง 100 พอดี (engine ยอมคลาด 1e-9)
  const last = lines[lines.length - 1];

  if (last) last.pct = 100 - lines.slice(0, -1).reduce((a, l) => a + l.pct, 0);
  const drivers = buildFixedCostDrivers(
    { method: 'CUSTOM_PCT', bucketLevel: 'EDUCATION_LEVEL', subMethod: 'PER_HEAD_FTES', lines },
    weightInputs(sc),
  );

  return drivers.valid ? { ...drivers, method: 'PER_HEAD_FTES' as const } : null;
}

/**
 * ปันส่วนก้อนส่วนกลางคณะใหม่ตามนโยบาย
 *
 * @param policy `null` = ตามชีต (ไม่ปันใหม่ ส่วนแบ่งเท่าเดิม)
 */
export function allocateFaculty(sc: FacultyScenario, policy: FixedCostPolicy | null): AllocOutcome {
  const before = [
    ...sc.programs.map((p) => ({
      id: p.id,
      label: p.label,
      before: sc.embedded?.id === p.id ? sc.embedded.amount : p.sheetShare,
    })),
    ...(sc.newProgram
      ? [{ id: NEW_PROGRAM_ID, label: sc.newProgram.label, before: sc.newProgram.sheetShare }]
      : []),
  ];
  const unchanged = (issues: PolicyIssue[]): AllocOutcome => ({
    applied: false,
    shares: before.map((b) => ({ ...b, after: b.before })),
    issues,
  });

  if (!policy) return unchanged([]);

  const drivers =
    (policy.method === 'PER_HEAD_FTES' && sheetPerHead(sc)) ||
    buildFixedCostDrivers(policy, weightInputs(sc));

  // นโยบายที่ไม่ผ่าน (เช่น % ไม่ครบ 100) ห้ามเอาตัวเลขไปใช้ — engine ยัง normalize ให้ได้ผลออกมา
  // แต่ตัวเลขนั้นไม่ใช่สิ่งที่คณะตั้งใจ จึงคงตามชีตไว้แล้วรายงานข้อทักท้วงแทน
  if (!drivers.valid) return unchanged(drivers.issues);

  const amount = new Map(allocateFixedCost(sc.pool, drivers).map((a) => [a.programVersionId, a]));

  return {
    applied: true,
    shares: before.map((b) => ({ ...b, after: amount.get(b.id)?.amount ?? 0 })),
    issues: drivers.issues,
  };
}

export interface AllocBucket {
  key: string;
  label: string;
  programCount: number;
  q: number;
  /** กลุ่มนี้มีหลักสูตรใหม่อยู่ — ต้องกรอก % เอง ช่องว่างไม่นับเป็น 0 */
  hasNew?: boolean;
  /** ระดับการศึกษาของหลักสูตร (เฉพาะรายหลักสูตร) — ใช้คุมเพดาน % ของระดับ */
  group?: string;
}

/** กลุ่มที่ต้องกำหนด % ของสถานการณ์นี้ — หลักสูตรใหม่ต้องมีที่อยู่ด้วย ไม่งั้นติด V2 */
export function allocBuckets(sc: FacultyScenario, level: BucketLevel): AllocBucket[] {
  const rows = weightInputs(sc);

  if (level === 'PROGRAM') {
    return rows.map((r) => ({
      key: r.programVersionId,
      label: r.programVersionId === NEW_PROGRAM_ID ? `${r.label} (หลักสูตรใหม่)` : r.label,
      programCount: 1,
      q: r.ftes,
      hasNew: r.programVersionId === NEW_PROGRAM_ID,
      group: r.educationLevel,
    }));
  }

  const byLevel = new Map<string, AllocBucket>();

  for (const r of rows) {
    const b = byLevel.get(r.educationLevel) ?? {
      key: r.educationLevel,
      label: r.educationLevel,
      programCount: 0,
      q: 0,
    };

    byLevel.set(r.educationLevel, {
      ...b,
      programCount: b.programCount + 1,
      q: b.q + r.ftes,
      hasNew: b.hasNew || r.programVersionId === NEW_PROGRAM_ID,
    });
  }

  return [...byLevel.values()];
}

export interface AllocChoice {
  method: AllocMethod;
  bucketLevel: BucketLevel;
  subMethod: FixedCostSubMethod;
  /** bucketKey → % ตามที่พิมพ์ */
  pct: Record<string, string>;
  /** รายหลักสูตร: % ของแต่ละระดับการศึกษา (เช่น ป.ตรี 90 / โท 5 / เอก 5) — หลักสูตรในระดับรวมกันต้องเท่านี้ */
  levelPct?: Record<string, string>;
}

export const DEFAULT_ALLOC_CHOICE: AllocChoice = {
  method: 'PER_HEAD_FTES',
  bucketLevel: 'EDUCATION_LEVEL',
  subMethod: 'PER_HEAD_FTES',
  pct: {},
};

/**
 * ทางเลือกบนหน้าจอ → นโยบายที่ส่งให้ engine
 *
 * กำหนด % เอง: ส่งทุกบรรทัดตามที่พิมพ์ (ช่องว่าง = 0, พิมพ์ผิด = NaN) ให้ engine ตรวจเอง
 * ข้อความทักท้วงจึงมาจากกติกา V1–V3 ชุดเดียวกับ W20 ไม่ใช่ตรวจซ้ำอีกชุดที่หน้านี้
 *
 * ยกเว้นกลุ่มที่มีหลักสูตรใหม่: ช่องว่างไม่ส่งบรรทัด → engine ติด V2 (หลักสูตรไม่อยู่ในกลุ่มใด)
 * ไม่งั้นลืมกรอก = หลักสูตรใหม่ไม่รับต้นทุนส่วนกลางเลย แล้ว Q* ต่ำเกินจริงโดยไม่มีใครเห็น
 */
export function policyOf(c: AllocChoice, buckets: readonly AllocBucket[]): FixedCostPolicy {
  if (c.method !== 'CUSTOM_PCT') return { method: c.method };

  return {
    method: 'CUSTOM_PCT',
    bucketLevel: c.bucketLevel,
    subMethod: c.subMethod,
    lines: buckets.flatMap((b) => {
      const raw = (c.pct[b.key] ?? '').trim();

      if (raw === '' && b.hasNew) return [];

      const v = raw === '' ? 0 : Number(raw);

      return [{ bucketKey: b.key, pct: Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : NaN }];
    }),
  };
}

const pctNum = (raw?: string) => {
  const v = Number((raw ?? '').trim() || 0);

  return Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : NaN;
};
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** เพดาน % รายระดับที่ใช้คุมการกรอกรายหลักสูตร — `undefined` เมื่อไม่ใช่กำหนด % รายหลักสูตร */
export function levelCapsOf(c: AllocChoice, levels: readonly string[]) {
  if (c.method !== 'CUSTOM_PCT' || c.bucketLevel !== 'PROGRAM') return undefined;

  return Object.fromEntries(levels.map((l) => [l, pctNum(c.levelPct?.[l])]));
}

/**
 * กำหนด % รายหลักสูตร: % รายระดับต้องรวม 100 และหลักสูตรในแต่ละระดับรวมกันต้องเท่ากับ % ของระดับนั้นพอดี
 * — engine ตรวจแค่รวมทั้งคณะ 100 จึงต้องคุมที่นี่ ไม่งั้น ป.ตรี กิน % ของ ป.โท ได้
 *
 * @returns ข้อความที่ต้องแก้ก่อนล็อก หรือ `null` เมื่อผ่าน
 */
export function levelCapIssue(c: AllocChoice, buckets: readonly AllocBucket[]): string | null {
  const levels = [...new Set(buckets.map((b) => b.group ?? ''))];
  const caps = levelCapsOf(c, levels);

  if (!caps) return null;
  const capSum = round4(levels.reduce((a, l) => a + caps[l]!, 0));

  if (capSum !== 100) return `% รายระดับการศึกษารวมต้องเป็น 100% พอดี (ตอนนี้ ${capSum}%)`;

  for (const l of levels) {
    const sum = round4(
      buckets.filter((b) => (b.group ?? '') === l).reduce((a, b) => a + pctNum(c.pct[b.key]), 0),
    );

    if (sum !== caps[l])
      return `หลักสูตร${l}รวมกัน ${sum}% — ต้องเท่ากับ ${caps[l]}% ที่กำหนดให้ระดับ${l}`;
  }

  return null;
}

/**
 * กำหนด % รายหลักสูตร: แบ่ง % ของแต่ละระดับลงหลักสูตรในระดับตามจำนวนนิสิตรายหัว (Q ตามชีต)
 * — คนเยอะได้ % มาก รวมกันเท่า % ของระดับพอดี (ปัด 4 ตำแหน่งแบบเศษเหลือมากสุดได้ก่อน)
 * ระดับที่นิสิตรวมเป็น 0 หารเท่ากัน
 */
export function splitLevelPctByFtes(
  caps: Record<string, number>,
  buckets: readonly AllocBucket[],
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [lvl, cap] of Object.entries(caps)) {
    const members = buckets.filter((b) => (b.group ?? '') === lvl);
    const totalQ = members.reduce((a, b) => a + b.q, 0);
    const units = Math.round(cap * 1e4);
    const raw = members.map((b) => (totalQ > 0 ? (units * b.q) / totalQ : units / members.length));
    const base = raw.map(Math.floor);
    let left = units - base.reduce((a, v) => a + v, 0);

    raw
      .map((v, i) => ({ i, frac: v - base[i]! }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => {
        if (left-- > 0) base[i]!++;
      });
    members.forEach((b, i) => (out[b.key] = String(base[i]! / 1e4)));
  }

  return out;
}
