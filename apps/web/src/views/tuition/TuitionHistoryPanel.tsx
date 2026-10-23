'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

// MUI Imports
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import type { ApexOptions } from 'apexcharts';

// Component Imports
import KpiCard from '@components/KpiCard';
import FacultyFilter from '@components/FacultyFilter';
import { BEPS, KPI_COLORS, LegendItem } from '@components/ChartBits';
import { fmtInt, fmtMillion } from '@views/breakeven/calc';
import { EDUCATION_LEVELS } from '@views/scenario-program/programData';

import {
  HISTORY,
  HISTORY_ROWS,
  HISTORY_YEARS,
  LAST_YEAR,
  MATCH_LABEL,
  METHOD_META,
  PROGS_WITHOUT_HISTORY,
  gapPct,
  type HistoryRow,
  type TuitionYear,
} from './historyData';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const COLORS = { m1: BEPS.compare.dark, m2: KPI_COLORS.orange, billed: BEPS.revenue.dark };
const METHODS = ['m1', 'm2', 'billed'] as const;

const LEVELS = EDUCATION_LEVELS.filter((l) => HISTORY_ROWS.some((r) => r.prog.lvl === l));

/** 'all' หรือชื่อระดับ */
type LevelFilter = string;

const FACULTIES = [...new Set(HISTORY_ROWS.map((r) => r.prog.fac))].sort((a, b) =>
  a.localeCompare(b, 'th'),
);

const fmtPct = (v: number | null) =>
  v === null
    ? '—'
    : `${v > 0 ? '+' : ''}${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

/** ส่วนต่างไม่เกิน ±5% ถือว่าใกล้ยอดจริง */
const gapColor = (v: number | null) =>
  v === null
    ? 'text.disabled'
    : Math.abs(v) <= 5
      ? 'success.main'
      : v > 0
        ? 'warning.main'
        : 'error.main';

const GapText = ({ v }: { v: number | null }) => (
  <Typography component="span" variant="body2" fontWeight={600} color={gapColor(v)} className="num">
    {fmtPct(v)}
  </Typography>
);

/** กราฟเส้น 3 วิธี รายปีการศึกษา (ล้านบาท) */
const TrendChart = ({ years, height = 260 }: { years: TuitionYear[]; height?: number }) => {
  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    colors: METHODS.map((m) => COLORS[m]),
    stroke: { width: [2, 2, 3], dashArray: [0, 5, 0], curve: 'straight' },
    markers: { size: 4 },
    legend: { show: false },
    dataLabels: { enabled: false },
    xaxis: { categories: years.map((y) => String(y.y)) },
    yaxis: {
      labels: { formatter: (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 }) },
      title: { text: 'ล้านบาท' },
    },
    tooltip: {
      shared: true,
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลบ.`,
      },
    },
    grid: { borderColor: 'var(--mui-palette-divider)' },
  };

  return (
    <Box>
      <AppReactApexCharts
        type="line"
        height={height}
        width="100%"
        options={options}
        series={METHODS.map((m) => ({
          name: METHOD_META[m].short,
          data: years.map((y) => Number((y[m] / 1e6).toFixed(2))),
        }))}
      />
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap justifyContent="center">
        {METHODS.map((m) => (
          <LegendItem key={m} color={COLORS[m]} label={METHOD_META[m].label} />
        ))}
      </Stack>
    </Box>
  );
};

