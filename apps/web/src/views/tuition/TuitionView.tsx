'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

// Type Imports
import type { ApprovalStatus } from '@beps/shared-types';

// Component Imports
import StepperCustomDot from '@components/stepper-dot';

interface FeeRow {
  fac: string;
  prog: string;
  lvl: string;
  st: string;
  rate: number;
  prev: number | null;
  status: ApprovalStatus;
  by: string | null;
  at: string | null;
}

/**
 * ข้อมูลตัวอย่างอัตราค่าธรรมเนียม — พอร์ตจาก mockup/assets/master-data.js (FEES)
 * ยังไม่มีตารางนี้ใน RAW เพราะ RAW เก็บเฉพาะยอดรวมที่คำนวณแล้ว ไม่ใช่อัตรารายหลักสูตรก่อนอนุมัติ
 */
const FEES: FeeRow[] = [
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'บัญชีบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 36000,
    prev: 34000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'ธุรกิจระหว่างประเทศ (นานาชาติ)',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 90000,
    prev: 90000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'ธุรกิจระหว่างประเทศ (นานาชาติ)',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ต่างชาติ',
    rate: 110000,
    prev: 110000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะการบัญชีและการจัดการ',
    prog: 'บัญชีมหาบัณฑิต',
    lvl: 'ปริญญาโท',
    st: 'ภาคพิเศษ · ไทย',
    rate: 100000,
    prev: 95000,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 30000,
    prev: 30000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาโท',
    st: 'ภาคปกติ · ไทย',
    rate: 93311,
    prev: 88000,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'เคมี',
    lvl: 'ปริญญาเอก',
    st: 'ภาคปกติ · ไทย',
    rate: 143311,
    prev: 143311,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะวิทยาศาสตร์',
    prog: 'ชีววิทยา',
    lvl: 'ปริญญาโท',
    st: 'ภาคปกติ · ไทย',
    rate: 93311,
    prev: 88000,
    status: 'draft',
    by: null,
    at: null,
  },
  {
    fac: 'คณะแพทยศาสตร์',
    prog: 'แพทยศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 62444,
    prev: 60000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะแพทยศาสตร์',
    prog: 'วิทยาศาสตร์สุขภาพ (นานาชาติ)',
    lvl: 'ปริญญาเอก',
    st: 'ภาคปกติ · ต่างชาติ',
    rate: 100000,
    prev: 100000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะนิติศาสตร์',
    prog: 'นิติศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 30000,
    prev: 28000,
    status: 'approved',
    by: 'สภามหาวิทยาลัย',
    at: '18 มี.ค. 2568',
  },
  {
    fac: 'คณะพยาบาลศาสตร์',
    prog: 'ประกาศนียบัตรผู้ช่วยพยาบาล',
    lvl: 'ประกาศนียบัตร',
    st: 'ภาคปกติ · ไทย',
    rate: 45000,
    prev: 45000,
    status: 'draft',
    by: null,
    at: null,
  },
  {
    fac: 'คณะวิศวกรรมศาสตร์',
    prog: 'วิศวกรรมรถไฟความเร็วสูง',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 40000,
    prev: null,
    status: 'pending',
    by: null,
    at: null,
  },
  {
    fac: 'วิทยาลัยดุริยางคศิลป์',
    prog: 'ดุริยางคศาสตรบัณฑิต',
    lvl: 'ปริญญาตรี',
    st: 'ภาคปกติ · ไทย',
    rate: 38000,
    prev: 38000,
    status: 'rejected',
    by: 'คณะกรรมการการเงิน',
    at: '02 เม.ย. 2568',
  },
];

