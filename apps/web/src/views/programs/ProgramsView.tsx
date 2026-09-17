'use client';

// React Imports
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';

// Type Imports
import type { ThemeColor } from '@core/types';

// Data Imports
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';

// อ้างอิง mockup/W16-programs.html — ทะเบียนหลักสูตรกับวงจรชีวิต (DRAFT → PENDING_APPROVAL → ACTIVE
// → REVISING/SUSPENDED → CLOSED). ชุดข้อมูลจริงมีแค่ RAW.PROGS (230 หลักสูตร) ซึ่งไม่มีคอลัมน์สถานะ/รหัส
// ทะเบียนจริง — สถานะและรหัสอ้างอิงด้านล่างจึงเป็นข้อมูล client-side เท่านั้น (ไม่มี backend รองรับตอนนี้
// ค่าที่แก้ไขจะหายไปเมื่อรีเฟรชหน้า)

type ProgramStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REVISING' | 'SUSPENDED' | 'CLOSED';

const STATUS_META: Record<ProgramStatus, { label: string; color: ThemeColor; calc: boolean; why: string }> = {
  DRAFT: { label: 'ร่างข้อเสนอ', color: 'secondary', calc: false, why: 'ยังไม่ยื่นเข้าสภาวิชาการ · ไม่เข้าสู่การคำนวณจุดคุ้มทุน' },
  PENDING_APPROVAL: {
    label: 'รออนุมัติ',
    color: 'warning',
    calc: false,
    why: 'รอมติสภาวิชาการ/สภามหาวิทยาลัย · ไม่เข้าสู่การคำนวณ',
  },
  ACTIVE: { label: 'เปิดสอน', color: 'success', calc: true, why: 'เข้าสู่การคำนวณจุดคุ้มทุนตามปกติ' },
  REVISING: {
    label: 'กำลังปรับปรุง มคอ.',
    color: 'info',
    calc: true,
    why: 'รุ่นที่ใช้อยู่ยังคำนวณตามปกติ · รุ่นใหม่มีผลเมื่อสภาวิชาการอนุมัติ',
  },
  SUSPENDED: { label: 'งดรับนิสิต', color: 'warning', calc: true, why: 'ยังมีนิสิตคงค้างและมีต้นทุน จึงยังต้องคำนวณต่อ' },
  CLOSED: { label: 'ปิดหลักสูตร', color: 'error', calc: false, why: 'ไม่มีนิสิตและไม่มีต้นทุนแล้ว · เก็บไว้เป็นประวัติเทียบข้ามปี' },
};

const STATUS_FLOW: ProgramStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REVISING', 'CLOSED'];

const FILTERS: { key: 'all' | ProgramStatus; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'ACTIVE', label: 'เปิดสอน' },
  { key: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
  { key: 'DRAFT', label: 'ร่าง' },
  { key: 'REVISING', label: 'ปรับปรุง' },
  { key: 'SUSPENDED', label: 'งดรับ' },
  { key: 'CLOSED', label: 'ปิด' },
];

// ระดับการศึกษา → คำย่อสำหรับสร้างรหัสอ้างอิง (ชุดข้อมูลตัวอย่างไม่มี program_code จากระบบทะเบียนจริง)
const LEVEL_CODE: Record<string, string> = {
  ปริญญาตรี: 'UG',
  'ป.บัณฑิต': 'GD',
  ปริญญาโท: 'M',
  ปริญญาเอก: 'D',
  ประกาศนียบัตร: 'C',
};

const programCode = (p: ProgRow, i: number) => `${LEVEL_CODE[p.lvl] ?? 'X'}-${String(i + 1).padStart(3, '0')}`;

const fmtN = (n: number) => Math.round(n).toLocaleString('th-TH');
const fmtM = (n: number) => `${(n / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ลบ.`;

type LogEntry = { time: string; program: string; text: string };

