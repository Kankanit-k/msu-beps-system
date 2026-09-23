/**
 * นโยบายจัดสรรต้นทุนคงที่รายคณะ — 3 วิธีตามมติที่ประชุม
 * (รายละเอียดกระบวนการทั้งหมดอยู่ใน FIXED-COST-WORKFLOW.md)
 *
 * ปัญหาที่มติแก้: เดิมต้นทุนคงที่ถูกหารด้วย driver เดียวคือจำนวนนิสิตทั้งมหาวิทยาลัย
 * หลักสูตรที่มีนิสิตน้อย (ป.โท/ป.เอก) จึงรับภาระต่อหัวสูงเกินจริงจน Q* ไม่มีความหมาย
 *
 * หลักการของโมดูลนี้: **ทั้ง 3 วิธีต่างกันแค่ "ค่าของ driver"** เท่านั้น
 * เครื่องปันส่วนใน db/02_functions.sql ยังคำนวณ `leg × driver ÷ driver_total` เหมือนเดิม
 * โมดูลนี้จึงมีหน้าที่เดียว — แปลงนโยบายหนึ่งฉบับ + รายชื่อหลักสูตร → ค่า driver ต่อหลักสูตร
 *
 * ทำไมต้องอยู่ใน calc-engine (ไม่ใช่เขียนใน service): ตัวเลขชุดนี้ถูกใช้ 3 ที่เหมือนสูตร 1–7 —
 * หน้าจำลองเทียบ 3 วิธี (W20), การ materialize driver ก่อนรันจริง, และรายงานที่อธิบายที่มา
 * ถ้าเขียนแยกกัน จะเกิดกรณีที่ตัวเลขตอนจำลองไม่ตรงกับตอนรันจริง ซึ่งทำลายความน่าเชื่อถือทั้งระบบ
 */

/** วิธีจัดสรรตามมติ — ตรงกับ enum `alloc_method` ที่เพิ่มใน db/01_schema.sql */
export type FixedCostMethod = 'PER_HEAD_FTES' | 'EQUAL_PROGRAM' | 'CUSTOM_PCT';

/** วิธีแบ่งต่อ "ภายใน bucket" ของ CUSTOM_PCT — เป็นได้แค่วิธีที่ 1 หรือ 2 */
export type FixedCostSubMethod = Exclude<FixedCostMethod, 'CUSTOM_PCT'>;

/**
 * ระดับที่คณะกำหนดสัดส่วน — ตัวอย่างในมติ ("ป.ตรี 90% · ป.โท-เอก 10%")
 * กำหนดถึงระดับการศึกษา ไม่ใช่รายหลักสูตร จึงต้องรองรับทั้งสองระดับ
 */
export type BucketLevel = 'EDUCATION_LEVEL' | 'PROGRAM';

/** ธงคุณภาพของค่า driver — ตรงกับ enum `quality_flag` ใน DB */
export type DriverFlag = 'PASS' | 'MANUAL_OVERRIDE' | 'MISSING_DRIVER';

export interface ProgramWeightInput {
  /** `program_version_id` — ใช้เป็นคีย์และเป็นตัวตัดสินลำดับตอนปัดเศษ */
  programVersionId: string;
  label?: string | undefined;
  /**
   * คีย์ของ bucket เมื่อ `bucketLevel = 'EDUCATION_LEVEL'`
   * เช่น `'ป.ตรี'` / `'ป.โท'` / `'ป.เอก'` — มาจาก `program.degree_level`
   */
  educationLevel?: string;
  /**
   * FTES ของหลักสูตรในงวดนั้น = Σ (จำนวนนิสิตแต่ละประเภท × น้ำหนักของประเภทนั้น)
   * ผู้เรียกเป็นคนคูณน้ำหนักมาแล้ว (น้ำหนักอยู่ใน master `student_type.ftes_weight`)
   * ถ้าคณะเลือกนับหัวตรงๆ ให้ส่ง headcount มาโดยตั้งน้ำหนักทุกประเภท = 1
   */
  ftes: number;
}

export interface FixedCostPolicyLine {
  /** ระดับการศึกษา หรือ `programVersionId` ขึ้นกับ `bucketLevel` */
  bucketKey: string;
  /** เปอร์เซ็นต์ 0–100 — ผลรวมทุกบรรทัดต้องเท่ากับ 100 พอดี (V1) */
  pct: number;
}