/** ประวัติการเสนอ/อนุมัติของแถวที่เลือกอยู่ (ตาราง fee_approval_log) */
const FEE_LOG = [
  {
    t: '02 เม.ย. 2568 09:14',
    ic: '✅',
    h: 'สภามหาวิทยาลัย อนุมัติอัตรา 36,000 บาท/ปี มีผลปีการศึกษา 2568',
  },
  {
    t: '18 มี.ค. 2568 16:40',
    ic: '📤',
    h: 'กองแผนงาน เสนออนุมัติ — ปรับจาก 34,000 เป็น 36,000 บาท (+5.9%)',
  },
  {
    t: '18 มี.ค. 2568 16:12',
    ic: '📝',
    h: 'นางสาวสิริมา ศรีสุภาพ แก้ไขร่าง แนบมติที่ประชุมคณะ ครั้งที่ 3/2568',
  },
  {
    t: '11 มี.ค. 2568 10:03',
    ic: '➕',
    h: 'คณะการบัญชีและการจัดการ สร้างร่างอัตราใหม่สำหรับปีการศึกษา 2568',
  },
];

const STATUS_META: Record<ApprovalStatus, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  approved: { label: 'อนุมัติแล้ว', color: 'success' },
  pending: { label: 'รออนุมัติ', color: 'warning' },
  draft: { label: 'ร่าง', color: 'default' },
  rejected: { label: 'ไม่อนุมัติ', color: 'error' },
};

const STEPS: ApprovalStatus[] = ['draft', 'pending', 'approved'];

const fmtBaht = (v: number) => v.toLocaleString('th-TH');

type StatusFilter = 'all' | ApprovalStatus;

