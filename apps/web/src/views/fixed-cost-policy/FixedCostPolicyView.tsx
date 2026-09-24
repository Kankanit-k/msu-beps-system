'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Type Imports
import type {
  BucketLevel,
  FixedCostMethod,
  FixedCostPolicy,
  FixedCostSimulationResult,
  FixedCostSubMethod,
  RevenueMode,
} from '@beps/calc-engine';
import type { FixedCostPool } from '@beps/shared-types';

// Component Imports
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';
import StepperCustomDot from '@components/stepper-dot';

// Calc Imports
import { computeBreakEven, fmtInt, fmtMillion } from '@views/breakeven/calc';

import MethodCards from './MethodCards';
import PercentTable, { parsePct, pctSum, roundPct } from './PercentTable';
import type { Bucket } from './PercentTable';
import SimulationCompare from './SimulationCompare';
import { buildFacultyScope, FACULTIES, POOL_OPTIONS, poolOption } from './data';
import { clearDraft, loadDraft, loadLastScope, saveDraft, saveLastScope } from './draft';
import type { DraftScope } from './draft';
import { RAW } from '@/data/mockup';
import { apiUrl } from '@/libs/apiPath';

/** วิธีที่ระบบใช้อยู่เดิมกับทุกคณะ — ใช้เป็นฐานเปรียบเทียบและเป็นค่าตั้งต้นของนโยบายใหม่ */
const CURRENT_METHOD: FixedCostMethod = 'PER_HEAD_FTES';

const STEPS = ['เลือกวิธี', 'กำหนดสัดส่วน', 'ตรวจผลจำลอง', 'เสนออนุมัติ'] as const;

const emptyDraft = {
  method: CURRENT_METHOD,
  bucketLevel: 'EDUCATION_LEVEL' as BucketLevel,
  subMethod: 'PER_HEAD_FTES' as FixedCostSubMethod,
  pct: {} as Record<string, string>,
  rationale: '',
  meetingRef: '',
};

/**
 * W20 — นโยบายต้นทุนคงที่รายคณะ
 *
 * ครอบคลุมขั้นที่ 3–4 ของ FIXED-COST-WORKFLOW.md (จำลองเทียบ + ร่างนโยบาย)
 * ขั้นที่ 5 (เสนอ) ยังกดไม่ได้เพราะ API บันทึก/เสนอนโยบายยังไม่ถูกสร้าง — หน้าจอจึง
 * บอกตรงๆ ว่าติดอะไร แทนที่จะให้ปุ่มที่กดแล้วไม่เกิดอะไรขึ้น
 */