export interface FixedCostPolicy {
  method: FixedCostMethod;
  /** ใช้เมื่อ `method = 'CUSTOM_PCT'` — ไม่ระบุ = แบ่งต่อตาม FTES */
  subMethod?: FixedCostSubMethod;
  /** ใช้เมื่อ `method = 'CUSTOM_PCT'` — ไม่ระบุ = กำหนดสัดส่วนถึงระดับการศึกษา */
  bucketLevel?: BucketLevel;
  /** ใช้เมื่อ `method = 'CUSTOM_PCT'` */
  lines?: readonly FixedCostPolicyLine[];
}

export interface FixedCostDriver {
  programVersionId: string;
  label?: string | undefined;
  /** bucket ที่หลักสูตรนี้สังกัด — `null` เมื่อวิธีที่เลือกไม่ได้แบ่ง bucket */
  bucketKey: string | null;
  /**
   * ค่าที่จะเขียนลง `allocation_driver_value.driver_value`
   * เป็นสัดส่วน 0–1 ที่รวมกันได้ 1 — เครื่องปันส่วนหารด้วยผลรวมอยู่แล้ว
   * จึงไม่ต้องคูณ 100 หรือแปลงหน่วยใดๆ
   */
  driverValue: number;
  flag: DriverFlag;
}

/** รหัสข้อตรวจตามตาราง "กติกาตรวจสอบ" ใน FIXED-COST-WORKFLOW.md หัวข้อ 7 */
export type PolicyIssueCode =
  /** V1 — ผลรวมเปอร์เซ็นต์ไม่เท่ากับ 100 พอดี */
  | 'PCT_SUM_NOT_100'
  /** V1 — เปอร์เซ็นต์ติดลบหรือไม่ใช่ตัวเลขที่ใช้ได้ */
  | 'PCT_INVALID'
  /** V1 — bucket เดียวกันถูกกำหนดซ้ำสองบรรทัด */
  | 'BUCKET_DUPLICATED'
  /** V2 — มีหลักสูตรที่ไม่ได้อยู่ใน bucket ใดเลย → เงินไม่ถึงหลักสูตรนั้น */
  | 'PROGRAM_NOT_COVERED'
  /** V3 — bucket ที่ได้เปอร์เซ็นต์ > 0 แต่ไม่มีหลักสูตรอยู่เลย → เงินค้างไม่มีเจ้าภาพ */
  | 'BUCKET_EMPTY'
  /** V8 — ไม่มี FTES ให้หาร จึงถอยไปหารเท่ากันทุกหลักสูตรในขอบเขตนั้น */
  | 'FTES_UNAVAILABLE'
  /** ไม่มีหลักสูตรให้ปันส่วนเลย */
  | 'NO_PROGRAM'
  /** โครงสร้างนโยบายไม่ครบ (เช่น CUSTOM_PCT แต่ไม่มีบรรทัดสัดส่วน) */
  | 'POLICY_INCOMPLETE';

export interface PolicyIssue {
  code: PolicyIssueCode;
  /** `'error'` = เสนออนุมัติไม่ได้ · `'warning'` = เสนอได้แต่ต้องรู้ตัว */
  severity: 'error' | 'warning';
  message: string;
  /** bucket หรือหลักสูตรที่เกี่ยวข้อง */
  refs?: string[];
}

export interface FixedCostDriverSet {
  method: FixedCostMethod;
  drivers: FixedCostDriver[];
  issues: PolicyIssue[];
  /** ไม่มี issue ระดับ error = เสนอขออนุมัติได้ */
  valid: boolean;
}

/** ความคลาดเคลื่อนที่ยอมให้ผลรวม % ต่างจาก 100 — กันเลขทศนิยมลอยตัวเท่านั้น ไม่ใช่ tolerance เชิงนโยบาย */
const PCT_EPSILON = 1e-9;

/**
 * เทียบคีย์แบบเดียวกับ `ORDER BY program_version_id` ของ PostgreSQL
 * — คีย์ที่เป็นตัวเลขล้วนเทียบเชิงตัวเลข (id จริงเป็น bigint) ที่เหลือเทียบเป็นข้อความ
 */
