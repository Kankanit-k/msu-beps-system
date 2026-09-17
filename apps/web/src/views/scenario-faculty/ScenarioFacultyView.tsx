'use client';

import { useMemo, useState } from 'react';

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

// Calc engine + data
import { calcBreakEvenBothModes, type BreakEvenResult } from '@beps/calc-engine';

import { RAW } from '@/data/mockup';

import CostRowsEditor from './CostRowsEditor';
import { TFC_PRESETS, TVC_PRESETS, newCostRow, sumCostRows, type CostRow } from './costPresets';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number, d = 2) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });

interface SavedScenario {
  id: number;
  name: string;
  q: number;
  tfc: number;
  avc: number;
  withGov: BreakEvenResult;
  withoutGov: BreakEvenResult;
}

const ScenarioFacultyView = () => {
  const [facultyName, setFacultyName] = useState<string | null>(null);
  const [q, setQ] = useState<number>(0);
  const [govBudget, setGovBudget] = useState<number>(0);
  const [incomeBudget, setIncomeBudget] = useState<number>(0);
  const [tfcRows, setTfcRows] = useState<CostRow[]>([]);
  const [tvcRows, setTvcRows] = useState<CostRow[]>([]);
  const [results, setResults] = useState<{ withGov: BreakEvenResult; withoutGov: BreakEvenResult } | null>(null);
  const [saved, setSaved] = useState<SavedScenario[]>([]);

  const facultyOptions = useMemo(() => RAW.FACS.map((f) => f.name), []);

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
      <Card
        variant="outlined"
        sx={{
          borderColor: color,
          borderWidth: 1.5,
          bgcolor: isOk ? 'var(--mui-palette-success-lightOpacity)' : 'var(--mui-palette-error-lightOpacity)',
        }}
      >
        <CardContent>
          <Typography variant="overline" sx={{ color, fontWeight: 800 }}>
            {title}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <Typography variant="body2">
                R/หัว: <b>{fmtB(r.r ?? 0)}</b>
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2">
                CM/หัว:{' '}
                <b style={{ color: (r.cm ?? 0) > 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                  {fmtB(r.cm ?? 0)}
                </b>
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2">
                Q*: <b style={{ color: 'var(--mui-palette-error-main)' }}>{r.qStar ? `${fmtN(r.qStar)} คน` : '—'}</b>{' '}
                {full && <Chip size="small" label="TC÷R" color="warning" sx={{ height: 16, fontSize: 10 }} />}
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2">
                ส่วนเกิน:{' '}
                <b style={{ color: r.profit >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                  {r.profit >= 0 ? '+' : '−'}
                  {fmtM(Math.abs(r.profit))} ล.
                </b>
              </Typography>
            </Grid>
          </Grid>
          <Typography
            variant="body2"
            sx={{ mt: 1.5, fontWeight: 700, color: isOk ? 'success.main' : 'error.main' }}
          >
            {!r.qStar
              ? '⚠ คำนวณไม่ได้'
              : `${full ? '⚠ CM≤0 · ใช้ TC÷R · ' : ''}${
                  isOk ? `✓ เกินจุดคุ้มทุน +${fmtN(q - r.qStar)} คน` : `⚠ ขาดอีก ${fmtN(r.qStar - q)} คน`
                }`}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4">✏️ คำนวณจุดคุ้มทุนรายคณะ / หน่วยงาน (กรอกเอง)</Typography>

      <Card>
        <CardHeader
          title="ขั้นตอนที่ 1 — เลือกคณะ / หน่วยงาน"
          subheader="เลือกจากระบบเพื่อดึงข้อมูลอัตโนมัติ หรือกรอกเอง แล้วปรับแก้ได้"
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete
                options={facultyOptions}
                value={facultyName}
                onChange={(_, v) => onFacultyChange(v)}
                renderInput={(params) => <TextField {...params} label="📋 เลือกคณะจากระบบ" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.33 }}>
              <TextField
                fullWidth
                type="number"
                label="จำนวนนิสิต (Q)"
                value={q || ''}
                onChange={(e) => setQ(Number(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.33 }}>
              <TextField
                fullWidth
                type="number"
                label="งบเงินแผ่นดิน (บาท)"
                value={govBudget || ''}
                onChange={(e) => setGovBudget(Number(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2.34 }}>
              <TextField
                fullWidth
                type="number"
                label="งบเงินรายได้ (บาท)"
                value={incomeBudget || ''}
                onChange={(e) => setIncomeBudget(Number(e.target.value) || 0)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="ขั้นตอนที่ 2 — ต้นทุนคงที่ (TFC)"
              subheader="เลือกหมวดจากรายการ หรือกรอกเอง"
              action={
                <Typography variant="body2" sx={{ pr: 2, color: 'primary.main', fontWeight: 700 }}>
                  รวม {fmtB(tfc)} บาท
                </Typography>
              }
            />
            <CardContent>
              <CostRowsEditor rows={tfcRows} presets={TFC_PRESETS} onChange={setTfcRows} addLabel="+ เพิ่มรายการ TFC" />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="ขั้นตอนที่ 3 — ต้นทุนผันแปร (TVC)"
              subheader="เลือกหมวดจากรายการ หรือกรอกเอง"
              action={
                <Typography variant="body2" sx={{ pr: 2, color: 'success.main', fontWeight: 700 }}>
                  รวม {fmtB(tvc)} บาท
                </Typography>
              }
            />
            <CardContent>
              <CostRowsEditor rows={tvcRows} presets={TVC_PRESETS} onChange={setTvcRows} addLabel="+ เพิ่มรายการ TVC" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="สรุปตัวเลขก่อนคำนวณ" />
            <CardContent>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  ['Q (นิสิต)', q > 0 ? fmtN(q) : '—'],
                  ['TR รวม', tr > 0 ? fmtB(tr) : '—'],
                  ['TC รวม', tc > 0 ? fmtB(tc) : '—'],
                  ['TFC', tfc > 0 ? fmtB(tfc) : '—'],
                  ['TVC', tvc > 0 ? fmtB(tvc) : '—'],
                  ['AVC/หัว', avc > 0 ? fmtB(avc) : '—'],
                ].map(([label, val]) => (
                  <Grid key={label} size={4}>
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {val}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Box sx={{ p: 1.5, bgcolor: 'var(--mui-palette-primary-lightOpacity)', borderRadius: 1 }}>
                    <Typography variant="caption" color="primary.main" display="block">
                      R/หัว — รวมแผ่นดิน
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {rIn > 0 ? fmtB(rIn) : '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box sx={{ p: 1.5, bgcolor: 'var(--mui-palette-warning-lightOpacity)', borderRadius: 1 }}>
                    <Typography variant="caption" color="warning.main" display="block">
                      R/หัว — ไม่รวมแผ่นดิน
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {rEx > 0 ? fmtB(rEx) : '—'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Button fullWidth variant="contained" disabled={!canCalc} onClick={handleCalc}>
                ▶ คำนวณจุดคุ้มทุน
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="ผลการคำนวณ" />
            <CardContent>
              {!results ? (
                <Typography color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                  กรอกข้อมูลครบแล้วกดคำนวณ
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {renderResultCard('กรณีรวมเงินแผ่นดิน', 'var(--mui-palette-primary-main)', results.withGov)}
                  {renderResultCard('กรณีไม่รวมเงินแผ่นดิน', 'var(--mui-palette-warning-main)', results.withoutGov)}
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
          title="รายการที่บันทึก"
          action={
            <Button size="small" color="error" onClick={() => setSaved([])} sx={{ mr: 2 }}>
              ล้างทั้งหมด
            </Button>
          }
        />
        <CardContent sx={{ p: saved.length ? 0 : 3 }}>
          {saved.length === 0 ? (
            <Alert severity="info" variant="outlined">
              ยังไม่มีรายการ
            </Alert>
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
                          sx={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={s.name}
                        >
                          {s.name}
                        </TableCell>
                        <TableCell align="right">{fmtN(s.q)}</TableCell>
                        <TableCell align="right">{fmtM(s.tfc)}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>
                          {fmtB(s.avc)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: okA ? 'success.main' : 'error.main' }}>
                          {s.withGov.qStar ? fmtN(s.withGov.qStar) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: okB ? 'success.main' : 'error.main' }}>
                          {s.withoutGov.qStar ? fmtN(s.withoutGov.qStar) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={okA ? '✓ คุ้ม' : '⚠ ไม่คุ้ม'} color={okA ? 'success' : 'error'} />
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
