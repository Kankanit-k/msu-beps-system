'use client';

import { useState } from 'react';

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
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';

// Data Imports
import { RAW } from '@/data/mockup';

/** สถานะแหล่งข้อมูลต้นทาง — ตาราง source_dataset (W9) */
type SourceState = 'OK' | 'PARTIAL' | 'MISSING';

interface SourceRow {
  name: string;
  mode: string;
  rows: number | null;
  amount: number | null;
  at: string | null;
  state: SourceState;
  note: string;
}

const SOURCES: SourceRow[] = [
  {
    name: 'งบประมาณรายจ่าย (ERP กองคลัง)',
    mode: 'API รายวัน 03:00 น.',
    rows: 18432,
    amount: RAW.UNI.TC,
    at: '11 ก.ค. 2569 03:00',
    state: 'OK',
    note: 'ครบทั้ง 20 หน่วยงาน',
  },
  {
    name: 'จำนวนนิสิตลงทะเบียน (ระบบทะเบียน)',
    mode: 'API รายวัน 03:00 น.',
    rows: RAW.UNI.Q,
    amount: null,
    at: '11 ก.ค. 2569 03:12',
    state: 'OK',
    note: 'ตัดยอด ณ วันที่ 30 มิ.ย. 2569',
  },
  {
    name: 'ค่าธรรมเนียมการศึกษา (W8)',
    mode: 'กรอกในระบบ',
    rows: RAW.PROGS.length,
    amount: RAW.UNI.own,
    at: '02 เม.ย. 2568 09:14',
    state: 'PARTIAL',
    note: '4 หลักสูตรยังไม่มีอัตราที่อนุมัติ',
  },
  {
    name: 'ค่าเสื่อมราคาครุภัณฑ์ (ระบบสินทรัพย์)',
    mode: 'API รายเดือน',
    rows: 9841,
    amount: RAW.UNI.dep,
    at: '11 ก.ค. 2569 03:20',
    state: 'OK',
    note: 'เฉพาะครุภัณฑ์',
  },
  {
    name: 'ค่าเสื่อมราคาอาคาร (ระบบสินทรัพย์)',
    mode: 'ยังไม่เชื่อมต่อ',
    rows: 0,
    amount: 0,
    at: null,
    state: 'MISSING',
    note: 'ยังไม่มีข้อมูล — กระทบ TFC และ Q* ทั้งระบบ',
  },
  {
    name: 'ผังบัญชี 4 ระดับ (Master)',
    mode: 'นำเข้า Excel',
    rows: 412,
    amount: null,
    at: '20 พ.ค. 2569 11:47',
    state: 'OK',
    note: 'สอดคล้องกับกติกาใน W14',
  },
];

const SRC_STATE_META: Record<SourceState, { label: string; color: 'success' | 'warning' | 'error' }> = {
  OK: { label: 'ครบถ้วน', color: 'success' },
  PARTIAL: { label: 'ไม่ครบ', color: 'warning' },
  MISSING: { label: 'ยังไม่มีข้อมูล', color: 'error' },
};

type ValidationSeverity = 'block' | 'warn' | 'info';

interface ValidationRow {
  sev: ValidationSeverity;
  title: string;
  n: number;
  unit: string;
  impact: string;
  owner: string;
  go: string;
}

const VALIDATIONS: ValidationRow[] = [
  {
    sev: 'block',
    title: 'คณะที่ยังไม่มีค่าเสื่อมราคาอาคาร',
    n: 20,
    unit: 'คณะ/วิทยาลัย',
    impact: 'TFC ต่ำกว่าจริงทั้งระบบ · ส่วนเกินที่รายงานอยู่จึงสูงเกินจริง',
    owner: 'กองคลัง — งานบริหารสินทรัพย์',
    go: '/admin/exceptions',
  },
  {
    sev: 'block',
    title: 'หลักสูตรที่ยังไม่มีค่าธรรมเนียมที่อนุมัติ',
    n: 4,
    unit: 'หลักสูตร',
    impact: 'TR รายหลักสูตรคำนวณไม่ได้ · ถูกกันออกจากยอดรวม',
    owner: 'กองแผนงาน',
    go: '/tuition',
  },
  {
    sev: 'warn',
    title: 'รายการต้นทุนที่ยังไม่จำแนก TFC/TVC',
    n: 2,
    unit: 'คีย์บัญชี · 1.6 ลบ.',
    impact: 'ถูกพักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร',
    owner: 'กองคลัง',
    go: '/admin/university/account-rules',
  },
  {
    sev: 'warn',
    title: 'หลักสูตรที่มีนิสิต Q = 0',
    n: 3,
    unit: 'หลักสูตร',
    impact: 'หาร Q ไม่ได้ · R และ AVC เป็น null',
    owner: 'กองทะเบียน',
    go: '/admin/exceptions',
  },
  {
    sev: 'info',
    title: 'หลักสูตรที่มีนิสิตน้อยกว่า 30 คน',
    n: 41,
    unit: 'หลักสูตร',
    impact: 'ต้นทุน/หัวสูงผิดปกติ · กันออกจากกราฟแต่ยังอยู่ในยอดรวม',
    owner: '—',
    go: '/admin/university/settings',
  },
];