function compareKeys(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);

  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;

  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * แบ่งจำนวนเงินตามสัดส่วนให้ผลรวมตรงยอดตั้งต้น **พอดีทุกสตางค์** (largest remainder)
 *
 * ต้องให้ผลตรงกับ SQL (`run_cost_allocation` ขั้น 3b) ทุกสตางค์ ไม่เช่นนั้นตัวเลขที่
 * ผู้ใช้เห็นตอนจำลองจะต่างจากที่บันทึกลง DB จึงลอกกติกามาทั้งดุ้น:
 *
 * 1. `floor` ลงทาง −∞ **ไม่ใช่** ปัดบนค่าสัมบูรณ์ — ยอดติดลบจึงแจกเศษคนละแถวกับยอดบวก
 *    (เคยเขียนแบบค่าสัมบูรณ์แล้วได้ `[-333.34, -333.33, -333.33]` ขณะที่ SQL ได้
 *     `[-333.33, -333.33, -333.34]` — ต่างกันที่ว่าหลักสูตรไหนรับเศษ)
 * 2. แจกสตางค์ที่เหลือให้แถวที่เศษมากที่สุดก่อน
 * 3. เสมอกันตัดสินด้วย `keys` แบบเดียวกับ `ORDER BY … , program_version_id` ของ SQL
 *    ไม่ใช่ลำดับที่บังเอิญอยู่ใน array (ซึ่งเรียงตามบรรทัดนโยบาย ไม่ใช่ตามหลักสูตร)
 *
 * สัดส่วนที่ติดลบหรือไม่ใช่ตัวเลขถูกปัดเป็น 0 ก่อนเสมอ — ทั้งตัวเศษและตัวส่วน
 * จึงไม่มีทางเกิดกรณีที่ผลรวมเกินยอดตั้งต้น
 */
