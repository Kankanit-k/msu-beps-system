'use client';

// Next Imports
import Link from 'next/link';
import dynamic from 'next/dynamic';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Data Imports
import { RAW } from '@/data/mockup';
import { EXCEPTIONS, EXC_FLAG_META, RECON_METHODS, surplusCaveatText } from '@/data/mockup/opsData';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const short = (s: string) => s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');
const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const bahtF = (v: number) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const confidence = (pct: number): { label: string; color: 'success' | 'warning' | 'error' } =>
  pct < 25 ? { label: 'สูง', color: 'success' } : pct < 45 ? { label: 'ปานกลาง', color: 'warning' } : { label: 'ต่ำ', color: 'error' };

const ReconciliationView = () => {
  const TOT = RAW.UNI.TC;
  const allocTot = RECON_METHODS.filter((m) => m.alloc).reduce((a, m) => a + m.value, 0);
  const directTot = TOT - allocTot;

  const byFlag = new Map<string, { label: string; color: (typeof EXC_FLAG_META)[keyof typeof EXC_FLAG_META]['color']; n: number; amt: number }>();
  EXCEPTIONS.forEach((e) => {
    const meta = EXC_FLAG_META[e.flag];
    const g = byFlag.get(e.flag) ?? { label: meta.label, color: meta.color, n: 0, amt: 0 };
    g.n += 1;
    g.amt += e.amount || 0;
    byFlag.set(e.flag, g);
  });
  const excAmt = EXCEPTIONS.reduce((a, e) => a + (e.amount || 0), 0);

  const facRows = RAW.FACS.map((f) => {
    const alloc = f.tfcOffice || 0;
    const pct = f.TC > 0 ? (alloc / f.TC) * 100 : 0;

    return { name: f.name, TC: f.TC, alloc, direct: f.TC - alloc, pct };
  }).sort((a, b) => b.pct - a.pct);

  const chartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%', distributed: true } },
    colors: RECON_METHODS.map((m) => m.color),
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    xaxis: { categories: RECON_METHODS.map((m) => m.label), title: { text: 'ล้านบาท' } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: {
      y: {
        formatter: (v) => `${fmtM(v * 1e6)} ลบ. (${((v / (TOT / 1e6)) * 100).toFixed(1)}%)`,
      },
    },
  };
  const chartSeries = [{ name: 'มูลค่า', data: RECON_METHODS.map((m) => Number((m.value / 1e6).toFixed(2))) }];

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ borderColor: 'success.main', height: '100%' }} variant="outlined">
          <CardHeader
            title="ตรวจยอดกลับต้นทาง"
            subheader="ยอดปันส่วนรวมต้องเท่ากับยอดจากระบบต้นทางพอดี ไม่เช่นนั้นรอบคำนวณจะไม่ผ่าน"
            action={<Chip color="success" label="ผ่าน" size="small" sx={{ mt: 2, mr: 2 }} />}
          />
          <CardContent>
            <Stack direction="row" spacing={6} flexWrap="wrap" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ยอดต้นทางจาก ERP
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {bahtF(TOT)}
                </Typography>
              </Box>
              <Typography variant="h5" color="text.disabled">
                =
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ยอดปันส่วนรวม
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {bahtF(TOT)}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  ส่วนต่าง
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main">
                  0.00
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  เกณฑ์ยอมรับ 0.00 บาท
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
              เครื่องปันส่วนใช้วิธี <strong>largest-remainder</strong> จึงบังคับให้ยอดตรงพอดีทุกบาทได้ — ถ้าตั้งเกณฑ์ยอมรับหลวมกว่า 0
              จะกลบข้อผิดพลาดจริง (ตั้งค่าที่ W15)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="ที่มาของต้นทุนรวม" subheader="ต้นทุนที่ผูกหลักสูตรได้โดยตรง เทียบ ต้นทุนที่ต้องปันส่วน" />
          <CardContent>
            <LinearProgress
              variant="determinate"
              value={(directTot / TOT) * 100}
              sx={{ height: 10, borderRadius: 5, mb: 2, bgcolor: 'warning.main' }}
              color="success"
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
              <Typography variant="body2" color="success.main" fontWeight={700}>
                ตรง {((directTot / TOT) * 100).toFixed(0)}% — {fmtM(directTot)} ลบ.
              </Typography>
              <Typography variant="body2" color="warning.main" fontWeight={700}>
                ปันส่วน {((allocTot / TOT) * 100).toFixed(0)}% — {fmtM(allocTot)} ลบ.
              </Typography>
            </Stack>
            <Stack spacing={3} divider={<Box component="hr" sx={{ border: 'none', borderTop: '1px solid', borderColor: 'divider', m: 0 }} />}>
              {RECON_METHODS.map((m) => (
                <Box key={m.label}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="body2" fontWeight={600}>
                      <Box component="span" sx={{ display: 'inline-block', width: 9, height: 9, borderRadius: '2px', bgcolor: m.color, mr: 2 }} />
                      {m.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {fmtM(m.value)}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {((m.value / TOT) * 100).toFixed(1)}%
                      </Typography>
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.disabled">
                    {m.note}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title="รายการที่ต้องตามแก้"
            subheader="ไม่ได้ถูกทิ้ง แต่ต้องรู้ว่ามีอยู่"
            action={
              <Button component={Link} href="/admin/exceptions" size="small" sx={{ mt: 2, mr: 2 }}>
                ดูทั้งหมด →
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {Array.from(byFlag.entries()).map(([flag, g]) => (
                    <TableRow key={flag}>
                      <TableCell>
                        <Chip size="small" color={g.color} label={flag} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {g.label}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{g.n} รายการ</TableCell>
                      <TableCell align="right">
                        {g.amt ? (
                          <Typography fontWeight={700}>{fmtM(g.amt)} ลบ.</Typography>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            วัดไม่ได้
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Alert severity="info" sx={{ mt: 4 }}>
              รวม <strong>{fmtM(excAmt)} ลบ.</strong> คิดเป็น <strong>{((excAmt / TOT) * 100).toFixed(2)}%</strong> ของต้นทุนรวม —
              ยังอยู่ในเกณฑ์ที่ยอมรับได้ แต่ควรตามแก้ให้หมดก่อนปิดปีงบ
            </Alert>
            <Alert severity="warning" sx={{ mt: 3 }}>
              <strong>ที่ยังไม่ปรากฏในตารางนี้</strong> — ค่าเสื่อมราคาอาคารที่ยังไม่มีข้อมูลเลย ไม่ใช่ &ldquo;ปันส่วนผิด&rdquo; แต่เป็น
              &ldquo;ไม่มีให้ปัน&rdquo; จึงตรวจยอดผ่านทั้งที่ต้นทุนจริงยังขาดอยู่
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title="สัดส่วนที่มาข้อมูล รายคณะ"
            subheader={
              <>
                คณะที่สัดส่วนปันส่วนสูง = ตัวเลขพึ่งการปันส่วนมาก ต้องระวังการตีความ · เรียงตามสัดส่วนที่ปันส่วน
                <br />
                <Typography component="span" variant="caption" color="text.disabled">
                  หมายเหตุสำหรับผู้พัฒนา — mockup นี้ใช้ <code>tfcOffice</code> เป็นตัวแทนของยอดที่ปันส่วน ระบบจริงต้องอ่านจาก{' '}
                  <code>cost_allocation_line.method</code>
                </Typography>
              </>
            }
          />
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>คณะ / วิทยาลัย</TableCell>
                  <TableCell align="right">ตรง</TableCell>
                  <TableCell align="right">ปันส่วน</TableCell>
                  <TableCell align="right">ต้นทุนรวม</TableCell>
                  <TableCell>ความเชื่อมั่น</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facRows.map((r) => {
                  const c = confidence(r.pct);

                  return (
                    <TableRow key={r.name} hover>
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">
                          {short(r.name)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmtM(r.direct)}</TableCell>
                      <TableCell align="right">
                        <Typography color="warning.main" fontWeight={700}>
                          {fmtM(r.alloc)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmtM(r.TC)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={c.color} label={`${c.label} · ปันส่วน ${r.pct.toFixed(0)}%`} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader title="ต้นทุนที่ปันส่วน แยกตามวิธี" subheader="วิธีที่ใช้กำหนดจากกติกาผังบัญชี (W14) · วิธีที่แม่นน้อยกว่าควรมีสัดส่วนน้อยที่สุด" />
          <CardContent>
            <AppReactApexCharts type="bar" height={230} width="100%" options={chartOptions} series={chartSeries} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader title="ทำไมผู้บริหารต้องเห็นหน้านี้" />
          <CardContent>
            <Stack spacing={3}>
              <Alert severity="error">
                <strong>ต้นทุนสำนักงานเลขานุการที่ปันด้วย PROGRAM_SHARE</strong> ทำให้หลักสูตรที่มีนิสิตหลักหน่วยมี AVC สูงผิดปกติ —
                เป็นข้อจำกัดของวิธีปันส่วน ไม่ใช่หลักสูตรนั้นแพงจริง
              </Alert>
              <Alert severity="warning">
                คณะที่มีสัดส่วนปันส่วนสูง ตัวเลขจุดคุ้มทุนจะ<strong>อ่อนไหวต่อการเปลี่ยนกติกา</strong>มากกว่าคณะอื่น
              </Alert>
              <Alert severity="success">
                ส่วนต่างตรวจยอดเป็น <strong>0.00 บาท</strong> แปลว่าไม่มีเงินหายระหว่างปันส่วน — แต่ไม่ได้แปลว่าข้อมูลต้นทางครบ
                ({surplusCaveatText})
              </Alert>
              <Alert severity="info">
                ทุกตัวเลขในหน้า W1–W5 คำนวณจาก run เดียวกันนี้ ถ้าอนุมัติ run ใหม่ ตัวเลขทุกหน้าจะเปลี่ยนพร้อมกัน
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ReconciliationView;
