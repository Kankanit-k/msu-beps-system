'use client';

import { useMemo, useState } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Alert from '@mui/material/Alert';
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
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Component Imports
import StepperCustomDot from '@components/stepper-dot';

// Data Imports
import { RAW } from '@/data/mockup';
import {
  EXCEPTIONS,
  RUNS,
  RUN_BLOCKERS,
  RUN_FLOW,
  RUN_LOG,
  RUN_STATE_META,
  type AllocationRun,
} from '@/data/mockup/opsData';

const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (v: number) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AllocationRunView = () => {
  const [runs, setRuns] = useState<AllocationRun[]>(RUNS);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detailRun, setDetailRun] = useState<AllocationRun | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const current = runs[0]!;
  const previous = runs[1] ?? null;
  const activeStep = RUN_FLOW.indexOf(current.state);

  const exceptionsAmount = useMemo(() => EXCEPTIONS.reduce((a, e) => a + (e.amount || 0), 0), []);

  const handleApprove = (run: AllocationRun) => {
    setApprovingId(run.id);
    // จำลอง batch job อนุมัติแบบ async — ระบบจริงจะเป็นการเรียก API ที่เขียนผลลงตารางแบบ read-only
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === run.id
            ? { ...r, state: 'APPROVED', appr: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', at: new Date().toLocaleString('th-TH') }
            : r,
        ),
      );
      setApprovingId(null);
      setToast(`อนุมัติรอบคำนวณ #${run.id} เรียบร้อย — กลายเป็นรอบที่ใช้อ้างอิงแทน`);
    }, 1200);
  };

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          รอบคำนวณเป็น <strong>immutable</strong> — คำนวณใหม่คือสร้าง run ใหม่ ไม่ทับของเก่า ทุกหน้าวิเคราะห์จึงต้องบอกได้ว่ากำลังดูผลของ
          run ไหน · run หนึ่งล็อกไว้ทั้ง งวด · ขอบเขต · ฐานต้นทุน · เวอร์ชันกติกา เพื่อให้ย้อนกลับไปอธิบายตัวเลขเก่าได้เสมอ
        </Alert>
      </Grid>

      {/* ซ้าย: run ปัจจุบัน */}
      <Grid size={{ xs: 12, lg: 7 }}>
        <Stack spacing={6}>
          <Card sx={{ borderLeft: '3px solid', borderColor: 'success.main' }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6">รอบคำนวณ #{current.id}</Typography>
                  <Chip size="small" color="success" label="รอบที่ใช้อ้างอิงอยู่" />
                </Stack>
              }
              subheader={`ปีงบประมาณ ${current.year} · ${current.scope} · ฐานต้นทุน ${current.basis} · กติกาผังบัญชี ${current.rule}`}
            />
            <CardContent>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
                {RUN_FLOW.map((s) => (
                  <Step key={s}>
                    <StepLabel StepIconComponent={StepperCustomDot}>{RUN_STATE_META[s].label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              <Grid container spacing={4}>
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    ต้นทุนรวมที่ปันส่วน
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {fmtM(current.tc)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    ล้านบาท
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    ส่วนต่างตรวจยอด
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    0.00
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    บาท · เกณฑ์ยอมรับ 0.00
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    หน่วยที่คำนวณ
                  </Typography>
                  <Typography variant="h6">{RAW.PROGS.length}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    หลักสูตร × 2 ฐานรายได้ × 3 ระดับ
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    เวลาที่ใช้
                  </Typography>
                  <Typography variant="h6">{current.dur}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    เป็น batch job
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    รายการค้างตรวจ
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {EXCEPTIONS.length}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    รายการ · {fmtM(exceptionsAmount)} ลบ. ({((exceptionsAmount / RAW.UNI.TC) * 100).toFixed(2)}%)
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                <Button component={Link} href="/admin/reconciliation" variant="outlined" size="small">
                  🧾 ดูผลตรวจยอด
                </Button>
                <Button component={Link} href="/admin/exceptions" variant="outlined" size="small">
                  🚩 ดูรายการค้างตรวจ
                </Button>
                <Button variant="outlined" size="small" onClick={() => setCompareOpen(true)} disabled={!previous}>
                  ⇄ เทียบกับรอบก่อน
                </Button>
                <Box flexGrow={1} />
                <Button variant="text" size="small" disabled title="รอบนี้อนุมัติแล้ว">
                  ✓ อนุมัติแล้ว
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="ประวัติรอบคำนวณ"
              subheader={
                <>
                  ตาราง <code>allocation_run</code> · run เก่าไม่เคยถูกลบ
                </>
              }
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Run</TableCell>
                    <TableCell>ปีงบ</TableCell>
                    <TableCell>ฐานต้นทุน</TableCell>
                    <TableCell>กติกา</TableCell>
                    <TableCell align="right">ต้นทุนรวม (ลบ.)</TableCell>
                    <TableCell align="right">ส่วนต่าง</TableCell>
                    <TableCell>ผู้สั่ง / เวลา</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {runs.map((r) => {
                    const meta = RUN_STATE_META[r.state];
                    const isApproving = approvingId === r.id;

                    return (
                      <TableRow key={r.id} selected={r.id === current.id} hover>
                        <TableCell align="right">
                          <Typography fontWeight={700} color="primary.main">
                            #{r.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography color="text.secondary">{r.year}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography color="text.secondary">{r.basis}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography color="text.secondary">{r.rule}</Typography>
                        </TableCell>
                        <TableCell align="right">{fmtM(r.tc)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color={r.diff ? 'error.main' : 'success.main'}>
                            {r.diff ? fmtN(r.diff) : '0.00'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.by}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.at}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={meta.color} label={meta.label} />
                        </TableCell>
                        <TableCell align="right">
                          {r.state === 'CALCULATED' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={isApproving}
                              onClick={() => handleApprove(r)}
                              startIcon={isApproving ? <CircularProgress size={14} color="inherit" /> : undefined}
                            >
                              {isApproving ? 'กำลังอนุมัติ…' : '✓ อนุมัติ'}
                            </Button>
                          ) : r.state === 'FAILED' ? (
                            <Button size="small" variant="outlined" color="error" onClick={() => setDetailRun(r)}>
                              ดูสาเหตุ
                            </Button>
                          ) : (
                            <Button size="small" variant="outlined" onClick={() => setDetailRun(r)}>
                              เปิดดู
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card>
            <CardHeader title="บันทึกเหตุการณ์ของรอบ #1042" subheader="ตอบได้ว่าใครสั่ง ใครอนุมัติ และเกิดอะไรระหว่างคำนวณ" />
            <CardContent>
              <Stack spacing={3} divider={<Divider flexItem />}>
                {RUN_LOG.map((l) => (
                  <Stack key={l.t} direction="row" spacing={3}>
                    <Typography variant="h6" component="span">
                      {l.icon}
                    </Typography>
                    <div>
                      <Typography variant="caption" color="text.disabled" display="block">
                        {l.t}
                      </Typography>
                      <Typography variant="body2" dangerouslySetInnerHTML={{ __html: l.html }} />
                    </div>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* ขวา: สร้าง run ใหม่ */}
      <Grid size={{ xs: 12, lg: 5 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader title="สร้างรอบคำนวณใหม่" subheader="ค่าที่เลือกจะถูกล็อกติดไปกับ run ตลอดไป" />
            <CardContent>
              <Stack spacing={4}>
                <TextField select label="ปีงบประมาณ" defaultValue="2568" size="small" fullWidth>
                  <MenuItem value="2568">2568</MenuItem>
                  <MenuItem value="2569">2569</MenuItem>
                </TextField>
                <TextField select label="ขอบเขต" defaultValue="all" size="small" fullWidth>
                  <MenuItem value="all">ทั้งมหาวิทยาลัย (20 หน่วยงาน)</MenuItem>
                  <MenuItem value="some">เลือกเฉพาะบางคณะ…</MenuItem>
                </TextField>
                <TextField
                  select
                  label="ฐานจำนวนเงิน"
                  defaultValue="ACTUAL"
                  size="small"
                  fullWidth
                  helperText={
                    <>
                      ยังรอมติผู้บริหารว่าจะใช้ฐานไหนเป็นตัวหลัก · ตั้งค่าเริ่มต้นได้ที่ W15
                    </>
                  }
                >
                  <MenuItem value="ACTUAL">ACTUAL — ยอดใช้จ่ายจริง</MenuItem>
                  <MenuItem value="BUDGET">BUDGET — ยอดงบที่ได้รับจัดสรร</MenuItem>
                </TextField>
                <TextField
                  select
                  label="เวอร์ชันกติกาผังบัญชี"
                  defaultValue="v3"
                  size="small"
                  fullWidth
                  helperText="ล็อกไว้เพื่อให้คำนวณซ้ำแล้วได้ตัวเลขเดิมเป๊ะ แม้กติกาจะถูกแก้ไปแล้ว"
                >
                  <MenuItem value="v3">v3 — มีผลปีการศึกษา 2568 (ปัจจุบัน)</MenuItem>
                  <MenuItem value="v2">v2 — มีผลปีการศึกษา 2567</MenuItem>
                </TextField>
              </Stack>

              <Alert severity="error" sx={{ mt: 4 }}>
                <strong>สร้าง run ไม่ได้ตอนนี้</strong> — มี {RUN_BLOCKERS.length} ปัญหาที่ปิดกั้นอยู่ที่หน้าข้อมูลต้นทุน:
                <Stack component="ul" sx={{ pl: 4, m: 0, mt: 1 }} spacing={0.5}>
                  {RUN_BLOCKERS.map((b) => (
                    <li key={b.title}>
                      <Link href={b.href} style={{ color: 'inherit', fontWeight: 700 }}>
                        {b.title}
                      </Link>
                    </li>
                  ))}
                </Stack>
              </Alert>

              <Button variant="contained" disabled fullWidth sx={{ mt: 4 }}>
                ▶ เริ่มคำนวณ
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'action.hover' }}>
            <CardHeader title="กติกาการอนุมัติ" />
            <CardContent>
              <Stack spacing={3} divider={<Divider flexItem />}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      ผู้สร้างอนุมัติเองไม่ได้
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ปุ่มอนุมัติจะถูกปิดสำหรับผู้ใช้ที่เป็นคนสั่งคำนวณ run นั้น
                    </Typography>
                  </div>
                  <Chip size="small" color="error" label="บังคับ" />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      อนุมัติได้เฉพาะเมื่อตรวจยอดผ่าน
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      run ที่สถานะ FAILED ต้องแก้ต้นเหตุแล้วสร้างใหม่ ไม่มีทางข้าม
                    </Typography>
                  </div>
                  <Chip size="small" color="error" label="บังคับ" />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      รอบที่อนุมัติแล้วแก้ไม่ได้
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ผลถูกเขียนลง <code>break_even_result</code> แบบอ่านอย่างเดียว
                    </Typography>
                  </div>
                  <Chip size="small" color="default" label="immutable" />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <div>
                    <Typography variant="body2" fontWeight={600}>
                      มีได้ครั้งละหนึ่งรอบอ้างอิง
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      อนุมัติรอบใหม่ = รอบเก่ากลายเป็นประวัติ ยังเปิดดูและเทียบได้
                    </Typography>
                  </div>
                  <Chip size="small" color="success" label="อัตโนมัติ" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Dialog: เปรียบเทียบ / เปิดดูรายละเอียด run */}
      <Dialog open={!!detailRun} onClose={() => setDetailRun(null)} maxWidth="xs" fullWidth>
        {detailRun && (
          <>
            <DialogTitle>
              รอบคำนวณ #{detailRun.id} {detailRun.state === 'FAILED' && '— ไม่ผ่านการตรวจยอด'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body2">ปีงบประมาณ: {detailRun.year}</Typography>
                <Typography variant="body2">ขอบเขต: {detailRun.scope}</Typography>
                <Typography variant="body2">ฐานต้นทุน: {detailRun.basis}</Typography>
                <Typography variant="body2">กติกาผังบัญชี: {detailRun.rule}</Typography>
                <Typography variant="body2">ต้นทุนรวม: {fmtM(detailRun.tc)} ลบ.</Typography>
                <Typography variant="body2" color={detailRun.diff ? 'error.main' : 'success.main'}>
                  ส่วนต่างตรวจยอด: {detailRun.diff ? fmtN(detailRun.diff) : '0.00'} บาท
                </Typography>
                <Typography variant="body2">รายการค้างตรวจ: {detailRun.exc} รายการ</Typography>
                <Typography variant="body2">สั่งคำนวณโดย: {detailRun.by}</Typography>
                <Typography variant="body2">เวลา: {detailRun.at}</Typography>
                {detailRun.appr && <Typography variant="body2">อนุมัติโดย: {detailRun.appr}</Typography>}
                {detailRun.state === 'FAILED' && (
                  <Alert severity="error">
                    ตรวจยอดกลับต้นทางไม่ผ่าน — ส่วนต่าง {fmtN(detailRun.diff)} บาท เกินเกณฑ์ยอมรับ 0.00 · ต้องแก้ไขข้อมูลต้นทางแล้วสร้าง
                    run ใหม่ แก้ไข run เดิมไม่ได้
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailRun(null)}>ปิด</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เทียบรอบคำนวณ #{current.id} กับรอบก่อนหน้า</DialogTitle>
        <DialogContent>
          {previous && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="right">#{current.id} (อ้างอิงอยู่)</TableCell>
                    <TableCell align="right">#{previous.id}</TableCell>
                    <TableCell align="right">ผลต่าง</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>ต้นทุนรวม (ลบ.)</TableCell>
                    <TableCell align="right">{fmtM(current.tc)}</TableCell>
                    <TableCell align="right">{fmtM(previous.tc)}</TableCell>
                    <TableCell align="right">
                      <Typography color={current.tc >= previous.tc ? 'success.main' : 'error.main'} fontWeight={700}>
                        {current.tc >= previous.tc ? '+' : '−'}
                        {fmtM(Math.abs(current.tc - previous.tc))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ฐานต้นทุน</TableCell>
                    <TableCell align="right">{current.basis}</TableCell>
                    <TableCell align="right">{previous.basis}</TableCell>
                    <TableCell align="right">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>กติกาผังบัญชี</TableCell>
                    <TableCell align="right">{current.rule}</TableCell>
                    <TableCell align="right">{previous.rule}</TableCell>
                    <TableCell align="right">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>รายการค้างตรวจ</TableCell>
                    <TableCell align="right">{current.exc}</TableCell>
                    <TableCell align="right">{previous.exc}</TableCell>
                    <TableCell align="right">{current.exc - previous.exc >= 0 ? '+' : ''}{current.exc - previous.exc}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="right">
                      <Chip size="small" color={RUN_STATE_META[current.state].color} label={RUN_STATE_META[current.state].label} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" color={RUN_STATE_META[previous.state].color} label={RUN_STATE_META[previous.state].label} />
                    </TableCell>
                    <TableCell align="right">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Grid>
  );
};

export default AllocationRunView;