export function allocateAmount(
  total: number,
  shares: readonly number[],
  keys?: readonly string[],
): number[] {
  if (shares.length === 0) return [];

  const w = shares.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const shareSum = w.reduce((a, b) => a + b, 0);

  if (!Number.isFinite(total) || shareSum <= 0) return shares.map(() => 0);

  const satang = Math.round(total * 100);
  const raw = w.map((s) => (satang * s) / shareSum);
  const out = raw.map((v) => Math.floor(v));

  let left = satang - out.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort(
      (a, b) =>
        b.frac - a.frac || (keys ? compareKeys(keys[a.i] ?? '', keys[b.i] ?? '') : 0) || a.i - b.i,
    );

  for (const { i } of order) {
    if (left <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    left -= 1;
  }

  return out.map((v) => v / 100);
}

/** bucket ที่หลักสูตรหนึ่งสังกัด ตามระดับที่นโยบายกำหนด */
function bucketOf(program: ProgramWeightInput, level: BucketLevel): string {
  return level === 'PROGRAM' ? program.programVersionId : (program.educationLevel ?? '');
}

/**
 * แบ่งน้ำหนักภายในกลุ่มเดียว ตามวิธีที่ 1 หรือ 2
 *
 * @returns สัดส่วนที่รวมกันได้ 1 + ธงบอกว่าถอยไปใช้วิธีหารเท่าเพราะไม่มี FTES หรือไม่
 */
function weightsWithin(
  programs: readonly ProgramWeightInput[],
  method: FixedCostSubMethod,
): { weights: number[]; fellBack: boolean } {
  const n = programs.length;
  if (n === 0) return { weights: [], fellBack: false };

  const equal = () => ({ weights: programs.map(() => 1 / n), fellBack: true });

  if (method === 'EQUAL_PROGRAM') return { weights: programs.map(() => 1 / n), fellBack: false };

  const ftes = programs.map((p) => (Number.isFinite(p.ftes) && p.ftes > 0 ? p.ftes : 0));
  const total = ftes.reduce((a, b) => a + b, 0);

  // V8 — ไม่มีนิสิตเลยทั้งกลุ่ม หารตาม FTES ไม่ได้ → หารเท่ากันแทน ไม่ปล่อยให้ยอดค้าง
  if (total <= 0) return equal();

  return { weights: ftes.map((v) => v / total), fellBack: false };
}

/**
 * แปลงนโยบาย 1 ฉบับ + รายชื่อหลักสูตรของคณะ → ค่า driver ต่อหลักสูตร
 *
 * ฟังก์ชันนี้ **ไม่โยน error** แม้นโยบายจะไม่ผ่านการตรวจ — คืน `issues` มาให้ผู้เรียก
 * ตัดสินใจแทน เพราะหน้าจอ W20 ต้องแสดงผลจำลองคู่กับรายการที่ยังต้องแก้ไปพร้อมกัน
 * ส่วนชั้น service ต้องเช็ก `valid` ก่อนอนุญาตให้กดเสนอ (V1–V4)
 */
export function buildFixedCostDrivers(
  policy: FixedCostPolicy,
  programs: readonly ProgramWeightInput[],
): FixedCostDriverSet {
  const issues: PolicyIssue[] = [];

  const finish = (drivers: FixedCostDriver[]): FixedCostDriverSet => ({
    method: policy.method,
    drivers,
    issues,
    valid: !issues.some((i) => i.severity === 'error'),
  });

  if (programs.length === 0) {
    issues.push({
      code: 'NO_PROGRAM',
      severity: 'error',
      message: 'ไม่มีหลักสูตรที่เปิดสอนในงวดนี้ จึงปันส่วนต้นทุนคงที่ไม่ได้',
    });

    return finish([]);
  }

  if (policy.method !== 'CUSTOM_PCT') {
    const { weights, fellBack } = weightsWithin(programs, policy.method);

    if (fellBack) {
      issues.push({
        code: 'FTES_UNAVAILABLE',
        severity: 'warning',
        message: 'ทั้งคณะไม่มี FTES ในงวดนี้ — ถอยไปหารเท่ากันทุกหลักสูตรเพื่อไม่ให้ยอดค้าง',
      });
    }

    return finish(
      programs.map((p, i) => ({
        programVersionId: p.programVersionId,
        label: p.label,
        bucketKey: null,
        driverValue: weights[i] ?? 0,
        flag: fellBack ? 'MISSING_DRIVER' : 'PASS',
      })),
    );
  }

  // ── CUSTOM_PCT — 2 ชั้น: แบ่งก้อนตาม % แล้วแบ่งต่อภายใน bucket ────────────
  const level: BucketLevel = policy.bucketLevel ?? 'EDUCATION_LEVEL';
  const subMethod: FixedCostSubMethod = policy.subMethod ?? 'PER_HEAD_FTES';
  const lines = policy.lines ?? [];

  if (lines.length === 0) {
    issues.push({
      code: 'POLICY_INCOMPLETE',
      severity: 'error',
      message: 'เลือกวิธีกำหนดสัดส่วนเอง แต่ยังไม่ได้กรอกสัดส่วนของกลุ่มใดเลย',
    });

    return finish([]);
  }

  const seen = new Set<string>();
  const duplicated: string[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    if (seen.has(line.bucketKey)) duplicated.push(line.bucketKey);
    seen.add(line.bucketKey);
    if (!Number.isFinite(line.pct) || line.pct < 0 || line.pct > 100) invalid.push(line.bucketKey);
  }

  if (duplicated.length > 0) {
    issues.push({
      code: 'BUCKET_DUPLICATED',
      severity: 'error',
      message: 'มีกลุ่มที่ถูกกำหนดสัดส่วนซ้ำมากกว่าหนึ่งบรรทัด',
      refs: duplicated,
    });
  }

  if (invalid.length > 0) {
    issues.push({
      code: 'PCT_INVALID',
      severity: 'error',
      message: 'สัดส่วนต้องเป็นตัวเลขระหว่าง 0 ถึง 100',
      refs: invalid,
    });
  }

  const pctSum = lines.reduce((a, l) => a + (Number.isFinite(l.pct) ? l.pct : 0), 0);

  if (Math.abs(pctSum - 100) > PCT_EPSILON) {
    issues.push({
      code: 'PCT_SUM_NOT_100',
      severity: 'error',
      message: `ผลรวมสัดส่วนต้องเท่ากับ 100% พอดี — ขณะนี้ ${pctSum.toFixed(4)}%`,
    });
  }

  const members = new Map<string, ProgramWeightInput[]>();

  for (const p of programs) {
    const key = bucketOf(p, level);
    const list = members.get(key);
    if (list) list.push(p);
    else members.set(key, [p]);
  }

  const emptyBuckets = lines.filter(
    (l) => l.pct > 0 && (members.get(l.bucketKey)?.length ?? 0) === 0,
  );

  if (emptyBuckets.length > 0) {
    issues.push({
      code: 'BUCKET_EMPTY',
      severity: 'error',
      message: 'มีกลุ่มที่ได้รับสัดส่วนแต่ไม่มีหลักสูตรอยู่เลย — ต้นทุนก้อนนี้จะไม่มีเจ้าภาพ',
      refs: emptyBuckets.map((l) => l.bucketKey),
    });
  }

  const uncovered = programs.filter((p) => !seen.has(bucketOf(p, level)));

  if (uncovered.length > 0) {
    issues.push({
      code: 'PROGRAM_NOT_COVERED',
      severity: 'error',
      message: 'มีหลักสูตรที่ไม่ได้อยู่ในกลุ่มใดเลย จะไม่ได้รับส่วนแบ่งต้นทุนคงที่',
      refs: uncovered.map((p) => p.label ?? p.programVersionId),
    });
  }

  // สัดส่วนที่ใช้จริงนับเฉพาะ bucket ที่มีหลักสูตรอยู่ แล้ว normalize ใหม่
  // เพื่อให้ยอดรวมยังเท่ากับต้นทางเสมอ (ข้อ 4 ของหลักการ) แม้นโยบายจะยังไม่ผ่านการตรวจ
  //
  // รวมสัดส่วนของ bucket เดียวกันที่ถูกกรอกซ้ำหลายบรรทัดเข้าด้วยกันก่อน — ซ้ำเป็น error
  // ตาม V1 อยู่แล้ว แต่ถ้าไม่รวมก่อน จะสร้าง driver ซ้ำหลักสูตรละหลายแถวจนเงินหายไปครึ่งก้อน
  // ตอนผู้เรียกยุบเป็น map รายหลักสูตร (ฝั่ง SQL กันด้วย UNIQUE (policy_id, bucket_key))
  const pctByBucket = new Map<string, number>();

  for (const line of lines) {
    if (!(line.pct > 0) || (members.get(line.bucketKey)?.length ?? 0) === 0) continue;
    pctByBucket.set(line.bucketKey, (pctByBucket.get(line.bucketKey) ?? 0) + line.pct);
  }

  const usableSum = [...pctByBucket.values()].reduce((a, b) => a + b, 0);

  if (usableSum <= 0) return finish([]);

  // แบ่งน้ำหนักภายในแต่ละ bucket ไว้ก่อน แล้วค่อยไล่ตามลำดับหลักสูตรที่ส่งเข้ามา
  // เพื่อให้ผลลัพธ์เรียงแบบเดียวกันทุกวิธี และเทียบแถวต่อแถวบนหน้าจอได้
  const withinByBucket = new Map<string, { weights: number[]; fellBack: boolean }>();
  let fellBackAny = false;

  for (const bucketKey of pctByBucket.keys()) {
    const within = weightsWithin(members.get(bucketKey) ?? [], subMethod);

    withinByBucket.set(bucketKey, within);
    fellBackAny ||= within.fellBack;
  }

  const drivers: FixedCostDriver[] = [];

  for (const p of programs) {
    const bucketKey = bucketOf(p, level);
    const bucketPct = pctByBucket.get(bucketKey);
    const within = withinByBucket.get(bucketKey);

    // หลักสูตรที่ไม่ได้อยู่ในกลุ่มใด (V2) ได้ส่วนแบ่ง 0 — รายงานเป็น error ไปแล้วข้างบน
    if (bucketPct === undefined || !within) continue;

    const i = (members.get(bucketKey) ?? []).indexOf(p);

    drivers.push({
      programVersionId: p.programVersionId,
      label: p.label,
      bucketKey,
      driverValue: (bucketPct / usableSum) * (within.weights[i] ?? 0),
      // สัดส่วนมาจากการตัดสินใจของคณะ ไม่ใช่ข้อมูลจริง → ต้องติดธงไว้ให้ตรวจสอบได้
      flag: within.fellBack ? 'MISSING_DRIVER' : 'MANUAL_OVERRIDE',
    });
  }

  if (fellBackAny) {
    issues.push({
      code: 'FTES_UNAVAILABLE',
      severity: 'warning',
      message: 'มีกลุ่มที่ไม่มี FTES ในงวดนี้ — ภายในกลุ่มนั้นหารเท่ากันทุกหลักสูตรแทน',
    });
  }

  return finish(drivers);
}

/**
 * ปันส่วนต้นทุนคงที่ก้อนหนึ่งลงหลักสูตรตามนโยบาย
 *
 * @param pool ต้นทุนคงที่ที่ต้องปันส่วน (ไม่รวมส่วนที่ ERP ผูกหลักสูตรได้อยู่แล้ว)
 * @returns จำนวนเงินต่อหลักสูตร ซึ่งรวมกันแล้วเท่ากับ `pool` พอดีทุกสตางค์
 */
export function allocateFixedCost(
  pool: number,
  driverSet: FixedCostDriverSet,
): {
  programVersionId: string;
  label?: string | undefined;
  bucketKey: string | null;
  amount: number;
}[] {
  const amounts = allocateAmount(
    pool,
    driverSet.drivers.map((d) => d.driverValue),
    driverSet.drivers.map((d) => d.programVersionId),
  );

  return driverSet.drivers.map((d, i) => ({
    programVersionId: d.programVersionId,
    label: d.label,
    bucketKey: d.bucketKey,
    amount: amounts[i] ?? 0,
  }));
}