/** ตารางรายปี: นิสิต + ยอด 3 วิธี + ส่วนต่างเทียบยอดจริง */
const YearTable = ({ years }: { years: TuitionYear[] }) => (
  <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>ปีการศึกษา</TableCell>
          <TableCell align="right">นิสิต ภาค 1</TableCell>
          <TableCell align="right">มีบิล</TableCell>
          <TableCell align="right">วิธี 1 (ลบ.)</TableCell>
          <TableCell align="right">วิธี 2 (ลบ.)</TableCell>
          <TableCell align="right">เรียกเก็บจริง (ลบ.)</TableCell>
          <TableCell align="right">1 เทียบจริง</TableCell>
          <TableCell align="right">2 เทียบจริง</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {years.map((y) => (
          <TableRow key={y.y}>
            <TableCell sx={{ fontWeight: 600 }}>{y.y}</TableCell>
            <TableCell align="right" className="num">
              {fmtInt(y.n)}
            </TableCell>
            <TableCell align="right" className="num">
              {fmtInt(y.billedN)}
            </TableCell>
            <TableCell align="right" className="num">
              {fmtMillion(y.m1)}
            </TableCell>
            <TableCell align="right" className="num">
              {fmtMillion(y.m2)}
            </TableCell>
            <TableCell align="right" className="num" sx={{ fontWeight: 700 }}>
              {y.billed ? fmtMillion(y.billed) : 'ไม่มีบิล'}
            </TableCell>
            <TableCell align="right">
              <GapText v={gapPct(y.m1, y.billed)} />
            </TableCell>
            <TableCell align="right">
              <GapText v={gapPct(y.m2, y.billed)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={700} className="num">
      {value}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.disabled">
        {hint}
      </Typography>
    )}
  </Box>
);

const ProgramHistoryDialog = ({
  row,
  onClose,
}: {
  row: HistoryRow | null;
  onClose: () => void;
}) => {
  if (!row) return null;
  const { prog, h, last } = row;

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {prog.prog}
        <Typography variant="body2" color="text.secondary">
          {prog.deg} · {prog.fac} · {prog.lvl}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Stat
              label="อัตราตามหลักสูตร (ทะเบียน)"
              value={h.rate === null ? '—' : fmtInt(h.rate)}
              hint="บาท/ภาค · นิสิตไทย"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Stat
              label="ภาคการศึกษาตลอดหลักสูตร"
              value={h.sems === null ? '—' : String(h.sems)}
              hint="ปีที่เรียน × ภาค/ปี ตามทะเบียน"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Stat
              label={`นิสิต ${LAST_YEAR}: ทะเบียน / ระบบ`}
              value={`${fmtInt(last.n)} / ${fmtInt(prog.Q)}`}
              hint="ระบบ = Q ปีงบ 2568"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Stat
              label={`เรียกเก็บจริง ${LAST_YEAR} / งบรายได้ในระบบ`}
              value={`${fmtMillion(last.billed)} / ${fmtMillion(prog.own)} ลบ.`}
              hint="งบรายได้รวมรายการอื่นนอกจากค่าเทอม"
            />
          </Grid>
        </Grid>

        <TrendChart years={h.years} />
        <YearTable years={h.years} />

        <Typography variant="subtitle2" sx={{ mt: 4, mb: 1 }}>
          ชื่อหลักสูตรในทะเบียนที่รวมเข้ามา ({h.regs.length})
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {h.regs.map((r) => (
            <Chip
              key={r.name}
              size="small"
              variant="tonal"
              color={r.how === 'exact' || r.how === 'prefix' ? 'primary' : 'warning'}
              label={r.name}
              title={MATCH_LABEL[r.how]}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.disabled">
          สีส้ม = จับคู่จากชื่อที่สั้นกว่าหรือกำหนดคู่เอง ควรตรวจสอบ
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
};

const UNMATCHED_PER_PAGE = 10;

const UnmatchedDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [page, setPage] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>ข้อมูลที่ยังไม่ได้รวมเข้าหลักสูตรในระบบ</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          หลักสูตรในระบบที่ทะเบียนไม่มีข้อมูล ({PROGS_WITHOUT_HISTORY.length})
        </Typography>
        {PROGS_WITHOUT_HISTORY.map((p) => (
          <Typography key={`${p.fac}${p.lvl}${p.prog}`} variant="body2" color="text.secondary">
            • {p.prog} — {p.fac} · {p.lvl} (Q {fmtInt(p.Q)})
          </Typography>
        ))}
        <Typography variant="subtitle2" sx={{ mt: 4, mb: 1 }}>
          ชื่อหลักสูตรในทะเบียนที่จับคู่ไม่ได้ ({HISTORY.unmatched.length}) —
          ส่วนใหญ่เป็นหลักสูตรที่ปิดแล้ว
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ชื่อในทะเบียน</TableCell>
                <TableCell>ระดับ</TableCell>
                <TableCell align="right">นิสิต {HISTORY_YEARS[0]}</TableCell>
                <TableCell align="right">นิสิต {LAST_YEAR}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {HISTORY.unmatched
                .slice(page * UNMATCHED_PER_PAGE, (page + 1) * UNMATCHED_PER_PAGE)
                .map((u) => (
                  <TableRow key={`${u.fac}${u.lvl}${u.name}`}>
                    <TableCell>
                      <Typography variant="body2">{u.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.fac}
                      </Typography>
                    </TableCell>
                    <TableCell>{u.lvl}</TableCell>
                    <TableCell align="right">{fmtInt(u.years[0]!.n)}</TableCell>
                    <TableCell align="right">{fmtInt(u.years[u.years.length - 1]!.n)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={HISTORY.unmatched.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={UNMATCHED_PER_PAGE}
          rowsPerPageOptions={[UNMATCHED_PER_PAGE]}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
};

/** ปีที่ซ่อนบนจอเล็ก — เหลือ 2 ปีล่าสุด */
const hideOnSmall = (i: number) =>
  i < HISTORY_YEARS.length - 2 ? { display: { xs: 'none', md: 'table-cell' } } : {};

const TuitionHistoryPanel = () => {
  const [level, setLevel] = useState<LevelFilter>('all');
  const [facs, setFacs] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [open, setOpen] = useState<HistoryRow | null>(null);
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

  const uni = HISTORY.uni;
  const uniLast = uni[uni.length - 1]!;
  const uniFirst = uni[0]!;
  const matchedN = HISTORY_ROWS.reduce((s, r) => s + r.last.n, 0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return HISTORY_ROWS.filter(
      (r) =>
        (level === 'all' || r.prog.lvl === level) &&
        (!facs.length || facs.includes(r.prog.fac)) &&
        (!q || `${r.prog.fac}${r.prog.prog}${r.prog.deg}`.toLowerCase().includes(q)),
    ).sort((a, b) => b.last.billed - a.last.billed);
  }, [level, facs, query]);

  const pageRows = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          ค่าเทอมรายหลักสูตร{' '}
          <strong>
            ปีการศึกษา {HISTORY_YEARS[0]}–{LAST_YEAR}
          </strong>{' '}
          จากระบบทะเบียน เทียบ 3 วิธี — <strong>วิธี 1</strong> อัตราที่ผูกกับหลักสูตร × นิสิต ·{' '}
          <strong>วิธี 2</strong> อัตรากลุ่มค่าธรรมเนียมของนิสิตแต่ละคน × นิสิต ·{' '}
          <strong>วิธี 3</strong> ยอดตั้งบิลจริง (ไม่ใช่เงินรับ) · รวมภาค 1, 2 และฤดูร้อน ·
          รหัสหลักสูตรทะเบียนหลายรหัส (แผน/แบบ/ปรับปรุง) รวมเป็นหลักสูตรเดียวของระบบ
        </Alert>
        <Alert severity="warning" sx={{ mt: 2 }}>
          อัตราค่าธรรมเนียมในทะเบียน<strong>ไม่มีปีที่มีผล</strong> วิธี 1–2
          ของปีเก่าจึงคิดด้วยอัตราปัจจุบัน ใช้ดูแนวโน้มได้ แต่ยังไม่ใช้แทนตัวเลขในการคำนวณจุดคุ้มทุน
          (ปีงบประมาณ 2568 จากไฟล์จุดคุ้มทุน)
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label={`เรียกเก็บจริง ปีการศึกษา ${LAST_YEAR}`}
          value={`${fmtMillion(uniLast.billed)} ลบ.`}
          unit={`ทั้งมหาวิทยาลัย · ${fmtInt(uniLast.billedN)} คนมีบิล`}
          accent="primary"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label={`เติบโตจากปี ${HISTORY_YEARS[0]}`}
          value={fmtPct(gapPct(uniLast.billed, uniFirst.billed))}
          unit={`ยอดจริง ${fmtMillion(uniFirst.billed)} → ${fmtMillion(uniLast.billed)} ลบ.`}
          accent="success"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label={`วิธี 1 เทียบยอดจริง ปี ${LAST_YEAR}`}
          value={fmtPct(gapPct(uniLast.m1, uniLast.billed))}
          unit={`ปี ${HISTORY_YEARS[0]} ต่าง ${fmtPct(gapPct(uniFirst.m1, uniFirst.billed))} — อัตราปัจจุบันใช้ย้อนหลังไม่ได้`}
          accent="info"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ blockSize: '100%', borderTop: 3, borderTopColor: 'warning.main' }}>
          <CardActionArea sx={{ blockSize: '100%' }} onClick={() => setUnmatchedOpen(true)}>
            <CardContent sx={{ px: 4, py: 3.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                จับคู่กับหลักสูตรในระบบได้
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {HISTORY_ROWS.length} / {HISTORY_ROWS.length + PROGS_WITHOUT_HISTORY.length}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                นิสิตปี {LAST_YEAR} ครอบคลุม {((matchedN / uniLast.n) * 100).toFixed(1)}% ·
                คลิกดูที่ไม่ได้จับคู่
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader
            title="ค่าเทอมทั้งมหาวิทยาลัย 3 วิธี"
            subheader="ล้านบาทต่อปีการศึกษา · รวมทุกหลักสูตรในทะเบียน"
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <TrendChart years={uni} />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <YearTable years={uni} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ md: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={level}
            onChange={(_, v: LevelFilter | null) => {
              if (v) {
                setLevel(v);
                setPage(0);
              }
            }}
            color="primary"
          >
            <ToggleButton value="all">ทั้งหมด</ToggleButton>
            {LEVELS.map((l) => (
              <ToggleButton key={l} value={l}>
                {l}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FacultyFilter
            options={FACULTIES}
            value={facs}
            onChange={(v) => {
              setFacs(v);
              setPage(0);
            }}
            minWidth={280}
          />
          <TextField
            size="small"
            placeholder="ค้นหาหลักสูตร / ปริญญา..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 240 }}
          />
        </Stack>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader
            title="ยอดเรียกเก็บจริงรายหลักสูตร"
            subheader={`ล้านบาท · เรียงจากยอดปี ${LAST_YEAR} มากไปน้อย · คลิกแถวเพื่อดู 3 วิธีรายปี · พบ ${rows.length} จาก ${HISTORY_ROWS.length} หลักสูตร`}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>คณะ / หลักสูตร</TableCell>
                  <TableCell align="right">อัตรา (บ./ภาค)</TableCell>
                  <TableCell align="right">นิสิต {LAST_YEAR}</TableCell>
                  {HISTORY_YEARS.map((y, i) => (
                    <TableCell key={y} align="right" sx={hideOnSmall(i)}>
                      {y}
                    </TableCell>
                  ))}
                  <TableCell align="right">วิธี 1 เทียบจริง</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={HISTORY_YEARS.length + 4}
                      align="center"
                      sx={{ color: 'text.disabled', py: 6 }}
                    >
                      — ไม่พบหลักสูตรที่ตรงกับตัวกรอง ลองล้างคำค้น เลือกระดับ "ทั้งหมด"
                      หรือล้างตัวกรองคณะ —
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((r) => (
                  <TableRow
                    key={`${r.prog.fac}|${r.prog.lvl}|${r.prog.prog}`}
                    hover
                    onClick={() => setOpen(r)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography fontWeight={600} variant="body2">
                        {r.prog.prog}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.prog.fac} · {r.prog.lvl}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" className="num">
                      {r.h.rate === null ? '—' : fmtInt(r.h.rate)}
                    </TableCell>
                    <TableCell align="right" className="num">
                      {fmtInt(r.last.n)}
                    </TableCell>
                    {r.h.years.map((y, i) => (
                      <TableCell
                        key={y.y}
                        align="right"
                        className="num"
                        sx={{ ...hideOnSmall(i), fontWeight: y.y === LAST_YEAR ? 700 : 400 }}
                      >
                        {y.billed ? fmtMillion(y.billed) : '—'}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <GapText v={gapPct(r.last.m1, r.last.billed)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="แถวต่อหน้า"
          />
        </Card>
      </Grid>

      <ProgramHistoryDialog row={open} onClose={() => setOpen(null)} />
      <UnmatchedDialog open={unmatchedOpen} onClose={() => setUnmatchedOpen(false)} />
    </Grid>
  );
};

export default TuitionHistoryPanel;
