'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
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
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

// Component Imports
import KpiCard from '@components/KpiCard';
import StepperCustomDot from '@components/stepper-dot';

import { RAW } from '@/data/mockup';

import { FEES, FEE_STATUS, STATUS_META, feeVariant, feesForProgram, fmtFee } from './feeData';

const fmtBaht = (v: number) => v.toLocaleString('th-TH');

const LEVELS = ['ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'] as const;

type LevelFilter = 'all' | (typeof LEVELS)[number];

/** หลักสูตรในทะเบียน (แท็บจุดคุ้มทุน) ที่หาอัตราในแท็บค่าธรรมเนียมไม่เจอ — ชื่อสะกดต่างกัน */
const UNMATCHED = RAW.PROGS.filter((p) => feesForProgram(p.fac, p.deg).length === 0);

const TuitionView = () => {
  const [level, setLevel] = useState<LevelFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [toast, setToast] = useState<string | null>(null);
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return FEES.map((f, i) => ({ ...f, i })).filter(
      (f) =>
        (level === 'all' || f.lvl === level) &&
        (!q || `${f.fac}${f.prog}${f.plan ?? ''}`.toLowerCase().includes(q)),
    );
  }, [level, query]);

  const counts = useMemo(
    () => ({
      regular: FEES.filter((f) => f.mode === 'ในเวลา').length,
      special: FEES.filter((f) => f.mode === 'นอกเวลา').length,
      intl: FEES.filter((f) => f.rateIntl !== null).length,
    }),
    [],
  );

  const fee = FEES[selected]!;
  const meta = STATUS_META[FEE_STATUS];
  const pageRows = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          อัตราในหน้านี้มาจากแท็บ <strong>ค่าธรรมเนียม68</strong> ของไฟล์จุดคุ้มทุน (ปีงบประมาณ
          2568) · หน่วยเป็น<strong>บาทต่อภาคการศึกษา</strong> · ค่าธรรมเนียมเป็น
          <strong>ต้นทางของรายได้รวม (TR)</strong> — ในระบบจริง
          อัตราที่ยังไม่ผ่านอนุมัติจะไม่ถูกนำไปคำนวณ
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="อัตราค่าธรรมเนียมทั้งหมด"
          value={fmtBaht(FEES.length)}
          unit="รายการ · ปีงบประมาณ 2568"
          accent="success"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="ภาคปกติ (ในเวลา) / ภาคพิเศษ (นอกเวลา)"
          value={`${counts.regular} / ${counts.special}`}
          unit="รายการ"
          accent="primary"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="มีอัตรานิสิตต่างชาติแยก"
          value={fmtBaht(counts.intl)}
          unit="รายการ"
          accent="info"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ blockSize: '100%', borderTop: 3, borderTopColor: 'error.main' }}>
          <CardActionArea sx={{ blockSize: '100%' }} onClick={() => setUnmatchedOpen(true)}>
            <CardContent sx={{ px: 4, py: 3.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                หลักสูตรที่จับคู่อัตราไม่ได้
              </Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">
                {UNMATCHED.length}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                จาก {RAW.PROGS.length} หลักสูตร · คลิกเพื่อดูรายชื่อ
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>

      <Grid size={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems={{ sm: 'center' }}
          flexWrap="wrap"
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

          <TextField
            size="small"
            placeholder="ค้นหาคณะ / หลักสูตร / แผน..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 260 }}
          />

          <div style={{ flexGrow: 1 }} />

          <Button
            variant="outlined"
            startIcon={<i className="ri-upload-2-line" />}
            onClick={() => setToast('นำเข้าจาก Excel — ยังไม่เปิดใช้งานในตัวอย่างนี้')}
          >
            นำเข้าจาก Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<i className="ri-add-line" />}
            onClick={() => setToast('เปิดฟอร์มเพิ่มอัตราใหม่ — ยังไม่เปิดใช้งานในตัวอย่างนี้')}
          >
            เพิ่มอัตราใหม่
          </Button>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader
            title="ตารางอัตราค่าธรรมเนียม"
            subheader={`คลิกแถวเพื่อดูรายละเอียด · พบ ${rows.length} จาก ${FEES.length} รายการ`}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>คณะ / หลักสูตร</TableCell>
                  <TableCell>ระดับ</TableCell>
                  <TableCell>ภาค · แผน</TableCell>
                  <TableCell align="right">ไทย (บ./ภาค)</TableCell>
                  <TableCell align="right">ต่างชาติ (บ./ภาค)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                      — ไม่พบรายการที่ตรงกับตัวกรอง ลองล้างคำค้นหรือเลือกระดับ "ทั้งหมด" —
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((f) => (
                  <TableRow
                    key={f.i}
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        {f.lvl}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {feeVariant(f)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={f.rate === null ? 400 : 700}
                        variant={f.rate === null ? 'caption' : 'body2'}
                      >
                        {fmtFee(f)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {f.rateIntl === null ? '—' : fmtBaht(f.rateIntl)}
                      </Typography>
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

      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardHeader
            title={fee.prog}
            subheader={`${fee.fac} · ${fee.lvl} · ${feeVariant(fee)}`}
            action={
              <Chip size="small" color={meta.color} label={meta.label} sx={{ mt: 2, mr: 2 }} />
            }
          />
          <CardContent>
            <Stepper activeStep={3} alternativeLabel sx={{ mb: 5 }}>
              {['ร่าง', 'เสนออนุมัติ', 'อนุมัติ'].map((s) => (
                <Step key={s}>
                  <StepLabel StepIconComponent={StepperCustomDot}>{s}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  นิสิตไทย
                </Typography>
                <Typography variant={fee.rate === null ? 'body2' : 'h5'} color="primary.main">
                  {fmtFee(fee)}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  บาท/ภาคการศึกษา
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  นิสิตต่างชาติ
                </Typography>
                <Typography variant="h5" color="text.secondary">
                  {fee.rateIntl === null ? '—' : fmtBaht(fee.rateIntl)}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {fee.rateIntl === null ? 'ไม่ได้กำหนดแยก' : 'บาท/ภาคการศึกษา'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="body2" fontWeight={600}>
                    ที่มา
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    แท็บ ค่าธรรมเนียม68 · ไฟล์จุดคุ้มทุนหลักสูตร
                  </Typography>
                </div>
                <Chip size="small" variant="outlined" label="ปีงบ 2568" />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography variant="body2" fontWeight={600}>
                    ภาคการศึกษาตลอดหลักสูตร
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fee.sems === null ? 'ไฟล์ต้นทางยังไม่ได้ระบุ' : `${fee.sems} ภาคการศึกษา`}
                  </Typography>
                </div>
              </Stack>
              {fee.note && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  หมายเหตุจากไฟล์: {fee.note}
                </Alert>
              )}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button size="small" variant="outlined" disabled>
                แก้ไขร่าง
              </Button>
              <Button size="small" variant="outlined" disabled>
                เสนออนุมัติ
              </Button>
              <Button size="small" variant="contained" color="success" disabled>
                อนุมัติ
              </Button>
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
              อัตรานี้อนุมัติแล้ว — แก้ไขได้โดยเสนออัตราใหม่ของปีถัดไป
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader title="ทำไมหน้านี้ถึงต้องมี" />
          <CardContent>
            <Stack spacing={3}>
              <Alert severity="error">
                <strong>แบบร่างเดิมไม่มีหน้านี้</strong> เพราะค่าธรรมเนียมถูกกำหนดตายตัวมาในไฟล์
                Excel แล้ว ระบบจริงต้องมีที่ให้กรอกและอนุมัติ
              </Alert>
              <Alert severity="warning">
                ชื่อหลักสูตรในแท็บค่าธรรมเนียมสะกด<strong>ไม่ตรงกับทะเบียนหลักสูตร</strong>{' '}
                {UNMATCHED.length} หลักสูตร — ระบบจริงต้องผูกอัตรากับรหัสหลักสูตร ไม่ใช่ชื่อ
              </Alert>
              <Alert severity="info">
                คนที่เสนออัตราและคนที่อนุมัติ<strong>ต้องเป็นคนละคน</strong>{' '}
                ปุ่มอนุมัติจะถูกปิดถ้าผู้ใช้ปัจจุบันเป็นผู้เสนอเอง
              </Alert>
              <Alert severity="success">
                ทุกอัตรามี<strong>ช่วงปีที่มีผล</strong> — ขึ้นค่าเทอมปี 2569 แล้วรายงานปี 2568
                ต้องไม่เปลี่ยนตาม
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={unmatchedOpen} onClose={() => setUnmatchedOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>หลักสูตรที่จับคู่อัตราค่าธรรมเนียมไม่ได้ ({UNMATCHED.length})</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ชื่อในทะเบียนหลักสูตร (แท็บจุดคุ้มทุน) สะกดต่างจากแท็บ ค่าธรรมเนียม68 — เช่น
            &quot;บัญชีบัณฑิต&quot; กับ &quot;บช.บ. บัญชีบัณฑิต&quot;
            ค้นหาอัตราได้จากช่องค้นหาในตาราง
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>คณะ</TableCell>
                <TableCell>ระดับ</TableCell>
                <TableCell>หลักสูตร (ตามทะเบียน)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {UNMATCHED.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.fac}</TableCell>
                  <TableCell>{p.lvl}</TableCell>
                  <TableCell>{p.deg}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnmatchedOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

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