const SEV_META: Record<ValidationSeverity, { icon: string; label: string; color: 'error' | 'warning' | 'info' }> = {
  block: { icon: '⛔', label: 'ปิดกั้นการคำนวณ', color: 'error' },
  warn: { icon: '⚠️', label: 'เตือน', color: 'warning' },
  info: { icon: 'ℹ️', label: 'ทราบไว้', color: 'info' },
};

const IMPORT_LOG = [
  {
    t: '11 ก.ค. 2569 03:20',
    ic: '✅',
    h: 'ซิงก์อัตโนมัติ — งบประมาณ 18,432 แถว · ค่าเสื่อมครุภัณฑ์ 9,841 แถว · ผ่านการตรวจทั้งหมด',
  },
  {
    t: '20 พ.ค. 2569 11:47',
    ic: '📄',
    h: 'นายอัครินทร์ บุพผา นำเข้าผังบัญชี 4 ระดับ 412 แถว จากไฟล์ coa_2568.xlsx',
  },
  {
    t: '18 พ.ค. 2569 16:02',
    ic: '❌',
    h: 'นำเข้าไม่สำเร็จ — พบหน่วยงาน 3 ชื่อที่ไม่ตรงกับทะเบียนหน่วยงาน ไม่บันทึกทั้งไฟล์',
  },
  {
    t: '14 ส.ค. 2568 09:20',
    ic: '📦',
    h: 'นำเข้าชุดข้อมูลปีงบ 2567 ครบทุกแหล่ง — ใช้เป็นฐานเทียบข้ามปี',
  },
];

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) => (v / 1_000_000).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const CostDataView = () => {
  const [toast, setToast] = useState<string | null>(null);

  const nOk = SOURCES.filter((s) => s.state === 'OK').length;
  const nBlock = VALIDATIONS.filter((v) => v.sev === 'block').length;

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          หน้านี้ดูแล<strong>ข้อมูลต้นทางอย่างเดียว</strong> — การกำหนดว่ารายการไหนเป็น TFC หรือ TVC อยู่ที่กติกาผังบัญชี
          (W14) และปุ่มสั่งคำนวณย้ายไปที่รอบคำนวณ (W11) เพราะการคำนวณคือการสร้าง run ที่ต้องมีผู้อนุมัติ ไม่ใช่ปุ่มกดเล่นได้
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนรวมที่นำเข้าแล้ว
            </Typography>
            <Typography variant="h4" color="primary.main">
              {fmtM(RAW.UNI.TC)}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              ล้านบาท · ปีงบประมาณ 2568
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              แหล่งข้อมูลที่ครบถ้วน
            </Typography>
            <Typography variant="h4" color="success.main">
              {nOk}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              จาก {SOURCES.length} แหล่ง
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ปัญหาที่ปิดกั้นการคำนวณ
            </Typography>
            <Typography variant="h4" color="error.main">
              {nBlock}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              รายการ · ต้องแก้ก่อนสร้าง run
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ซิงก์ล่าสุด
            </Typography>
            <Typography variant="h6" color="warning.main">
              11 ก.ค. 69
            </Typography>
            <Typography variant="caption" color="text.disabled">
              03:20 น. · อัตโนมัติทุกวัน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader
            title="สถานะแหล่งข้อมูลต้นทาง"
            subheader="ตาราง source_dataset · ทุกรอบคำนวณล็อกยอดของแหล่งเหล่านี้ ณ เวลาที่สั่งคำนวณ"
            action={
              <Button
                size="small"
                variant="outlined"
                startIcon={<i className="ri-refresh-line" />}
                sx={{ mt: 2, mr: 2 }}
                onClick={() => setToast('เริ่มซิงก์ข้อมูลใหม่แล้ว — จะแจ้งผลเมื่อเสร็จ')}
              >
                ซิงก์ใหม่ทันที
              </Button>
            }
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>แหล่งข้อมูล</TableCell>
                  <TableCell>วิธีรับข้อมูล</TableCell>
                  <TableCell align="right">จำนวนแถว</TableCell>
                  <TableCell align="right">ยอดเงิน (ลบ.)</TableCell>
                  <TableCell>ซิงก์ล่าสุด</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {SOURCES.map((s) => {
                  const meta = SRC_STATE_META[s.state];

                  return (
                    <TableRow key={s.name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.note}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {s.mode}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{s.rows ? fmtN(s.rows) : <Typography color="text.disabled">—</Typography>}</TableCell>
                      <TableCell align="right">{s.amount ? fmtM(s.amount) : <Typography color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>
                        {s.at ? (
                          <Typography variant="body2" color="text.secondary">
                            {s.at}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error.main">
                            ยังไม่เคยซิงก์
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={meta.color} label={meta.label} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setToast(`รายละเอียดของ ${s.name}`)}>
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title="ตรวจความพร้อมก่อนสั่งคำนวณ"
            subheader="ระบบจริงข้อมูลไม่ครบได้ตลอด — ต้องเห็นก่อนคำนวณ ไม่ใช่รู้ตอนตัวเลขออกมาแล้วผิด"
          />
          <CardContent>
            <Stack spacing={0} divider={<Divider flexItem />}>
              {VALIDATIONS.map((v) => {
                const meta = SEV_META[v.sev];

                return (
                  <Stack key={v.title} direction="row" spacing={3} alignItems="flex-start" sx={{ py: 3 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        bgcolor: `${meta.color}.lightOpacity`,
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {v.title}{' '}
                        <Typography component="span" color={`${meta.color}.main`} fontWeight={800}>
                          {fmtN(v.n)}
                        </Typography>{' '}
                        <Typography component="span" variant="caption" color="text.disabled">
                          {v.unit}
                        </Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ผลกระทบ: {v.impact} · ผู้รับผิดชอบ: <strong>{v.owner}</strong>
                      </Typography>
                    </Box>
                    <Button size="small" href={v.go}>
                      ไปแก้ →
                    </Button>
                  </Stack>
                );
              })}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
              <Button variant="contained" disabled>
                สร้างรอบคำนวณใหม่
              </Button>
              <Typography variant="caption" color="error.main">
                มี {nBlock} ปัญหาที่ปิดกั้นอยู่ — แก้ให้ครบก่อนจึงจะสร้าง run ได้
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader title="นำเข้าด้วยไฟล์ Excel" subheader="สำรองไว้สำหรับแหล่งที่ยังไม่มี API" />
            <CardContent>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 6,
                  textAlign: 'center',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography sx={{ fontSize: 30, mb: 2 }}>📄</Typography>
                <Typography variant="body2" fontWeight={600}>
                  ลากไฟล์มาวาง หรือกดเลือกไฟล์
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.8 }}>
                  รองรับ .xlsx ตามแม่แบบ &ldquo;20260711_จุดคุ้มทุน update.xlsx&rdquo;
                  <br />
                  ชีต 1.รายได้ และ 2.ค่าใช้จ่าย
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setToast('เลือกไฟล์ — ยังไม่เปิดใช้งานในตัวอย่างนี้')}
                  >
                    เลือกไฟล์
                  </Button>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                ระบบจะ<strong>ตรวจก่อนบันทึกเสมอ</strong> — ตรวจหัวคอลัมน์ ตรวจว่าหน่วยงานมีอยู่จริง ตรวจว่ายอดรวมตรงกับ
                หน้าสรุปของไฟล์ ถ้าไม่ผ่านจะไม่เขียนลงฐานข้อมูลแม้แต่แถวเดียว
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="ประวัติการนำเข้า" subheader="ตาราง import_batch" />
            <CardContent>
              <Stack spacing={3} divider={<Divider flexItem />}>
                {IMPORT_LOG.map((l) => (
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
          <CardHeader title="สิ่งที่เปลี่ยนจากแบบร่างเดิม" />
          <CardContent>
            <Stack spacing={3}>
              <Alert severity="info">
                เดิม W9 รวมการตั้งค่า TFC/TVC ไว้ด้วย — <strong>ย้ายไป W14</strong> เพราะกติกาต้องมีช่วงปีที่มีผลและต้องอนุมัติ
                ไม่ใช่ช่องติ๊กในหน้านำเข้า
              </Alert>
              <Alert severity="info">
                ปุ่ม &ldquo;คำนวณผลใหม่ทั้งระบบ&rdquo; <strong>ย้ายไป W11</strong> — การคำนวณสร้าง run ที่ทับของเก่าไม่ได้
                และต้องมีผู้อนุมัติ
              </Alert>
              <Alert severity="error">
                บล็อกตรวจความพร้อมเป็นของใหม่ทั้งหมด prototype ไม่มีเพราะข้อมูลถูก fix มาแล้ว —{' '}
                <strong>ค่าเสื่อมราคาอาคารที่ยังไม่มีข้อมูล เป็นตัวอย่างจริงที่กระทบตัวเลขทั้งระบบอยู่ตอนนี้</strong>
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

export default CostDataView;