const TuitionView = () => {
  const [year, setYear] = useState('2568');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return FEES.map((f, i) => ({ ...f, i })).filter(
      (f) =>
        (statusFilter === 'all' || f.status === statusFilter) &&
        (!q || `${f.fac}${f.prog}${f.lvl}`.toLowerCase().includes(q)),
    );
  }, [statusFilter, query]);

  const counts = useMemo(
    () => ({
      approved: FEES.filter((f) => f.status === 'approved').length,
      pending: FEES.filter((f) => f.status === 'pending').length,
      draft: FEES.filter((f) => f.status === 'draft').length,
    }),
    [],
  );

  const fee = FEES[selected]!;
  const meta = STATUS_META[fee.status];
  const isPending = fee.status === 'pending';
  const isDraft = fee.status === 'draft';
  const activeStep = fee.status === 'rejected' ? 1 : STEPS.indexOf(fee.status === 'pending' ? 'pending' : fee.status);

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          ค่าธรรมเนียมเป็น<strong>ต้นทางของ TR ทั้งระบบ</strong> — อัตราที่ยัง<strong>ไม่ผ่านอนุมัติ</strong>{' '}
          จะไม่ถูกนำไปคำนวณ รอบคำนวณจะข้ามหลักสูตรนั้นและติดธงไว้ที่รายการค้างตรวจ · แต่ละอัตรามีช่วงปีที่มีผล
          เปลี่ยนอัตราปีใหม่แล้วตัวเลขปีเก่าไม่เปลี่ยนตาม
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              อัตราที่อนุมัติแล้ว
            </Typography>
            <Typography variant="h4" color="success.main">
              {counts.approved}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              รายการ · พร้อมใช้คำนวณ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              รออนุมัติ
            </Typography>
            <Typography variant="h4" color="warning.main">
              {counts.pending}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              รายการ · เสนอแล้วรอผู้อนุมัติ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ร่าง (ยังไม่เสนอ)
            </Typography>
            <Typography variant="h4">{counts.draft}</Typography>
            <Typography variant="caption" color="text.disabled">
              รายการ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              หลักสูตรที่ยังไม่มีอัตราอนุมัติ
            </Typography>
            <Typography variant="h4" color="error.main">
              4
            </Typography>
            <Typography variant="caption" color="text.disabled">
              หลักสูตร · TR คำนวณไม่ได้
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <TextField select size="small" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="2568">ปีการศึกษา 2568</MenuItem>
            <MenuItem value="2569">ปีการศึกษา 2569</MenuItem>
            <MenuItem value="2570">ปีการศึกษา 2570</MenuItem>
          </TextField>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={statusFilter}
            onChange={(_, v) => v && setStatusFilter(v)}
            color="primary"
          >
            <ToggleButton value="all">ทั้งหมด</ToggleButton>
            <ToggleButton value="pending">รออนุมัติ</ToggleButton>
            <ToggleButton value="draft">ร่าง</ToggleButton>
            <ToggleButton value="rejected">ไม่อนุมัติ</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="ค้นหาคณะ / หลักสูตร..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 240 }}
          />

          <div style={{ flexGrow: 1 }} />

          <Button
            variant="outlined"
            startIcon={<i className="ri-upload-2-line" />}
            onClick={() => setToast('นำเข้าจาก Excel — ยังไม่เปิดใช้งานในตัวอย่างนี้')}
          >
            นำเข้าจาก Excel
          </Button>
          <Button variant="contained" startIcon={<i className="ri-add-line" />} onClick={() => setToast('เปิดฟอร์มเพิ่มอัตราใหม่ — ยังไม่เปิดใช้งานในตัวอย่างนี้')}>
            เพิ่มอัตราใหม่
          </Button>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader
            title="ตารางอัตราค่าธรรมเนียม"
            subheader={`คลิกแถวเพื่อดูประวัติการเสนอและอนุมัติ · แสดง ${rows.length} จาก ${FEES.length} รายการ`}
          />
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>คณะ / หลักสูตร</TableCell>
                  <TableCell>ระดับ</TableCell>
                  <TableCell>ภาค · สัญชาติ</TableCell>
                  <TableCell align="right">อัตรา (บ./ปี)</TableCell>
                  <TableCell align="right">เทียบปีก่อน</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                      — ไม่พบรายการที่ตรงกับตัวกรอง —
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((f) => {
                  const d = f.prev === null || f.prev === undefined ? null : f.rate - f.prev;
                  const s = STATUS_META[f.status];

                  return (
                    <TableRow
                      key={`${f.fac}-${f.prog}-${f.i}`}
                      hover
                      selected={f.i === selected}
                      onClick={() => setSelected(f.i)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">
                          {f.prog}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {f.fac}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {f.lvl}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {f.st}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>{fmtBaht(f.rate)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {d === null ? (
                          <Typography variant="caption" color="text.disabled">
                            ใหม่
                          </Typography>
                        ) : d === 0 ? (
                          <Typography variant="caption" color="text.disabled">
                            เท่าเดิม
                          </Typography>
                        ) : (
                          <Typography variant="body2" fontWeight={700} color={d > 0 ? 'success.main' : 'error.main'}>
                            {d > 0 ? '+' : '−'}
                            {fmtBaht(Math.abs(d))} ({d > 0 ? '+' : '−'}
                            {((Math.abs(d) / f.prev!) * 100).toFixed(1)}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={s.color} label={s.label} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader
              title={fee.prog}
              subheader={`${fee.fac} · ${fee.lvl} · ${fee.st}`}
              action={<Chip size="small" color={meta.color} label={meta.label} sx={{ mt: 2, mr: 2 }} />}
            />
            <CardContent>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
                <Step>
                  <StepLabel StepIconComponent={StepperCustomDot}>ร่าง</StepLabel>
                </Step>
                <Step>
                  <StepLabel StepIconComponent={StepperCustomDot}>เสนออนุมัติ</StepLabel>
                </Step>
                <Step>
                  <StepLabel StepIconComponent={StepperCustomDot} error={fee.status === 'rejected'}>
                    {fee.status === 'rejected' ? 'ไม่อนุมัติ' : 'อนุมัติ'}
                  </StepLabel>
                </Step>
              </Stepper>

              <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    อัตราที่เสนอ
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {fmtBaht(fee.rate)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    บาท/ปี
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    อัตราปีก่อน
                  </Typography>
                  <Typography variant="h5" color="text.secondary">
                    {fee.prev === null || fee.prev === undefined ? '—' : fmtBaht(fee.prev)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {fee.prev === null || fee.prev === undefined ? 'หลักสูตรใหม่' : 'บาท/ปี'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      ช่วงปีที่มีผล
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ปีการศึกษา 2568 เป็นต้นไป · ตัวเลขปี 2567 ไม่เปลี่ยนตาม
                    </Typography>
                  </div>
                  <Chip size="small" variant="outlined" label="2568 →" />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      ผู้อนุมัติ
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fee.by ? `${fee.by} · ${fee.at}` : 'ยังไม่มีผู้อนุมัติ'}
                    </Typography>
                  </div>
                  <Chip size="small" color={fee.by ? 'success' : 'warning'} label={fee.by ? 'ครบ' : 'รอ'} />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      ผลต่อการคำนวณ
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fee.status === 'approved'
                        ? 'ถูกนำไปคำนวณ TR ของหลักสูตรนี้ในรอบคำนวณถัดไป'
                        : 'ยังไม่ถูกนำไปคำนวณ — หลักสูตรนี้จะติดธง NO_FEE'}
                    </Typography>
                  </div>
                  <Chip size="small" color={fee.status === 'approved' ? 'success' : 'error'} label={fee.status === 'approved' ? 'ใช้งาน' : 'ยังไม่ใช้'} />
                </Stack>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!isDraft}
                  onClick={() => setToast('เปิดฟอร์มแก้ไขร่าง — ยังไม่เปิดใช้งานในตัวอย่างนี้')}
                >
                  แก้ไขร่าง
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!isDraft}
                  onClick={() => setToast('เสนออนุมัติแล้ว — สถานะเปลี่ยนเป็นรออนุมัติ')}
                >
                  เสนออนุมัติ
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={!isPending}
                  onClick={() => setToast('อนุมัติอัตราแล้ว')}
                  title={isPending ? 'ผู้อนุมัติต้องไม่ใช่ผู้เสนอ' : 'ต้องอยู่ที่สถานะรออนุมัติก่อน'}
                >
                  อนุมัติ
                </Button>
              </Stack>
              {isPending && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  ผู้ใช้ปัจจุบันมีสิทธิ์ผู้อนุมัติ และไม่ใช่ผู้เสนอรายการนี้ จึงกดอนุมัติได้
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="ประวัติการเสนอ / อนุมัติ" subheader="ตาราง fee_approval_log" />
            <CardContent>
              <Stack spacing={3} divider={<Divider flexItem />}>
                {FEE_LOG.map((l) => (
                  <Stack key={l.t} direction="row" spacing={3}>
                    <Typography variant="h6" component="span">
                      {l.ic}
                    </Typography>
                    <div>
                      <Typography variant="caption" color="text.disabled" display="block">
                        {l.t}
                      </Typography>
                      <Typography variant="body2">{l.h}</Typography>
                    </div>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader title="ทำไมหน้านี้ถึงต้องมี" />
          <CardContent>
            <Stack spacing={3}>
              <Alert severity="error">
                <strong>prototype เดิมไม่มีหน้านี้</strong> เพราะค่าธรรมเนียมถูก fix มาในไฟล์ Excel แล้ว
                ระบบจริงต้องมีที่ให้กรอกและอนุมัติ
              </Alert>
              <Alert severity="warning">
                อัตราที่ยังไม่อนุมัติ <strong>ห้ามเข้าไปในการคำนวณ</strong> — ถ้าปล่อยผ่านจะได้ TR ที่ยังไม่มีใครรับรอง
                แล้วผู้บริหารเอาไปตัดสินใจ
              </Alert>
              <Alert severity="info">
                คนที่เสนออัตราและคนที่อนุมัติ<strong>ต้องเป็นคนละคน</strong> ปุ่มอนุมัติจะถูกปิดถ้าผู้ใช้ปัจจุบันเป็นผู้เสนอเอง
              </Alert>
              <Alert severity="success">
                ทุกอัตรามี<strong>ช่วงปีที่มีผล</strong> — ขึ้นค่าเทอมปี 2569 แล้วรายงานปี 2568 ต้องไม่เปลี่ยนตาม
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Grid>
  );
};

export default TuitionView;