const ProgramsView = () => {
  const programs = RAW.PROGS;

  const [statuses, setStatuses] = useState<Record<number, ProgramStatus>>(() =>
    Object.fromEntries(programs.map((_, i) => [i, 'ACTIVE'])),
  );
  const [log, setLog] = useState<LogEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | ProgramStatus>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const counts: Record<ProgramStatus, number> = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      ACTIVE: 0,
      REVISING: 0,
      SUSPENDED: 0,
      CLOSED: 0,
    };

    Object.values(statuses).forEach((s) => {
      counts[s] += 1;
    });

    return counts;
  }, [statuses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return programs
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => filterStatus === 'all' || statuses[i] === filterStatus)
      .filter(({ p }) => !q || `${p.prog}${p.fac}${p.deg}`.toLowerCase().includes(q));
  }, [programs, statuses, filterStatus, query]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // programs มีข้อมูลคงที่ 230 รายการเสมอ (ไม่มีทางว่างเปล่า) — selected อยู่ในช่วง [0, programs.length)
  // เสมอเพราะกำหนดจากการคลิกแถวจริงเท่านั้น
  const selectedProgram = programs[selected] ?? programs[0]!;
  const selectedStatus = statuses[selected] ?? 'ACTIVE';

  const notify = (msg: string) => setToast(msg);

  const logChange = (program: string, text: string) => {
    setLog((prev) => [{ time: new Date().toLocaleString('th-TH'), program, text }, ...prev].slice(0, 20));
  };

  const transition = (index: number, next: ProgramStatus) => {
    const prog = programs[index]?.prog ?? '';

    setStatuses((prev) => ({ ...prev, [index]: next }));
    logChange(prog, `เปลี่ยนสถานะเป็น "${STATUS_META[next].label}"`);
    notify(`อัปเดตสถานะ "${prog}" เป็น "${STATUS_META[next].label}" แล้ว (บันทึกเฉพาะหน้าจอนี้)`);
  };

  const handleChangePage = (_: unknown, next: number) => setPage(next);

  const handleChangeRowsPerPage = (e: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const readiness = useMemo(() => {
    const p = selectedProgram;

    return [
      { ok: true, label: 'มีรหัสอ้างอิงหลักสูตร', detail: programCode(p, selected) },
      { ok: true, label: 'ผูกคณะและระดับการศึกษาแล้ว', detail: `${p.fac} — ${p.lvl}` },
      { ok: p.Q > 0, label: 'มีจำนวนนิสิตจากระบบทะเบียน', detail: p.Q > 0 ? `${fmtN(p.Q)} คน` : 'Q = 0 — คำนวณ R และ AVC ไม่ได้' },
      { ok: p.TR > 0, label: 'มีรายได้ค่าธรรมเนียมที่นับได้', detail: p.TR > 0 ? `${fmtM(p.TR)}/ปี` : 'ยังไม่มีรายได้ค่าธรรมเนียม' },
    ];
  }, [selectedProgram, selected]);

  const canRevise = ['ACTIVE', 'SUSPENDED'].includes(selectedStatus);

  return (
    <Grid container spacing={6}>
      {/* KPI */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              หลักสูตรที่เปิดสอน
            </Typography>
            <Typography variant="h4" color="success.main">
              {kpis.ACTIVE}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              เข้าสู่การคำนวณจุดคุ้มทุน
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              รออนุมัติ / ร่างข้อเสนอ
            </Typography>
            <Typography variant="h4" color="warning.main">
              {kpis.PENDING_APPROVAL + kpis.DRAFT}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              ยังไม่เข้าสู่การคำนวณ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              กำลังปรับปรุงรอบ มคอ.
            </Typography>
            <Typography variant="h4" color="info.main">
              {kpis.REVISING}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              มีรุ่นใหม่รอมีผล
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              งดรับ / ปิดหลักสูตร
            </Typography>
            <Typography variant="h4" color="error.main">
              {kpis.SUSPENDED + kpis.CLOSED}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              ยังเก็บไว้เทียบข้ามปี
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* วงจรชีวิตหลักสูตร */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="วงจรชีวิตหลักสูตรในระบบ" subheader="สถานะกำหนดว่าหลักสูตรนั้นเข้าสู่การคำนวณจุดคุ้มทุนหรือไม่" />
          <CardContent>
            <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
              {STATUS_FLOW.map((s, i) => (
                <Box key={s} display="flex" alignItems="center" gap={2}>
                  {i > 0 && (
                    <Typography color="text.disabled" component="span">
                      →
                    </Typography>
                  )}
                  <Chip
                    label={STATUS_META[s].label}
                    color={s === selectedStatus ? STATUS_META[s].color : 'default'}
                    variant={s === selectedStatus ? 'filled' : 'outlined'}
                    icon={
                      <span style={{ fontSize: 12 }}>{STATUS_META[s].calc ? '📈' : '○'}</span>
                    }
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ทะเบียน + รายละเอียด */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader
            title="ทะเบียนหลักสูตร"
            subheader={`คลิกแถวเพื่อดูรายละเอียดและเปลี่ยนสถานะ · ${filtered.length} จาก ${programs.length} หลักสูตร`}
            action={
              <Stack direction="row" spacing={2}>
                <Button size="small" variant="outlined" onClick={() => notify('ต้องเชื่อมต่อระบบทะเบียนกลางก่อนจึงจะนำเข้าอัตโนมัติได้')}>
                  นำเข้าจากระบบทะเบียน
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => notify('การเปิดหลักสูตรใหม่ต้องเสนอผ่านสภาวิชาการ — ฟีเจอร์นี้ยังไม่เชื่อมต่อระบบจริง')}
                >
                  + เปิดหลักสูตรใหม่
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Box display="flex" flexWrap="wrap" gap={2} mb={4}>
              {FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  size="small"
                  color={filterStatus === f.key ? 'primary' : 'default'}
                  variant={filterStatus === f.key ? 'filled' : 'outlined'}
                  onClick={() => {
                    setFilterStatus(f.key);
                    setPage(0);
                  }}
                />
              ))}
              <TextField
                size="small"
                placeholder="ค้นหารหัส / ชื่อหลักสูตร / คณะ..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 240, ml: 'auto' }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>รหัสอ้างอิง</TableCell>
                    <TableCell>ชื่อหลักสูตร / คณะ</TableCell>
                    <TableCell>ระดับ</TableCell>
                    <TableCell align="right">นิสิต (Q)</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="center">คำนวณ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                        — ไม่พบหลักสูตรที่ตรงกับตัวกรอง —
                      </TableCell>
                    </TableRow>
                  )}
                  {pageRows.map(({ p, i }) => {
                    const st = STATUS_META[statuses[i] ?? 'ACTIVE'];

                    return (
                      <TableRow
                        key={i}
                        hover
                        selected={i === selected}
                        onClick={() => setSelected(i)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <code>{programCode(p, i)}</code>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} component="span">
                            {p.prog}
                            {p.deg.includes('นานาชาติ') && <Chip label="นานาชาติ" size="small" sx={{ ml: 2 }} />}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.fac}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {p.lvl}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{fmtN(p.Q)}</TableCell>
                        <TableCell>
                          <Chip label={st.label} color={st.color} size="small" variant="tonal" />
                        </TableCell>
                        <TableCell align="center">
                          {st.calc ? (
                            <i className="ri-checkbox-circle-line" style={{ color: 'var(--mui-palette-success-main)' }} />
                          ) : (
                            <i className="ri-subtract-line" style={{ color: 'var(--mui-palette-text-disabled)' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="แถวต่อหน้า"
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader
              title={selectedProgram.prog}
              subheader={`${programCode(selectedProgram, selected)} · ${selectedProgram.fac} · ${selectedProgram.lvl}`}
              action={<Chip label={STATUS_META[selectedStatus].label} color={STATUS_META[selectedStatus].color} size="small" />}
            />
            <CardContent>
              <Alert severity={STATUS_META[selectedStatus].calc ? 'success' : 'info'} sx={{ mb: 4 }}>
                {STATUS_META[selectedStatus].why}
              </Alert>

              <Grid container spacing={3} mb={4}>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    นิสิตปัจจุบัน
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary">
                    {fmtN(selectedProgram.Q)}
                  </Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    รายได้รวม/ปี
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {fmtM(selectedProgram.TR)}
                  </Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    ต้นทุน/หัว (AVC)
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {fmtN(selectedProgram.AVC)}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" flexWrap="wrap" gap={2}>
                <Button
                  size="small"
                  variant={selectedStatus === 'DRAFT' ? 'contained' : 'outlined'}
                  disabled={selectedStatus !== 'DRAFT'}
                  onClick={() => transition(selected, 'PENDING_APPROVAL')}
                >
                  เสนอสภาวิชาการ
                </Button>
                <Button
                  size="small"
                  variant={selectedStatus === 'PENDING_APPROVAL' ? 'contained' : 'outlined'}
                  disabled={selectedStatus !== 'PENDING_APPROVAL'}
                  onClick={() => transition(selected, 'ACTIVE')}
                >
                  อนุมัติเปิดหลักสูตร
                </Button>
                <Button size="small" variant="outlined" disabled={!canRevise} onClick={() => transition(selected, 'REVISING')}>
                  ปรับปรุงหลักสูตร (รุ่นใหม่)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedStatus !== 'REVISING'}
                  onClick={() => transition(selected, 'ACTIVE')}
                >
                  ประกาศใช้รุ่นใหม่
                </Button>
                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  disabled={selectedStatus !== 'ACTIVE'}
                  onClick={() => transition(selected, 'SUSPENDED')}
                >
                  งดรับนิสิต
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  disabled={selectedStatus !== 'SUSPENDED'}
                  onClick={() => transition(selected, 'CLOSED')}
                >
                  ปิดหลักสูตร
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title='ตรวจก่อนเปลี่ยนสถานะเป็น "เปิดสอน"'
            subheader="หลักสูตรจะเข้าสู่การคำนวณได้ก็ต่อเมื่อข้อมูลที่จำเป็นครบ"
          />
          <CardContent>
            <Typography variant="body2" sx={{ mb: 3 }}>
              <b>{selectedProgram.prog}</b> ({selectedProgram.lvl}) — ผ่าน{' '}
              <b style={{ color: readiness.every((c) => c.ok) ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-warning-main)' }}>
                {readiness.filter((c) => c.ok).length}/{readiness.length}
              </b>{' '}
              ข้อ
            </Typography>
            <Stack divider={<Divider />} spacing={2}>
              {readiness.map((c) => (
                <Box key={c.label} display="flex" alignItems="flex-start" gap={2}>
                  <i
                    className={c.ok ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'}
                    style={{ color: c.ok ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={600} color={c.ok ? 'text.primary' : 'error'}>
                      {c.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.detail}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title="บันทึกการเปลี่ยนแปลงทะเบียน" subheader="เฉพาะการเปลี่ยนแปลงในหน้าจอนี้ (ยังไม่บันทึกลงระบบจริง)" />
          <CardContent>
            {log.length === 0 ? (
              <Typography color="text.disabled">— ยังไม่มีการเปลี่ยนแปลงในเซสชันนี้ —</Typography>
            ) : (
              <Stack divider={<Divider />} spacing={2}>
                {log.map((l, i) => (
                  <Box key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {l.time}
                    </Typography>
                    <Typography variant="body2">
                      <b>{l.program}</b> — {l.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Grid>
  );
};

export default ProgramsView;