const FixedCostPolicyView = () => {
  // ── ตัวกรองหัวหน้าจอ ───────────────────────────────────────────────
  const [year, setYear] = useState(MOCK_RUN.budgetYear);
  const [faculty, setFaculty] = useState(FACULTIES[0] ?? '');
  const [pool, setPool] = useState<FixedCostPool>('ALL');
  const [mode, setMode] = useState<RevenueMode>('with_government');

  // ── ร่างนโยบาย ────────────────────────────────────────────────────
  const [method, setMethod] = useState<FixedCostMethod>(emptyDraft.method);
  const [bucketLevel, setBucketLevel] = useState<BucketLevel>(emptyDraft.bucketLevel);
  const [subMethod, setSubMethod] = useState<FixedCostSubMethod>(emptyDraft.subMethod);
  const [pct, setPct] = useState<Record<string, string>>({});
  const [rationale, setRationale] = useState('');
  const [meetingRef, setMeetingRef] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [simulated, setSimulated] = useState<{
    sig: string;
    data: FixedCostSimulationResult;
  } | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const scope = useMemo(() => buildFacultyScope(faculty, pool), [faculty, pool]);
  const draftScope: DraftScope = useMemo(() => ({ year, faculty, pool }), [year, faculty, pool]);

  // กลับมาที่ขอบเขตเดิมหลังรีเฟรช — อ่านหลัง mount เท่านั้น เพื่อไม่ให้ HTML ฝั่ง server ต่างจาก client
  const [scopeRestored, setScopeRestored] = useState(false);

  useEffect(() => {
    const last = loadLastScope();

    if (last && FACULTIES.includes(last.faculty)) {
      setYear(last.year);
      setFaculty(last.faculty);
      setPool(last.pool);
    }

    setScopeRestored(true);
  }, []);

  useEffect(() => {
    if (scopeRestored) saveLastScope(draftScope);
  }, [scopeRestored, draftScope]);

  // ── ร่าง: โหลดเมื่อขอบเขตเปลี่ยน แล้วบันทึกทุกครั้งที่ค่าเปลี่ยน ──────
  // ข้ามการบันทึกรอบแรกหลังโหลด ไม่งั้นการเปลี่ยนคณะจะเขียนทับร่างของคณะใหม่ทันที
  const justLoaded = useRef(true);

  useEffect(() => {
    const d = loadDraft(draftScope);

    justLoaded.current = true;
    setMethod(d?.method ?? emptyDraft.method);
    setBucketLevel(d?.bucketLevel ?? emptyDraft.bucketLevel);
    setSubMethod(d?.subMethod ?? emptyDraft.subMethod);
    setPct(d?.pct ?? {});
    setRationale(d?.rationale ?? '');
    setMeetingRef(d?.meetingRef ?? '');
    setDraftSavedAt(d?.savedAt ?? null);
    reqSeq.current += 1; // คำขอของขอบเขตเดิมที่ยังค้างอยู่ ถือว่าไม่เกี่ยวกันแล้ว
    setSimulated(null);
    setSimError(null);
    setActiveStep(0);
  }, [draftScope]);

  useEffect(() => {
    if (justLoaded.current) {
      justLoaded.current = false;

      return;
    }

    setDraftSavedAt(
      saveDraft(draftScope, { method, bucketLevel, subMethod, pct, rationale, meetingRef }),
    );
  }, [draftScope, method, bucketLevel, subMethod, pct, rationale, meetingRef]);

  // ── กลุ่ม (bucket) ที่ต้องกำหนดสัดส่วน — มาจากหลักสูตรจริงของคณะที่เลือก ──
  const buckets: Bucket[] = useMemo(() => {
    if (bucketLevel === 'PROGRAM') {
      return scope.programs.map((p) => ({
        key: p.programVersionId,
        label: p.label,
        programCount: 1,
        q: p.q,
      }));
    }

    const byLevel = new Map<string, Bucket>();

    for (const p of scope.programs) {
      const key = p.educationLevel;
      const b = byLevel.get(key) ?? { key, label: key, programCount: 0, q: 0 };

      byLevel.set(key, { ...b, programCount: b.programCount + 1, q: b.q + p.q });
    }

    return [...byLevel.values()];
  }, [scope, bucketLevel]);

  const sum = pctSum(buckets, pct);

  // ทุกบรรทัดต้องอยู่ในช่วง 0–100 ด้วย ไม่ใช่แค่ผลรวมได้ 100 — `150 / −50` รวมได้ 100 เหมือนกัน
  // แต่ zod (`pct: min(0).max(100)`) จะตีกลับทั้งคำขอเป็น 422 ที่อธิบายให้ผู้ใช้ไม่ได้
  const pctComplete =
    roundPct(100 - sum) === 0 &&
    buckets.every((b) => {
      const v = parsePct(pct[b.key] ?? '');

      return v !== null && v >= 0 && v <= 100;
    });
  const isCustom = method === 'CUSTOM_PCT';

  const policy: FixedCostPolicy | undefined = useMemo(() => {
    if (!isCustom || !pctComplete) return undefined;

    return {
      method: 'CUSTOM_PCT',
      bucketLevel,
      subMethod,
      lines: buckets.map((b) => ({
        bucketKey: b.key,
        pct: roundPct(parsePct(pct[b.key] ?? '') ?? 0),
      })),
    };
  }, [isCustom, pctComplete, bucketLevel, subMethod, buckets, pct]);

  // ── จำลอง ─────────────────────────────────────────────────────────
  /**
   * ลายเซ็นของ "ข้อมูลที่ผลจำลองชุดนี้คำนวณมาจาก" — ผลเก่าที่ลายเซ็นไม่ตรงถือว่าไม่มีผล
   *
   * กันสองเคสพร้อมกัน: แก้สัดส่วนแล้วกด stepper ข้ามไปขั้นเสนอ (จะผ่านด่านด้วย valid
   * ของสัดส่วนชุดเก่า) และคำตอบของคณะที่เปลี่ยนไปแล้วเดินทางกลับมาช้า
   */
  const signature = useMemo(
    () => JSON.stringify({ year, faculty, pool, mode, method, policy: policy ?? null }),
    [year, faculty, pool, mode, method, policy],
  );

  const reqSeq = useRef(0);

  const simulate = useCallback(async () => {
    const seq = ++reqSeq.current;
    const sig = signature;

    setSimLoading(true);
    setSimError(null);

    try {
      const res = await fetch(apiUrl('/api/fixed-cost/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool: scope.pool,
          revenueMode: mode,
          programs: scope.programs,
          ...(policy ? { customPolicy: policy } : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(
          res.status === 401
            ? 'เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่'
            : (json?.error ?? `เรียก API ไม่สำเร็จ (${res.status})`),
        );
      }

      if (seq !== reqSeq.current) return;

      setSimulated({ sig, data: json.result as FixedCostSimulationResult });
    } catch (e) {
      if (seq !== reqSeq.current) return;

      setSimulated(null);
      setSimError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
    } finally {
      if (seq === reqSeq.current) setSimLoading(false);
    }
  }, [scope, mode, policy, signature]);

  // เข้าขั้น "ตรวจผลจำลอง" เมื่อไหร่ก็คำนวณให้เลย — ไม่ต้องให้ผู้ใช้กดอีกปุ่ม
  useEffect(() => {
    if (activeStep === 2) void simulate();
  }, [activeStep, simulate]);

  const result = simulated?.sig === signature ? simulated.data : null;
  const baseline = result?.methods.find((m) => m.key === CURRENT_METHOD) ?? null;
  const selected = result?.methods.find((m) => m.key === method) ?? null;

  const facultyRow = RAW.FACS.find((f) => f.name === faculty);
  const facultyProfit = facultyRow ? computeBreakEven(facultyRow, mode).profit : 0;

  // ── การเดินขั้น ───────────────────────────────────────────────────
  const stepDisabled = (i: number) => i === 1 && !isCustom;

  const blockedReason = (target: number): string | null => {
    if (target >= 2 && isCustom && !pctComplete) {
      return `กรอกสัดส่วนให้รวมได้ 100% พอดีก่อน จึงจะจำลองผลได้ (ตอนนี้ ${sum}%)`;
    }

    if (target >= 3) {
      if (!selected) return 'ยังไม่ได้จำลองผลของสัดส่วนชุดนี้ — เปิดขั้น "ตรวจผลจำลอง" ก่อน';
      if (!selected.valid) return 'ยังมีข้อทักท้วงที่ต้องแก้ — ดูรายละเอียดในขั้นตรวจผลจำลอง';
    }

    return null;
  };

  const goTo = (target: number) => {
    const reason = blockedReason(target);

    if (reason) {
      setToast(reason);

      return;
    }

    setActiveStep(target);
  };

  /** ขั้นถัดไปที่ปุ่ม "ถัดไป" จะพาไป — ขั้นกำหนดสัดส่วนถูกข้ามเมื่อไม่ใช่วิธีที่ 3 */
  const nextStep = activeStep === 0 && !isCustom ? 2 : activeStep + 1;
  const nextBlocked = blockedReason(nextStep);

  const next = () => goTo(nextStep);
  const back = () => setActiveStep(activeStep === 2 && !isCustom ? 0 : Math.max(0, activeStep - 1));

  const fillRemainder = () => {
    const blanks = buckets.filter((b) => (pct[b.key] ?? '').trim() === '');
    const targets = blanks.length > 0 ? blanks : buckets;

    if (targets.length === 0) return;

    const used = blanks.length > 0 ? pctSum(buckets, pct) : 0;

    if (used > 100) {
      // เฉลี่ยส่วนที่เหลือติดลบไม่ได้ — ปล่อยไปจะได้สัดส่วนติดลบที่รวมแล้วเป็น 100 พอดี
      // (จอเขียว) แต่ API ตีกลับเป็น 422 ซึ่งผู้ใช้อ่านไม่ออกว่าผิดตรงไหน
      setToast(
        `ผลรวมที่กรอกไว้เกิน 100% แล้ว (${sum}%) — ลดค่าที่กรอกก่อนจึงจะเฉลี่ยส่วนที่เหลือได้`,
      );

      return;
    }

    const share = roundPct((100 - used) / targets.length);
    const next: Record<string, string> = blanks.length > 0 ? { ...pct } : {};

    targets.forEach((b, i) => {
      // เศษที่ปัดทิ้งไปกองที่บรรทัดสุดท้าย เพื่อให้ผลรวมเป็น 100 พอดีตามกติกา V1
      const value =
        i === targets.length - 1 ? roundPct(100 - used - share * (targets.length - 1)) : share;

      next[b.key] = String(value);
    });

    setPct(next);
  };

  const doClearDraft = () => {
    clearDraft(draftScope);
    setMethod(emptyDraft.method);
    setBucketLevel(emptyDraft.bucketLevel);
    setSubMethod(emptyDraft.subMethod);
    setPct({});
    setRationale('');
    setMeetingRef('');
    setDraftSavedAt(null);
    setConfirmClear(false);
    setActiveStep(0);
    setToast('ล้างร่างของขอบเขตนี้แล้ว');
  };

  const poolMeta = poolOption(pool);

  return (
    <Box>
      <PageHeaderBar
        title="นโยบายต้นทุนคงที่รายคณะ"
        code="W20"
        mode={mode}
        onModeChange={setMode}
        q={scope.q}
        profit={facultyProfit}
      />

      <Grid container spacing={6}>
        <Grid size={12}>
          <Alert severity="info">
            <AlertTitle>คณะเลือกวิธีหารต้นทุนคงที่ของตัวเองได้ 3 แบบ</AlertTitle>
            ผลของทุกวิธีคำนวณจาก <strong>@beps/calc-engine</strong> ตัวเดียวกับตอนรันจริง และ
            <strong> ไม่เขียนฐานข้อมูล</strong> — กดดูเทียบกี่รอบก็ได้ก่อนตัดสินใจ ·
            ยอดรวมต้นทุนคงที่ของคณะเท่ากันทุกวิธี เปลี่ยนแค่การกระจายภายในคณะ
          </Alert>
        </Grid>

        {/* ตัวกรองขอบเขตของนโยบาย = ปี × คณะ × กลุ่มต้นทุน */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Grid container spacing={4} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="ปีงบประมาณ"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {MOCK_RUN.budgetYears.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    disableClearable
                    options={FACULTIES}
                    value={faculty}
                    onChange={(_, v) => v && setFaculty(v)}
                    renderInput={(params) => <TextField {...params} label="คณะ" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="กลุ่มต้นทุนคงที่"
                    value={pool}
                    helperText={poolMeta.hint}
                    onChange={(e) => setPool(e.target.value as FixedCostPool)}
                  >
                    {POOL_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2 }}>
                <Chip
                  size="small"
                  variant="tonal"
                  color="warning"
                  label="สถานะนโยบาย: ยังไม่เคยเสนอ (ใช้ค่าเริ่มต้น)"
                />
                <Chip
                  size="small"
                  variant="tonal"
                  label={`ก้อนที่ปันส่วน ${fmtMillion(scope.pool)} ลบ.`}
                />
                <Chip
                  size="small"
                  variant="tonal"
                  label={`${fmtInt(scope.programs.length)} หลักสูตร`}
                />
                <Chip size="small" variant="tonal" label={`${fmtInt(scope.q)} นิสิต`} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader
              title="ร่างนโยบาย"
              subheader={`${faculty} · ${poolMeta.label} · ปีงบประมาณ ${year}`}
            />
            <CardContent>
              <Stepper activeStep={activeStep} alternativeLabel nonLinear sx={{ mb: 6 }}>
                {STEPS.map((label, i) => (
                  <Step key={label} completed={i < activeStep} disabled={stepDisabled(i)}>
                    <StepButton onClick={() => !stepDisabled(i) && goTo(i)}>
                      <StepLabel StepIconComponent={StepperCustomDot}>
                        {label}
                        {stepDisabled(i) && (
                          <Typography variant="caption" display="block" color="text.disabled">
                            ข้าม — ใช้เฉพาะวิธีที่ 3
                          </Typography>
                        )}
                      </StepLabel>
                    </StepButton>
                  </Step>
                ))}
              </Stepper>

              {activeStep === 0 && (
                <MethodCards value={method} onChange={setMethod} current={CURRENT_METHOD} />
              )}

              {activeStep === 1 && (
                <PercentTable
                  buckets={buckets}
                  pct={pct}
                  onPctChange={(k, v) => setPct((prev) => ({ ...prev, [k]: v }))}
                  bucketLevel={bucketLevel}
                  onBucketLevelChange={setBucketLevel}
                  subMethod={subMethod}
                  onSubMethodChange={setSubMethod}
                  onFillRemainder={fillRemainder}
                  onClearDraft={() => setConfirmClear(true)}
                  draftSavedAt={draftSavedAt}
                />
              )}

              {activeStep === 2 && (
                <SimulationCompare
                  loading={simLoading}
                  error={simError}
                  baseline={baseline}
                  selected={selected}
                  onRetry={() => void simulate()}
                />
              )}

              {activeStep === 3 && (
                <Stack spacing={4}>
                  <Alert severity="warning">
                    <AlertTitle>ยังเสนอจริงไม่ได้ในรุ่นนี้</AlertTitle>
                    API บันทึก/เสนอ/อนุมัตินโยบาย (ขั้นที่ 5–6 ของกระบวนการ) ยังไม่ถูกสร้าง
                    ข้อความที่กรอกที่นี่จึงถูกเก็บไว้ในร่างบนเครื่องนี้เท่านั้น
                  </Alert>

                  <TextField
                    label="เหตุผลประกอบ"
                    placeholder="เช่น หลักสูตรบัณฑิตศึกษามีนิสิตน้อยแต่ใช้ทรัพยากรส่วนกลางไม่ต่างจาก ป.ตรี"
                    multiline
                    minRows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    error={isCustom && rationale.trim() === ''}
                    helperText={
                      isCustom && rationale.trim() === ''
                        ? 'วิธีกำหนดสัดส่วนเองต้องระบุเหตุผล (กติกา V4)'
                        : ' '
                    }
                  />
                  <TextField
                    label="เลขที่มติที่ประชุม"
                    placeholder="เช่น กก.คณะ 7/2568 วาระ 4.2"
                    value={meetingRef}
                    onChange={(e) => setMeetingRef(e.target.value)}
                    error={isCustom && meetingRef.trim() === ''}
                    helperText={
                      isCustom && meetingRef.trim() === ''
                        ? 'วิธีกำหนดสัดส่วนเองต้องอ้างเลขที่มติ (กติกา V4)'
                        : ' '
                    }
                    sx={{ maxWidth: 420 }}
                  />

                  <Box>
                    <Button
                      variant="contained"
                      disabled
                      startIcon={<i className="ri-send-plane-line" />}
                      onClick={() => setConfirmSubmit(true)}
                    >
                      เสนอขออนุมัติ
                    </Button>
                  </Box>
                </Stack>
              )}

              <Divider sx={{ my: 5 }} />

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={activeStep === 0}
                  onClick={back}
                >
                  ย้อนกลับ
                </Button>
                <Button
                  variant="contained"
                  disabled={activeStep === STEPS.length - 1 || Boolean(nextBlocked)}
                  onClick={next}
                  endIcon={simLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  ถัดไป
                </Button>
                {/* เหตุผลที่ไปต่อไม่ได้ ต้องอยู่ติดปุ่มที่กด ไม่ใช่เป็น toast ที่ก้นหน้าจอ */}
                {nextBlocked && activeStep !== STEPS.length - 1 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    <i className="ri-information-line" />
                    {nextBlocked}
                  </Typography>
                )}
                {activeStep === 2 && (
                  <Button variant="outlined" onClick={() => void simulate()} disabled={simLoading}>
                    คำนวณใหม่
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>ล้างร่างนโยบายนี้?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            สัดส่วนที่กรอกไว้ของ {faculty} ({poolMeta.label}) จะถูกลบทิ้งและกู้คืนไม่ได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>ยกเลิก</Button>
          <Button color="error" onClick={doClearDraft}>
            ล้างร่าง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmSubmit} onClose={() => setConfirmSubmit(false)}>
        <DialogTitle>ยืนยันการเสนอขออนุมัติ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            เมื่อเสนอแล้วจะแก้ไขนโยบายฉบับนี้ไม่ได้จนกว่ากองแผนงานจะอนุมัติหรือตีกลับ
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmit(false)}>ยกเลิก</Button>
          <Button variant="contained" disabled>
            เสนอ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FixedCostPolicyView;
