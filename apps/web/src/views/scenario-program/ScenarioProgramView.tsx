'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { calcBreakEvenBothModes, type RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes from '@components/DataCaveatNotes';
import NumberTextField from '@components/NumberTextField';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { computeBreakEven, REVENUE_MODE_LABEL, REVENUE_MODE_NOTE } from '@views/breakeven/calc';
import { feesForProgram, feeVariant, fmtFee } from '@views/tuition/feeData';

import BreakEvenChart from './BreakEvenChart';
import ProgramReport from './ProgramReport';
import AdmissionBreakdownCard from './AdmissionBreakdownCard';
import CostBlockTable from './CostBlockTable';
import StudentMixTable from './StudentMixTable';
import {
  blockFromProgram,
  blockResult,
  defaultYears,
  emptyBlock,
  segmentLabels,
  withPerHeadCharges,
  type CostBlock,
  type Segment,
} from './newProgramCalc';
import { PG_DATA, EDUCATION_LEVELS } from './programData';
import { loadHistory, saveHistory } from './historyStore';
import type { ProgramHistoryEntry } from './types';
import type { ProgRow } from '@/data/mockup';

/** ชื่อหลักสูตรซ้ำกันได้ในคณะเดียวกัน (คนละปริญญา) — ต่อท้ายชื่อปริญญาให้แยกแยะได้ในดรอปดาวน์ */
const progOptionLabel = (p: ProgRow) => `${p.prog} — ${p.deg}`;

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

type CostBasis = 'ref' | 'manual';

/** เงินแผ่นดิน บาท/ภาค/คน ตั้งต้นตามแท็บ 4 (Y14) — ใส่ให้กลุ่มปกติไทย ปกติต่างชาติ และต่อเนื่อง */
const DEFAULT_GOV_PER_SEM = 3550;

/** ตั้งต้นตารางสัดส่วนนิสิต: จำนวนนิสิตไทย/ต่างชาติจากหลักสูตรอ้างอิง · ค่าธรรมเนียมจากแท็บค่าธรรมเนียม68 */
function buildSegments(level: string, ref: ProgRow | null, semesters: number): Segment[] {
  const fees = ref ? feesForProgram(ref.fac, ref.deg) : [];
  const inTime = fees.find((f) => f.mode === 'ในเวลา');
  const offTime = fees.find((f) => f.mode === 'นอกเวลา');
  const thaiReg = inTime?.rate ?? 18000;
  const fee = [
    thaiReg,
    offTime?.rate ?? 0,
    inTime?.rateIntl ?? 25000,
    offTime?.rateIntl ?? 0,
    thaiReg,
  ];
  const n = [ref?.qT ?? 0, 0, ref?.qF ?? 0, 0, 0];
  const years = defaultYears(level);

  return segmentLabels(level).map((label, i) => ({
    label,
    n: n[i]!,
    fee: fee[i]!,
    gov: i % 2 === 0 ? DEFAULT_GOV_PER_SEM : 0,
    semesters,
    years: i === 4 ? 2 : years,
  }));
}

const roundBlock = (b: CostBlock): CostBlock => ({
  ...b,
  q: Math.round(b.q),
  gov: Math.round(b.gov),
  income: Math.round(b.income),
  fix: b.fix.map(Math.round),
  dep: Math.round(b.dep),
  var: b.var.map(Math.round),
  genEd: Math.round(b.genEd),
});

/* ---------- ร่างฟอร์ม — กันข้อมูลหายเมื่อปิด/รีโหลดหน้า ---------- */
const DRAFT_KEY = 'beps.scenario-program.draft';

interface Draft {
  fac: string | null;
  level: string;
  nameNew: string;
  degNew: string;
  semesters: number;
  refKey: string | null;
  basis: CostBasis;
  manual: CostBlock;
  segs: Segment[];
}

