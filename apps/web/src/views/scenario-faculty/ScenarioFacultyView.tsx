'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Type Imports
// Calc engine
import { calcBreakEvenBothModes, type BreakEvenResult, type RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes from '@components/DataCaveatNotes';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { computeBreakEven } from '@views/breakeven/calc';

import CostRowsEditor from './CostRowsEditor';
import { TFC_PRESETS, TVC_PRESETS, newCostRow, sumCostRows, type CostRow } from './costPresets';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number, d = 2) =>
  (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });

interface SavedScenario {
  id: number;
  name: string;
  q: number;
  tfc: number;
  avc: number;
  withGov: BreakEvenResult;
  withoutGov: BreakEvenResult;
}

/** ช่องตัวเลขสรุปแบบ .stat-box ของ mockup */
const StatBox = ({
  label,
  value,
  color,
  bgcolor,
}: {
  label: string;
  value: string;
  color?: string;
  bgcolor?: string;
}) => (
  <Box
    sx={{
      p: 3,
      borderRadius: 1,
      border: 1,
      borderColor: 'divider',
      bgcolor: bgcolor ?? 'background.paper',
      blockSize: '100%',
    }}
  >
    <Typography
      sx={{
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
      }}
      color={color ?? 'text.secondary'}
    >
      {label}
    </Typography>
    <Typography sx={{ mt: 1, fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
  </Box>
);

const ScenarioFacultyView = () => {
  // โหมดฐานรายได้บนหัวหน้าจอ — หน้านี้แสดงผลทั้งสองกรณีอยู่แล้ว เก็บ state ไว้ให้หัวหน้าจอตรงกับหน้าอื่น
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [facultyName, setFacultyName] = useState<string | null>(null);
  const [q, setQ] = useState<number>(0);
  const [govBudget, setGovBudget] = useState<number>(0);
  const [incomeBudget, setIncomeBudget] = useState<number>(0);
  const [tfcRows, setTfcRows] = useState<CostRow[]>([]);
  const [tvcRows, setTvcRows] = useState<CostRow[]>([]);
  const [results, setResults] = useState<{
    withGov: BreakEvenResult;
    withoutGov: BreakEvenResult;
  } | null>(null);
  const [saved, setSaved] = useState<SavedScenario[]>([]);

  const uni = computeBreakEven(RAW.UNI, mode);
  const facultyOptions = useMemo(() => RAW.FACS.map((f) => f.name), []);
  const picked = useMemo(() => RAW.FACS.find((f) => f.name === facultyName) ?? null, [facultyName]);

  const tfc = sumCostRows(tfcRows);
  const tvc = sumCostRows(tvcRows);
  const tc = tfc + tvc;
  const tr = govBudget + incomeBudget;
  const avc = q > 0 ? tvc / q : 0;
  const rIn = q > 0 ? tr / q : 0;
  const rEx = q > 0 ? incomeBudget / q : 0;

  const canCalc = q > 0 && tr > 0 && tc > 0;

  const onFacultyChange = (name: string | null) => {
    setFacultyName(name);
    setResults(null);

    if (!name) return;

    const f = RAW.FACS.find((x) => x.name === name);

    if (!f) return;

    setQ(f.Q);
    setGovBudget(Math.round(f.st));
    setIncomeBudget(Math.round(f.own));
    setTfcRows([newCostRow('ต้นทุนคงที่รวม (TFC)', Math.round(f.TFC))]);
    setTvcRows([newCostRow('ต้นทุนผันแปรรวม (TVC)', Math.round(f.TVC))]);
  };

  const handleCalc = () => {
    if (!canCalc) return;

    const both = calcBreakEvenBothModes({ q, governmentBudget: govBudget, incomeBudget, tfc, tvc });

    setResults({ withGov: both.with_government, withoutGov: both.without_government });
  };

  const handleSave = () => {
    if (!results) return;

    setSaved((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: facultyName || 'ไม่ระบุชื่อ',
        q,
        tfc,
        avc,
        withGov: results.withGov,
        withoutGov: results.withoutGov,
      },
    ]);
  };

  const renderResultCard = (title: string, color: string, r: BreakEvenResult) => {
    const isOk = r.qStar !== null && q >= r.qStar;
    const full = r.qStarStatus === 'full_cost_recovery';

    return (
      <Box
        sx={{
          p: 3,
          border: 1.5,
          borderColor: color,
          borderRadius: 1,
          bgcolor: isOk
            ? 'var(--mui-palette-success-lighterOpacity)'
            : 'var(--mui-palette-error-lighterOpacity)',
        }}
      >
        <Typography
          sx={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '.06em', color, mb: 2 }}
        >
          {title.toUpperCase()}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Typography variant="body2">
              R/หัว: <b>{fmtB(r.r ?? 0)}</b>
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2">
              CM/หัว:{' '}
              <b
                style={{
                  color:
                    (r.cm ?? 0) > 0
                      ? 'var(--mui-palette-success-main)'
                      : 'var(--mui-palette-error-main)',
                }}
              >
                {fmtB(r.cm ?? 0)}
              </b>
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2">
              Q*:{' '}
              <b style={{ color: 'var(--mui-palette-error-main)' }}>
                {r.qStar ? `${fmtN(r.qStar)} คน` : '—'}
              </b>{' '}
              {full && (
                <Chip
                  size="small"
                  label="TC/R"
                  color="warning"
                  variant="tonal"
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2">
              ส่วนเกิน:{' '}
              <b
                style={{
                  color:
                    r.profit >= 0
                      ? 'var(--mui-palette-success-main)'
                      : 'var(--mui-palette-error-main)',
                }}
              >
                {r.profit >= 0 ? '+' : '−'}
                {fmtM(Math.abs(r.profit))} ล.
              </b>
            </Typography>
          </Grid>
        </Grid>
        <Typography
          variant="body2"
          sx={{ mt: 2, fontWeight: 700, color: isOk ? 'success.main' : 'error.main' }}
        >
          {!r.qStar
            ? '⚠ คำนวณไม่ได้'
            : `${full ? '⚠ CM≤0 · ใช้ TC/R · ' : ''}${
                isOk
                  ? `✓ เกินจุดคุ้มทุน +${fmtN(q - r.qStar)} คน`
                  : `⚠ ขาดอีก ${fmtN(r.qStar - q)} คน`
              }`}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <PageHeaderBar
        title="คำนวณจุดคุ้มทุนรายคณะ"
        code="W6"
        mode={mode}
        onModeChange={setMode}
        q={uni.q}
        profit={uni.profit}
      />

      {/* หน้านี้คิดจากตัวเลขที่ผู้ใช้กรอก ไม่ได้อ่านจากรอบคำนวณ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง (ตาม mockup) */}
      <DataCaveatNotes profit={uni.profit} limitations={false} />

      <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>
        ✏️ คำนวณจุดคุ้มทุนรายคณะ / หน่วยงาน (กรอกเอง)
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={<DotTitle color="primary.main">ขั้นตอนที่ 1 — เลือกคณะ / หน่วยงาน</DotTitle>}
          subheader="เลือกจากระบบเพื่อดึงข้อมูลอัตโนมัติ หรือกรอกเอง แล้วปรับแก้ได้"
          action={<Chip size="small" variant="tonal" color="primary" label="ข้อมูลอัพเดท" />}
        />
        <CardContent>
          <Grid container spacing={4} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={facultyOptions}
                value={facultyName}
                onChange={(_, v) => onFacultyChange(v)}
                noOptionsText="ไม่พบคณะที่ค้นหา"
                renderInput={(params) => (
                  <TextField {...params} label="📋 เลือกคณะจากระบบ" placeholder="-- เลือกคณะ --" />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                type="number"
                label="จำนวนนิสิต (Q)"
                value={q || ''}
                placeholder="0"
                onChange={(e) => setQ(Number(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.8 }}>
              <TextField
                fullWidth
                type="number"
                label="งบเงินแผ่นดิน (บาท)"
                value={govBudget || ''}
                placeholder="0"
                onChange={(e) => setGovBudget(Number(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.8 }}>
              <TextField
                fullWidth
                type="number"
                label="งบเงินรายได้ (บาท)"
                value={incomeBudget || ''}
                placeholder="0"
                onChange={(e) => setIncomeBudget(Number(e.target.value) || 0)}
              />
            </Grid>
          </Grid>

          {picked && (
            <Box
              sx={{
                mt: 4,
                px: 4,
                py: 2,
                borderRadius: 1,
                border: 1,
                borderColor: 'primary.lightOpacity',
                bgcolor: 'primary.lighterOpacity',
                fontSize: '0.6875rem',
                lineHeight: 1.7,
                color: 'primary.main',
                fontWeight: 500,
              }}
            >
              ✓ ดึงจากระบบ — Q = {fmtN(picked.Q)} คน · แผ่นดิน {fmtB(picked.st)} + รายได้{' '}
              {fmtB(picked.own)} = TR {fmtB(picked.TR)} บ. · TFC {fmtB(picked.TFC)} · TVC{' '}
              {fmtB(picked.TVC)} บ. | <b>Q* ระบบ:</b> รวมแผ่นดิน{' '}
              {picked.Qin ? fmtN(picked.Qin) : '—'} คน · ไม่รวม{' '}
              {picked.Qex ? `${fmtN(picked.Qex)} คน` : 'ไม่มี (CM≤0)'}
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="primary.main">ขั้นตอนที่ 2 — ต้นทุนคงที่ (TFC)</DotTitle>}
              subheader="เลือกหมวดจากรายการ หรือกรอกเอง"
              action={<Chip size="small" variant="tonal" color="primary" label="TFC" />}
            />
            <CardContent>
              <CostRowsEditor
                rows={tfcRows}
                presets={TFC_PRESETS}
                onChange={setTfcRows}
                heading="รายการต้นทุนคงที่"
                totalLabel="รวม TFC"
                addLabel="+ เพิ่มรายการ TFC"
                color="primary"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="success.main">ขั้นตอนที่ 3 — ต้นทุนผันแปร (TVC)</DotTitle>}
              subheader="เลือกหมวดจากรายการ หรือกรอกเอง"
              action={<Chip size="small" variant="tonal" color="success" label="TVC" />}
            />
            <CardContent>
              <CostRowsEditor
                rows={tvcRows}
                presets={TVC_PRESETS}
                onChange={setTvcRows}
                heading="รายการต้นทุนผันแปร"
                totalLabel="รวม TVC"
                addLabel="+ เพิ่มรายการ TVC"
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%', bgcolor: 'action.hover' }}>
            <CardHeader title={<DotTitle color="text.secondary">สรุปตัวเลขก่อนคำนวณ</DotTitle>} />
            <CardContent>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {(
                  [
                    ['Q (นิสิต)', q > 0 ? fmtN(q) : '—', 'primary.main'],
                    ['TR รวม', tr > 0 ? fmtB(tr) : '—', 'primary.main'],
                    ['TC รวม', tc > 0 ? fmtB(tc) : '—', undefined],
                    ['TFC', tfc > 0 ? fmtB(tfc) : '—', 'primary.main'],
                    ['TVC', tvc > 0 ? fmtB(tvc) : '—', 'warning.main'],
                    ['AVC/หัว', avc > 0 ? fmtB(avc) : '—', 'warning.main'],
                  ] as [string, string, string | undefined][]
                ).map(([label, value, color]) => (
                  <Grid key={label} size={{ xs: 6, sm: 4 }}>
                    <StatBox label={label} value={value} color={color} />
                  </Grid>
                ))}
              </Grid>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatBox
                    label="R/หัว — รวมแผ่นดิน"
                    value={rIn > 0 ? fmtB(rIn) : '—'}
                    color="primary.main"
                    bgcolor="primary.lighterOpacity"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatBox
                    label="R/หัว — ไม่รวมแผ่นดิน"
                    value={rEx > 0 ? fmtB(rEx) : '—'}
                    color="warning.main"
                    bgcolor="warning.lighterOpacity"
                  />
                </Grid>
              </Grid>
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!canCalc}
                onClick={handleCalc}
              >
                ▶ คำนวณจุดคุ้มทุน
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader title={<DotTitle color="error.main">ผลการคำนวณ</DotTitle>} />
            <CardContent>
              {!results ? (
                <Typography color="text.disabled" sx={{ textAlign: 'center', py: 12 }}>
                  กรอกข้อมูลครบแล้วกดคำนวณ
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6" color="primary.main">
                    {facultyName || 'ไม่ระบุชื่อ'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
                    นิสิต {fmtN(q)} คน · TFC {fmtM(tfc)} ล. · TVC {fmtM(tvc)} ล. · AVC {fmtB(avc)}{' '}
                    บ./คน
                  </Typography>
                  {renderResultCard(
                    'กรณีรวมเงินแผ่นดิน',
                    'var(--mui-palette-primary-main)',
                    results.withGov,
                  )}
                  {renderResultCard(
                    'กรณีไม่รวมเงินแผ่นดิน',
                    'var(--mui-palette-warning-main)',
                    results.withoutGov,
                  )}
                  <Button variant="contained" color="success" onClick={handleSave}>
                    + บันทึกลงรายการ
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">รายการที่บันทึก</DotTitle>}
          action={
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={saved.length === 0}
              onClick={() => setSaved([])}
              sx={{ borderRadius: 10 }}
            >
              ล้างทั้งหมด
            </Button>
          }
        />
        <CardContent sx={{ p: saved.length ? 0 : undefined }}>
          {saved.length === 0 ? (
            <Typography color="text.disabled" sx={{ textAlign: 'center', py: 6 }}>
              ยังไม่มีรายการ
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>ชื่อ</TableCell>
                    <TableCell align="right">Q</TableCell>
                    <TableCell align="right">TFC(ล.)</TableCell>
                    <TableCell align="right">AVC/หัว</TableCell>
                    <TableCell align="right">Q* รวมแผ่นดิน</TableCell>
                    <TableCell align="right">Q* ไม่รวม</TableCell>
                    <TableCell align="right">สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saved.map((s, i) => {
                    const okA = s.withGov.qStar !== null && s.q >= s.withGov.qStar;
                    const okB = s.withoutGov.qStar !== null && s.q >= s.withoutGov.qStar;

                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            maxInlineSize: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={s.name}
                        >
                          {s.name}
                        </TableCell>
                        <TableCell align="right">{fmtN(s.q)}</TableCell>
                        <TableCell align="right">{fmtM(s.tfc)}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>
                          {fmtB(s.avc)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: okA ? 'success.main' : 'error.main' }}
                        >
                          {s.withGov.qStar ? fmtN(s.withGov.qStar) : '—'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: okB ? 'success.main' : 'error.main' }}
                        >
                          {s.withoutGov.qStar ? fmtN(s.withoutGov.qStar) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            variant="tonal"
                            label={okA ? '✓ คุ้ม' : '⚠ ไม่คุ้ม'}
                            color={okA ? 'success' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScenarioFacultyView;
