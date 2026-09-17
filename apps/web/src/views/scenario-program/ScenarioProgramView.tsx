'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import { calcBreakEvenBothModes, type RevenueMode } from '@beps/calc-engine';

import BreakEvenChart from './BreakEvenChart';
import ProgramReport from './ProgramReport';
import AdmissionBreakdown from './AdmissionBreakdown';
import { PG_DATA, EDUCATION_LEVELS } from './programData';
import type { ProgramHistoryEntry } from './types';
import type { ProgRow } from '@/data/mockup';

/** ชื่อหลักสูตรซ้ำกันได้ในคณะเดียวกัน (คนละระดับ/ปริญญา) — ต่อท้ายระดับให้แยกแยะได้ในดรอปดาวน์ */
const progOptionLabel = (p: ProgRow) => `${p.prog} (${p.lvl})`;

/** จุดกลมนำหน้าชื่อการ์ด — ตาม .card-title .dot ใน mockup/assets/beps.css */
const TitleWithDot = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box
      component="span"
      sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }}
    />
    {children}
  </Box>
);

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

const ScenarioProgramView = () => {
  const [progType, setProgType] = useState<'old' | 'new'>('old');
  const [level, setLevel] = useState<string>(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
  const [facSel, setFacSel] = useState<string | null>(null);
  const [progSel, setProgSel] = useState<ProgRow | null>(null);
  const [nameNew, setNameNew] = useState('');
  const [facNew, setFacNew] = useState('');

  const [q, setQ] = useState(0);
  const [st, setSt] = useState(0);
  const [own, setOwn] = useState(0);
  const [tfc, setTfc] = useState(0);
  const [tvc, setTvc] = useState(0);
  const [autofilled, setAutofilled] = useState(false);

  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [history, setHistory] = useState<ProgramHistoryEntry[]>([]);

  const facultyOptions = useMemo(() => PG_DATA.map((g) => g.faculty), []);
  const programOptions = useMemo(
    () => PG_DATA.find((g) => g.faculty === facSel)?.programs ?? [],
    [facSel],
  );

  const isNew = progType === 'new';
  const tr = st + own;
  const tc = tfc + tvc;
  const avc = q > 0 ? tvc / q : 0;
  const canCalc = q > 0 && tr > 0 && tc > 0;

  const resetNumbers = () => {
    setQ(0);
    setSt(0);
    setOwn(0);
    setTfc(0);
    setTvc(0);
    setAutofilled(false);
  };

  const onTypeChange = (v: 'old' | 'new') => {
    setProgType(v);
    setFacSel(null);
    setProgSel(null);
    resetNumbers();
  };

  const onFacChange = (v: string | null) => {
    setFacSel(v);
    setProgSel(null);
    resetNumbers();
  };

  const onProgChange = (p: ProgRow | null) => {
    setProgSel(p);

    if (!p) return;

    setLevel(p.lvl);
    setQ(p.Q);
    setSt(Math.round(p.st));
    setOwn(Math.round(p.own));
    setTfc(Math.round(p.TFC));
    setTvc(Math.round(p.TVC));
    setAutofilled(true);
  };

  const name = isNew ? nameNew || 'หลักสูตรใหม่' : progSel?.prog || 'ไม่ระบุ';
  const fac = isNew ? facNew : facSel || '';

  const handleCalc = () => {
    if (!canCalc) return;

    const both = calcBreakEvenBothModes({ q, governmentBudget: st, incomeBudget: own, tfc, tvc });

    const entry: ProgramHistoryEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('th-TH'),
      name,
      fac,
      level,
      isNew,
      q,
      tr,
      tfc,
      tvc,
      avc,
      withGov: both.with_government,
      withoutGov: both.without_government,
      mode,
    };

    setHistory((prev) => [entry, ...prev]);
  };

  const latest = history[0];
  const latestResult = latest ? (latest.mode === 'with_government' ? latest.withGov : latest.withoutGov) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Typography variant="h4">🎓 คำนวณจุดคุ้มทุนรายหลักสูตร (กรอกเอง)</Typography>
          <Button
            variant="contained"
            disabled={!latest}
            startIcon={<i className="ri-printer-line" />}
            onClick={() => window.print()}
            title={latest ? 'เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ — เลือก "บันทึกเป็น PDF" ได้' : 'คำนวณก่อนเพื่อเปิดใช้งาน'}
          >
            🖨 ออกรายงาน PDF
          </Button>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={<TitleWithDot>กรอกข้อมูลหลักสูตร</TitleWithDot>}
            subheader="เลือกประเภท — หลักสูตรเดิมดึงข้อมูลจากระบบอัตโนมัติ · หลักสูตรใหม่กรอกเอง"
          />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <RadioGroup row value={progType} onChange={(e) => onTypeChange(e.target.value as 'old' | 'new')}>
                  <FormControlLabel value="old" control={<Radio />} label="📚 หลักสูตรเดิม (Existing)" />
                  <FormControlLabel value="new" control={<Radio />} label="✎ หลักสูตรใหม่ (New)" />
                </RadioGroup>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={EDUCATION_LEVELS}
                  value={level}
                  onChange={(_, v) => v && setLevel(v)}
                  renderInput={(params) => <TextField {...params} label="🏫 ระดับการศึกษา" />}
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              {!isNew ? (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      options={facultyOptions}
                      value={facSel}
                      onChange={(_, v) => onFacChange(v)}
                      renderInput={(params) => <TextField {...params} label="🏫 สังกัดคณะ / วิทยาลัย" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      options={programOptions}
                      getOptionLabel={progOptionLabel}
                      isOptionEqualToValue={(a, b) => a === b}
                      value={progSel}
                      disabled={!facSel}
                      onChange={(_, v) => onProgChange(v)}
                      renderInput={(params) => <TextField {...params} label="📚 ชื่อหลักสูตร" />}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="✎ ชื่อหลักสูตร (กรอกเอง)"
                      placeholder="เช่น วิทยาการปัญญาประดิษฐ์"
                      value={nameNew}
                      onChange={(e) => setNameNew(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="🏫 สังกัดคณะ (กรอกเอง)"
                      placeholder="เช่น คณะวิทยาศาสตร์"
                      value={facNew}
                      onChange={(e) => setFacNew(e.target.value)}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
                📊 ข้อมูลตัวเลข{' '}
                {autofilled && <Chip size="small" color="success" label="✓ ดึงจากระบบ" sx={{ ml: 1, height: 18 }} />}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <TextField fullWidth type="number" label="จำนวนนิสิต (Q)" value={q || ''} onChange={(e) => setQ(Number(e.target.value) || 0)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <TextField fullWidth type="number" label="งบเงินแผ่นดิน" value={st || ''} onChange={(e) => setSt(Number(e.target.value) || 0)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <TextField fullWidth type="number" label="งบเงินรายได้" value={own || ''} onChange={(e) => setOwn(Number(e.target.value) || 0)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <TextField fullWidth type="number" label="TFC รวม" value={tfc || ''} onChange={(e) => setTfc(Number(e.target.value) || 0)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <TextField fullWidth type="number" label="TVC รวม" value={tvc || ''} onChange={(e) => setTvc(Number(e.target.value) || 0)} />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Button variant="contained" disabled={!canCalc} onClick={handleCalc} sx={{ maxWidth: 240 }}>
                ▶ คำนวณจุดคุ้มทุน
              </Button>
              <ToggleButtonGroup size="small" exclusive color="primary" value={mode} onChange={(_, v) => v && setMode(v)}>
                <ToggleButton value="with_government">รวมเงินแผ่นดิน</ToggleButton>
                <ToggleButton value="without_government">ไม่รวมเงินแผ่นดิน</ToggleButton>
              </ToggleButtonGroup>
              {!canCalc && (
                <Typography variant="caption" color="text.disabled">
                  กรุณากรอก จำนวนนิสิต งบประมาณ และต้นทุน ให้ครบก่อนคำนวณ
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {latest && latestResult && (
          <>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    title={<TitleWithDot>{latest.name}</TitleWithDot>}
                    subheader={`${latest.fac || '—'} · ${latest.level} · ${latest.isNew ? 'หลักสูตรใหม่' : 'หลักสูตรเดิม'}`}
                  />
                  <CardContent>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      {(
                        [
                          ['รายได้รวม (TR)', `${(latestResult.tr / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`, 'primary.main'],
                          ['ต้นทุนรวม (TC)', `${(latestResult.tc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`, 'text.primary'],
                          ['ต้นทุนคงที่ (TFC)', `${(latest.tfc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`, 'warning.main'],
                          ['ต้นทุนผันแปร (TVC)', `${(latest.tvc / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`, 'text.primary'],
                          ['AVC ต่อหน่วย', `${fmtB(latest.avc)} บ./คน`, 'text.primary'],
                          ['นิสิตจริง (Q)', `${fmtN(latest.q)} คน`, 'text.primary'],
                        ] as const
                      ).map(([label, val, color]) => (
                        <Grid key={label} size={4}>
                          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
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
                            bgcolor: isOk ? 'var(--mui-palette-success-lightOpacity)' : 'var(--mui-palette-error-lightOpacity)',
                          }}
                        >
                          <Typography variant="overline" sx={{ fontWeight: 800, color: m === 'with_government' ? 'primary.main' : 'warning.main' }}>
                            {m === 'with_government' ? 'กรณีรวมเงินแผ่นดิน' : 'กรณีไม่รวมเงินแผ่นดิน'}
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid size={6}>
                              <Typography variant="body2">
                                R/หัว: <b>{fmtB(r.r ?? 0)}</b> บ.
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography variant="body2">
                                CM/หัว:{' '}
                                <b style={{ color: (r.cm ?? 0) > 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                                  {fmtB(r.cm ?? 0)}
                                </b>{' '}
                                บ.
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
                                กำไร:{' '}
                                <b style={{ color: (r.profitPct ?? 0) >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                                  {(r.profitPct ?? 0) >= 0 ? '+' : ''}
                                  {(r.profitPct ?? 0).toFixed(1)}%
                                </b>
                              </Typography>
                            </Grid>
                          </Grid>
                          <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: isOk ? 'success.main' : 'error.main' }}>
                            {!r.qStar
                              ? '⚠ คำนวณไม่ได้'
                              : `${full ? '⚠ CM≤0 · ใช้ TC÷R · ' : ''}${
                                  isOk ? `✓ เกินจุดคุ้มทุน +${fmtN(latest.q - r.qStar)} คน` : `⚠ ต้องเพิ่มอีก ${fmtN(r.qStar - latest.q)} คน`
                                }`}
                          </Typography>
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    title={<TitleWithDot>กราฟจุดคุ้มทุน</TitleWithDot>}
                    subheader={`โหมด: ${latest.mode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'}`}
                  />
                  <CardContent>
                    <BreakEvenChart q={latest.q} tfc={latest.tfc} avc={latest.avc} rPerHead={latestResult.r ?? 0} qStar={latestResult.qStar} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <AdmissionBreakdown qStar={latestResult.qStar} programName={latest.name} />

            <Card sx={{ mt: 4 }}>
              <CardHeader
                title={<TitleWithDot>ประวัติการคำนวณ</TitleWithDot>}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setHistory([])}
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
                        <TableCell align="right">Q</TableCell>
                        <TableCell align="right">AVC</TableCell>
                        <TableCell align="right">Q* รวมแผ่นดิน</TableCell>
                        <TableCell align="right">Q* ไม่รวม</TableCell>
                        <TableCell align="right">สถานะ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((h) => {
                        const okA = h.withGov.qStar !== null && h.q >= h.withGov.qStar;
                        const okB = h.withoutGov.qStar !== null && h.q >= h.withoutGov.qStar;

                        return (
                          <TableRow key={h.id} hover>
                            <TableCell sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>{h.time}</TableCell>
                            <TableCell sx={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.name}>
                              {h.name}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{h.level || '—'}</TableCell>
                            <TableCell>
                              <Chip size="small" label={h.isNew ? 'ใหม่' : 'เดิม'} color={h.isNew ? 'primary' : 'warning'} sx={{ height: 18, fontSize: 10 }} />
                            </TableCell>
                            <TableCell align="right">{fmtN(h.q)}</TableCell>
                            <TableCell align="right" sx={{ color: 'warning.main' }}>
                              {fmtB(h.avc)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: okA ? 'success.main' : 'error.main' }}>
                              {h.withGov.qStar ? fmtN(h.withGov.qStar) : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: okB ? 'success.main' : 'error.main' }}>
                              {h.withoutGov.qStar ? fmtN(h.withoutGov.qStar) : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Chip size="small" label={okA ? '✓' : '⚠'} color={okA ? 'success' : 'error'} />
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
            กรอกข้อมูลหลักสูตรแล้วกด &quot;คำนวณจุดคุ้มทุน&quot; เพื่อดูผลลัพธ์ กราฟ และเปิดใช้งานปุ่มออกรายงาน PDF
          </Alert>
        )}
      </Box>

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