const refKeyOf = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}|${p.deg}`;

const loadDraft = (): Draft | null => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const saveDraft = (d: Draft | null) => {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — ฟอร์มยังใช้ได้ แค่ไม่จำร่าง
  }
};

/** หัวข้อย่อยในการ์ดกรอกข้อมูล */
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="overline"
    sx={{ display: 'block', color: 'primary.main', fontWeight: 700, mb: 1 }}
  >
    {children}
  </Typography>
);

/** อัตราค่าธรรมเนียมการศึกษาของหลักสูตรที่เลือก (แท็บ ค่าธรรมเนียม68 — ข้อมูลเดียวกับหน้า W8) */
const ProgramFeeRates = ({ p }: { p: ProgRow }) => {
  const fees = feesForProgram(p.fac, p.deg);

  return (
    <Box
      sx={{
        mt: 3,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: 'block', px: 3, pt: 2, fontWeight: 700, color: 'primary.main' }}
      >
        💵 อัตราค่าธรรมเนียมการศึกษา (บาท/ภาคการศึกษา)
      </Typography>
      {fees.length === 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 3, pb: 2 }}
        >
          จับคู่อัตราค่าธรรมเนียมไม่ได้ — ชื่อหลักสูตรในแท็บค่าธรรมเนียมสะกดต่างจากทะเบียนหลักสูตร
          ค้นหาเองได้ที่หน้าค่าธรรมเนียม
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ภาค · แผน</TableCell>
                <TableCell align="right">นิสิตไทย</TableCell>
                <TableCell align="right">นิสิตต่างชาติ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fees.map((f) => (
                <TableRow key={feeVariant(f)}>
                  <TableCell>{feeVariant(f)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtFee(f)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {f.rateIntl === null ? '—' : fmtB(f.rateIntl)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

const ScenarioProgramView = () => {
  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
  const [nameNew, setNameNew] = useState('');
  const [degNew, setDegNew] = useState('');
  const [semesters, setSemesters] = useState(2);
  const [refProg, setRefProg] = useState<ProgRow | null>(null);
  const [basis, setBasis] = useState<CostBasis>('ref');
  const [manual, setManual] = useState<CostBlock>(emptyBlock);
  const [segs, setSegs] = useState<Segment[]>(() => buildSegments(level, null, 2));

  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [history, setHistory] = useState<ProgramHistoryEntry[]>([]);
  const [confirm, setConfirm] = useState<'history' | 'form' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  // อ่านหลัง mount เท่านั้น — อ่านตอน render แรกจะทำให้ SSR กับ client ไม่ตรงกัน
  useEffect(() => {
    setHistory(loadHistory());
    const d = loadDraft();

    if (d) {
      setFac(d.fac);
      setLevel(d.level);
      setNameNew(d.nameNew);
      setDegNew(d.degNew);
      setSemesters(d.semesters);
      setRefProg(RAW.PROGS.find((p) => refKeyOf(p) === d.refKey) ?? null);
      setBasis(d.basis);
      setManual(d.manual);
      setSegs(d.segs);
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft({
      fac,
      level,
      nameNew,
      degNew,
      semesters,
      refKey: refProg ? refKeyOf(refProg) : null,
      basis,
      manual,
      segs,
    });
  }, [draftReady, fac, level, nameNew, degNew, semesters, refProg, basis, manual, segs]);

  const facultyOptions = useMemo(() => PG_DATA.map((g) => g.faculty), []);
  const refOptions = useMemo(
    () => (PG_DATA.find((g) => g.faculty === fac)?.programs ?? []).filter((p) => p.lvl === level),
    [fac, level],
  );

  const refBlock = useMemo(() => (refProg ? blockFromProgram(refProg) : null), [refProg]);
  const block = basis === 'ref' ? refBlock : withPerHeadCharges(manual, semesters);
  const result = block ? blockResult(block, mode) : null;
  const canSave =
    !!block && !!result && block.q > 0 && block.gov + block.income > 0 && result.tc > 0;

  const pickRef = (p: ProgRow | null, lvl = level) => {
    setRefProg(p);
    if (p) setManual(roundBlock(blockFromProgram(p)));
    setSegs(buildSegments(lvl, p, semesters));
  };

  const onFacChange = (v: string | null) => {
    setFac(v);
    pickRef(null);
  };

  const onLevelChange = (v: string) => {
    setLevel(v);
    pickRef(null, v);
  };

  const onSemestersChange = (v: number) => {
    setSemesters(v);
    setSegs((xs) => xs.map((s) => ({ ...s, semesters: v })));
  };

  const clearForm = () => {
    setFac(null);
    setLevel(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
    setNameNew('');
    setDegNew('');
    setSemesters(2);
    setRefProg(null);
    setBasis('ref');
    setManual(emptyBlock());
    setSegs(buildSegments(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี', null, 2));
    saveDraft(null);
  };

  const isNew = !!nameNew.trim() || basis === 'manual';
  const name = nameNew.trim() || refProg?.prog || 'หลักสูตรใหม่';

  const handleCalc = () => {
    if (!canSave || !block || !result) return;

    const both = calcBreakEvenBothModes({
      q: block.q,
      governmentBudget: block.gov,
      incomeBudget: block.income,
      tfc: result.tfc,
      tvc: result.tvc,
    });

    const entry: ProgramHistoryEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('th-TH'),
      name,
      fac: fac ?? '',
      level,
      isNew,
      q: block.q,
      tr: block.gov + block.income,
      tfc: result.tfc,
      tvc: result.tvc,
      avc: result.avc ?? 0,
      withGov: both.with_government,
      withoutGov: both.without_government,
      mode,
    };

    const next = [entry, ...history];

    setHistory(next);
    saveHistory(next);
    setToast(`บันทึกผลคำนวณ "${name}" แล้ว — ออกรายงาน PDF และใช้ในหน้าแผนการรับนิสิตได้`);
  };

  const uni = computeBreakEven(RAW.UNI, mode);
  const latest = history[0];
  const latestResult = latest
    ? latest.mode === 'with_government'
      ? latest.withGov
      : latest.withoutGov
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ '@media print': { display: 'none' } }}>
        <PageHeaderBar
          title="คำนวณจุดคุ้มทุนรายหลักสูตร"
          code="W7"
          mode={mode}
          onModeChange={setMode}
          q={uni.q}
          profit={uni.profit}
        />

        {/* หน้านี้กรอกตัวเลขเอง ไม่ได้อ่านจากรอบคำนวณ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง (ตาม mockup) */}
        <DataCaveatNotes profit={uni.profit} limitations={false} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            mb: 4,
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            🎓 คำนวณจุดคุ้มทุนหลักสูตรใหม่
          </Typography>
          <Button
            variant="contained"
            disabled={!latest}
            onClick={() => window.print()}
            title={
              latest
                ? 'เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ — เลือก "บันทึกเป็น PDF" ได้'
                : 'คำนวณก่อนเพื่อเปิดใช้งาน'
            }
          >
            🖨 ออกรายงาน PDF
          </Button>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={<DotTitle color="primary.main">ข้อมูลหลักสูตร</DotTitle>}
            subheader="ตามแท็บ 4.จุดคุ้มทุนหลักสูตร(ใหม่) — เลือกหลักสูตรอ้างอิงเพื่อดึงต้นทุนเดิม หรือคิดต้นทุนด้วยตัวเอง"
            action={
              <Button
                size="small"
                color="secondary"
                onClick={() => setConfirm('form')}
                sx={{ mr: 2 }}
              >
                ล้างฟอร์ม
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={facultyOptions}
                  value={fac}
                  onChange={(_, v) => onFacChange(v)}
                  renderInput={(params) => <TextField {...params} label="คณะ / วิทยาลัย" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  disableClearable
                  options={EDUCATION_LEVELS}
                  value={level}
                  onChange={(_, v) => onLevelChange(v)}
                  renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  fullWidth
                  label="ชื่อหลักสูตรที่ต้องการเปิด"
                  placeholder="เช่น วิทยาการปัญญาประดิษฐ์"
                  value={nameNew}
                  onChange={(e) => setNameNew(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  fullWidth
                  label="ชื่อปริญญา / หลักสูตร"
                  placeholder="เช่น วท.บ. วิทยาการปัญญาประดิษฐ์"
                  value={degNew}
                  onChange={(e) => setDegNew(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <NumberTextField
                  fullWidth
                  label="จำนวนเทอมต่อปี"
                  value={semesters}
                  onChange={onSemestersChange}
                  error={semesters < 1}
                  helperText={semesters < 1 ? 'อย่างน้อย 1 เทอม' : undefined}
                />
              </Grid>
              <Grid size={12}>
                <Autocomplete
                  options={refOptions}
                  getOptionLabel={progOptionLabel}
                  isOptionEqualToValue={(a, b) => a === b}
                  value={refProg}
                  disabled={!fac}
                  onChange={(_, v) => pickRef(v)}
                  noOptionsText={`ไม่มีหลักสูตร${level}ในคณะนี้`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="หลักสูตรอ้างอิง"
                      helperText={
                        !fac
                          ? 'เลือกคณะก่อน'
                          : `${refOptions.length} หลักสูตร${level}ในคณะ — ใช้ต้นทุน งบประมาณ และจำนวนนิสิตจริงของหลักสูตรนี้เป็นฐาน`
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionLabel>วิธีคิดต้นทุน</SectionLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  color="primary"
                  value={basis}
                  onChange={(_, v: CostBasis | null) => v && setBasis(v)}
                >
                  <ToggleButton value="ref">จากหลักสูตรอ้างอิงเดิม</ToggleButton>
                  <ToggleButton value="manual">คิดต้นทุนด้วยตัวเอง</ToggleButton>
                </ToggleButtonGroup>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  {basis === 'ref'
                    ? 'ต้นทุนรายหมวดรายจ่าย = งบของหลักสูตร + งบสำนักงานเลขาฯ ระดับเดียวกันและส่วนกลางคณะ ปันตามจำนวนนิสิต'
                    : 'แก้ตัวเลขในตารางได้ทุกช่อง (ตั้งต้นจากหลักสูตรอ้างอิง) · ค่าธรรมเนียมรายการหลักและหักสมทบคิดจากอัตรา × นิสิต × เทอม'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionLabel>เงินแผ่นดิน</SectionLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  color="primary"
                  value={mode}
                  onChange={(_, v: RevenueMode | null) => v && setMode(v)}
                >
                  <ToggleButton value="with_government">
                    {REVENUE_MODE_LABEL.with_government}
                  </ToggleButton>
                  <ToggleButton value="without_government">
                    {REVENUE_MODE_LABEL.without_government}
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  {REVENUE_MODE_NOTE[mode]}
                </Typography>
              </Grid>
            </Grid>

            {refProg && <ProgramFeeRates p={refProg} />}
          </CardContent>
        </Card>

        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={<DotTitle color="primary.main">ตารางคำนวณจุดคุ้มทุน</DotTitle>}
                subheader={`${basis === 'ref' ? 'อ้างอิงหลักสูตรเดิม' : 'คิดต้นทุนด้วยตัวเอง'} · ${REVENUE_MODE_LABEL[mode]}`}
                action={
                  <Button
                    variant="contained"
                    disabled={!canSave}
                    onClick={handleCalc}
                    sx={{ mr: 2 }}
                    title={canSave ? undefined : 'ต้องมีจำนวนนิสิต งบประมาณ และต้นทุนก่อน'}
                  >
                    บันทึกผลคำนวณ
                  </Button>
                }
              />
              <CardContent sx={{ px: 0 }}>
                {block && result ? (
                  <CostBlockTable
                    block={block}
                    result={result}
                    mode={mode}
                    editable={basis === 'manual'}
                    onChange={setManual}
                  />
                ) : (
                  <Alert severity="info" variant="outlined" sx={{ mx: 4 }}>
                    เลือกคณะ ระดับ และหลักสูตรอ้างอิง เพื่อดึงต้นทุนจากระบบ — หรือเลือก
                    &quot;คิดต้นทุนด้วยตัวเอง&quot; เพื่อกรอกต้นทุนรายหมวดเอง
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={<DotTitle color="primary.main">กราฟจุดคุ้มทุน</DotTitle>}
                subheader={REVENUE_MODE_LABEL[mode]}
              />
              <CardContent>
                {block && result && block.q > 0 ? (
                  <BreakEvenChart
                    q={block.q}
                    tfc={result.tfc}
                    avc={result.avc ?? 0}
                    rPerHead={result.r ?? 0}
                    qStar={result.qStar}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    กราฟจะแสดงเมื่อมีจำนวนนิสิตและต้นทุน
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={
              <DotTitle color="warning.main">
                การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน
              </DotTitle>
            }
            subheader="ปันต้นทุนคงที่ตามสัดส่วนนิสิต · ต้นทุนผันแปร = AVC × จำนวนนิสิต · รายรับต่อปี = (ค่าธรรมเนียม + เงินแผ่นดิน) × นิสิต × เทอม"
          />
          <CardContent>
            {block && result ? (
              <StudentMixTable
                segs={segs}
                onChange={setSegs}
                tfc={result.tfc}
                avc={result.avc ?? 0}
                mode={mode}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                ต้องมีต้นทุนจากตารางคำนวณก่อน
              </Typography>
            )}
          </CardContent>
        </Card>

        {latest && latestResult && (
          <>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={12}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    title={
                      <DotTitle color="primary.main">ผลที่บันทึกล่าสุด — {latest.name}</DotTitle>
                    }
                    subheader={`${latest.fac || '—'} · ${latest.level} · ${latest.isNew ? 'หลักสูตรใหม่' : 'หลักสูตรเดิม'}`}
                  />
                  <CardContent>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      {(
                        [
                          [
                            'รายได้รวม (TR)',
                            `${(latestResult.tr / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`,
                            'primary.main',
                          ],
                          [
                            'ต้นทุนรวม (TC)',
                            `${(latestResult.tc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`,
                            'text.primary',
                          ],
                          [
                            'ต้นทุนคงที่ (TFC)',
                            `${(latest.tfc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`,
                            'warning.main',
                          ],
                          [
                            'ต้นทุนผันแปร (TVC)',
                            `${(latest.tvc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`,
                            'text.primary',
                          ],
                          ['ผันแปร/หัว (AVC)', `${fmtB(latest.avc)} บ./คน`, 'text.primary'],
                          ['นิสิตจริง (Q)', `${fmtN(latest.q)} คน`, 'text.primary'],
                        ] as const
                      ).map(([label, val, color]) => (
                        <Grid key={label} size={4}>
                          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              noWrap
                            >
                              {label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                              {val}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {(['with_government', 'without_government'] as RevenueMode[]).map((m) => {
                      const r = m === 'with_government' ? latest.withGov : latest.withoutGov;
                      const isOk = r.qStar !== null && latest.q >= r.qStar;
                      const full = r.qStarStatus === 'full_cost_recovery';

                      return (
                        <Box
                          key={m}
                          sx={{
                            border: 1.5,
                            borderColor: m === 'with_government' ? 'primary.main' : 'warning.main',
                            borderRadius: 2,
                            p: 2,
                            mb: 2,
                            bgcolor: isOk
                              ? 'var(--mui-palette-success-lightOpacity)'
                              : 'var(--mui-palette-error-lightOpacity)',
                          }}
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              fontWeight: 800,
                              color: m === 'with_government' ? 'primary.main' : 'warning.main',
                            }}
                          >
                            {m === 'with_government'
                              ? 'กรณีรวมเงินแผ่นดิน'
                              : 'กรณีไม่รวมเงินแผ่นดิน'}
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid size={6}>
                              <Typography variant="body2">
                                รายได้/หัว (R): <b>{fmtB(r.r ?? 0)}</b> บ.
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography variant="body2">
                                ส่วนเกิน/หัว (CM):{' '}
                                <b
                                  style={{
                                    color:
                                      (r.cm ?? 0) > 0
                                        ? 'var(--mui-palette-success-main)'
                                        : 'var(--mui-palette-error-main)',
                                  }}
                                >
                                  {fmtB(r.cm ?? 0)}
                                </b>{' '}
                                บ.
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography variant="body2">
                                จุดคุ้มทุน (Q*):{' '}
                                <b style={{ color: 'var(--mui-palette-error-main)' }}>
                                  {r.qStar ? `${fmtN(r.qStar)} คน` : '—'}
                                </b>{' '}
                                {full && (
                                  <Chip
                                    size="small"
                                    label="คืนทุนเต็ม (TC/R)"
                                    color="warning"
                                    sx={{ height: 16, fontSize: 10 }}
                                  />
                                )}
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography variant="body2">
                                กำไร:{' '}
                                <b
                                  style={{
                                    color:
                                      (r.profitPct ?? 0) >= 0
                                        ? 'var(--mui-palette-success-main)'
                                        : 'var(--mui-palette-error-main)',
                                  }}
                                >
                                  {(r.profitPct ?? 0) >= 0 ? '+' : ''}
                                  {(r.profitPct ?? 0).toFixed(1)}%
                                </b>
                              </Typography>
                            </Grid>
                          </Grid>
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 1,
                              fontWeight: 700,
                              color: isOk ? 'success.main' : 'error.main',
                            }}
                          >
                            {!r.qStar
                              ? '⚠ คำนวณไม่ได้'
                              : `${full ? '⚠ ไม่คุ้มทุน (CM ≤ 0) · ใช้เป้าคืนทุนเต็ม (TC/R) · ' : ''}${
                                  isOk
                                    ? `✓ เกินจุดคุ้มทุน +${fmtN(latest.q - r.qStar)} คน`
                                    : `⚠ ต้องเพิ่มอีก ${fmtN(r.qStar - latest.q)} คน`
                                }`}
                          </Typography>
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <AdmissionBreakdownCard qStar={latestResult.qStar} programName={latest.name} />

            <Card sx={{ mt: 4 }}>
              <CardHeader
                title={<DotTitle color="warning.main">ประวัติการคำนวณ</DotTitle>}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirm('history')}
                    sx={{ mr: 2, borderRadius: 5 }}
                  >
                    ล้าง
                  </Button>
                }
              />
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>เวลา</TableCell>
                        <TableCell>หลักสูตร</TableCell>
                        <TableCell>ระดับ</TableCell>
                        <TableCell>ประเภท</TableCell>
                        <TableCell align="right">นิสิต (Q)</TableCell>
                        <TableCell align="right">ผันแปร/หัว (AVC)</TableCell>
                        <TableCell align="right">จุดคุ้มทุน (Q*) รวมแผ่นดิน</TableCell>
                        <TableCell align="right">จุดคุ้มทุน (Q*) ไม่รวมแผ่นดิน</TableCell>
                        <TableCell align="right">สถานะ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((h) => {
                        const okA = h.withGov.qStar !== null && h.q >= h.withGov.qStar;
                        const okB = h.withoutGov.qStar !== null && h.q >= h.withoutGov.qStar;

                        return (
                          <TableRow key={h.id} hover>
                            <TableCell sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                              {h.time}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={h.name}
                            >
                              {h.name}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{h.level || '—'}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={h.isNew ? 'ใหม่' : 'เดิม'}
                                color={h.isNew ? 'primary' : 'warning'}
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            </TableCell>
                            <TableCell align="right">{fmtN(h.q)}</TableCell>
                            <TableCell align="right" sx={{ color: 'warning.main' }}>
                              {fmtB(h.avc)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: okA ? 'success.main' : 'error.main' }}
                            >
                              {h.withGov.qStar ? fmtN(h.withGov.qStar) : '—'}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: okB ? 'success.main' : 'error.main' }}
                            >
                              {h.withoutGov.qStar ? fmtN(h.withoutGov.qStar) : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={okA ? '✓' : '⚠'}
                                color={okA ? 'success' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}

        {!latest && (
          <Alert severity="info" variant="outlined">
            กด &quot;บันทึกผลคำนวณ&quot; เพื่อเก็บผลไว้ในประวัติ เปิดใช้งานปุ่มออกรายงาน PDF
            และใช้จุดคุ้มทุนในหน้าแผนการรับนิสิต
          </Alert>
        )}
      </Box>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm === 'form' ? 'ล้างฟอร์ม?' : 'ล้างประวัติการคำนวณ?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'form'
              ? 'ข้อมูลหลักสูตร หลักสูตรอ้างอิง ต้นทุนที่กรอกเอง และตารางสัดส่วนนิสิตจะถูกล้างกลับเป็นค่าตั้งต้น (ประวัติที่บันทึกไว้ไม่หาย)'
              : `ประวัติทั้งหมด (${history.length} รายการ) จะถูกลบออกจากเครื่องนี้ถาวร และหน้า "แผนการรับนิสิต" จะเลือกผลคำนวณเหล่านี้ไม่ได้อีก`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirm === 'form') {
                clearForm();
                setToast('ล้างฟอร์มแล้ว');
              } else {
                setHistory([]);
                saveHistory([]);
                setToast('ล้างประวัติการคำนวณแล้ว');
              }

              setConfirm(null);
            }}
          >
            {confirm === 'form' ? 'ล้างฟอร์ม' : 'ล้างประวัติ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />

      {/* รายงานสำหรับพิมพ์เท่านั้น — ซ่อนบนหน้าจอปกติ แสดงเฉพาะตอนสั่งพิมพ์ (window.print) */}
      {latest && (
        <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
          <ProgramReport entry={latest} />
        </Box>
      )}
    </Box>
  );
};

export default ScenarioProgramView;
