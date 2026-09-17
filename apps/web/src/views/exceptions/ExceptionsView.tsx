'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Data Imports
import { RAW } from '@/data/mockup';
import {
  EXCEPTIONS,
  EXC_FLAG_META,
  EXC_STATE_META,
  surplusCaveatText,
  type ExceptionFlag,
  type ExceptionItem,
} from '@/data/mockup/opsData';

const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type FlagFilter = 'all' | ExceptionFlag;

const FLAG_FILTERS: { value: FlagFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'MISSING_SOURCE', label: 'ไม่มีข้อมูลต้นทาง' },
  { value: 'UNCLASSIFIED', label: 'ยังไม่จำแนก' },
  { value: 'MISSING_DRIVER', label: 'ไม่มีตัวขับ' },
  { value: 'NO_FEE', label: 'ไม่มีค่าธรรมเนียม' },
  { value: 'Q_ZERO', label: 'Q = 0' },
];

/** สร้างไฟล์ CSV จากรายการที่กรองอยู่แล้วสั่งดาวน์โหลดในเบราว์เซอร์ — ไม่มี backend จริงจึงทำฝั่ง client ทั้งหมด */
const exportCsv = (rows: ExceptionItem[]) => {
  const header = ['ธง', 'รายการ', 'หน่วยงาน', 'มูลค่าที่กระทบ', 'ผู้รับผิดชอบ', 'ตั้งแต่', 'สถานะ'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((e) =>
    [e.flag, e.item, e.org, e.amount ?? '', e.owner, e.since, EXC_STATE_META[e.state].label].map((v) => escape(String(v))).join(','),
  );
  const csv = ['﻿' + header.map(escape).join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exception-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const FLAG_MEANING: { flag: ExceptionFlag; desc: string }[] = [
  { flag: 'MISSING_SOURCE', desc: 'ไม่มีข้อมูลจากระบบต้นทางเลย — ระบบคำนวณโดยไม่มีตัวเลขนี้ ผลลัพธ์จึงต่ำกว่าความจริง' },
  { flag: 'UNCLASSIFIED', desc: 'มีเงินแต่ยังไม่รู้ว่าเป็น TFC หรือ TVC — พักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร' },
  { flag: 'MISSING_DRIVER', desc: 'กติกาสั่งให้ปันตามการใช้จริง แต่ไม่มีข้อมูลการใช้ — ตกไปใช้วิธีสำรอง และติดธง ESTIMATED' },
  { flag: 'NO_FEE', desc: 'ยังไม่มีอัตราค่าธรรมเนียมที่อนุมัติ — TR คำนวณไม่ได้ กันหลักสูตรออกจากยอดรวม' },
  { flag: 'Q_ZERO', desc: 'หลักสูตรเปิดแต่ไม่มีนิสิต — R และ AVC เป็น null หา Q* ไม่ได้ แต่ต้นทุนยังเกิดขึ้นจริง' },
];

const ExceptionsView = () => {
  const [items, setItems] = useState<ExceptionItem[]>(EXCEPTIONS);
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all');
  const [assignTarget, setAssignTarget] = useState<ExceptionItem | null>(null);
  const [assignName, setAssignName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(
    () => items.filter((e) => flagFilter === 'all' || e.flag === flagFilter),
    [items, flagFilter],
  );

  const totalAmt = useMemo(() => items.reduce((s, e) => s + (e.amount || 0), 0), [items]);
  const pct = (totalAmt / RAW.UNI.TC) * 100;

  const openAssign = (item: ExceptionItem) => {
    setAssignTarget(item);
    setAssignName(item.owner);
  };

  const confirmAssign = () => {
    if (!assignTarget) return;
    setItems((prev) =>
      prev.map((e) =>
        e === assignTarget ? { ...e, owner: assignName || e.owner, state: e.state === 'OPEN' ? 'IN_PROGRESS' : e.state } : e,
      ),
    );
    setToast(`มอบหมาย "${assignTarget.item}" ให้ ${assignName || assignTarget.owner} แล้ว`);
    setAssignTarget(null);
  };

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Alert severity="info">
          รายการที่ระบบ<strong>คำนวณต่อไปได้แต่ไม่มั่นใจ</strong> จะถูกติดธงไว้ที่นี่แทนที่จะรวมเงียบๆ · ทุกธงมีผู้รับผิดชอบและมูลค่าที่กระทบ
          เพื่อให้ตามแก้ได้จริง ไม่ใช่รู้ว่ามีปัญหาแต่ไม่รู้ว่าของใคร
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ยังไม่แก้
            </Typography>
            <Typography variant="h4" color="error.main">
              {items.filter((e) => e.state === 'OPEN').length}
            </Typography>
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
              กำลังตาม
            </Typography>
            <Typography variant="h4" color="warning.main">
              {items.filter((e) => e.state === 'IN_PROGRESS').length}
            </Typography>
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
              ยอมรับแล้ว
            </Typography>
            <Typography variant="h4">{items.filter((e) => e.state === 'ACCEPTED').length}</Typography>
            <Typography variant="caption" color="text.disabled">
              รายการ · รับทราบข้อจำกัด
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              มูลค่าที่กระทบรวม
            </Typography>
            <Typography variant="h4" color="primary.main">
              {fmtM(totalAmt)}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              ล้านบาท · {pct.toFixed(2)}% ของต้นทุนรวม
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Alert severity="warning">
          <strong>รายการที่ร้ายแรงที่สุดไม่ได้วัดเป็นบาทได้</strong> — ค่าเสื่อมราคาอาคารยังไม่มีข้อมูลเลยแม้แต่แถวเดียว ทำให้ TFC และ TC
          ต่ำกว่าความจริงทั้งระบบ ({surplusCaveatText}) และ Q* ทุกระดับ<strong>ต่ำกว่าที่ควรเป็น</strong> —
          ต้องกำกับข้อจำกัดนี้ทุกครั้งที่นำเสนอตัวเลขชุดปี 2568
        </Alert>
      </Grid>

      <Grid size={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={flagFilter}
            onChange={(_, v) => v && setFlagFilter(v)}
            color="primary"
          >
            {FLAG_FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <div style={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {rows.length} จาก {items.length} รายการ
          </Typography>
          <Button variant="outlined" startIcon={<i className="ri-download-2-line" />} onClick={() => exportCsv(rows)}>
            ⬇ ส่งออกเป็น Excel
          </Button>
        </Stack>
      </Grid>

      <Grid size={12}>
        <Card>
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ธง</TableCell>
                  <TableCell>รายการ</TableCell>
                  <TableCell>หน่วยงาน</TableCell>
                  <TableCell align="right">มูลค่าที่กระทบ</TableCell>
                  <TableCell>ผู้รับผิดชอบ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                      — ไม่มีรายการในธงนี้ —
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((e) => {
                  const flagMeta = EXC_FLAG_META[e.flag];
                  const stateMeta = EXC_STATE_META[e.state];

                  return (
                    <TableRow key={`${e.flag}-${e.item}`} hover>
                      <TableCell>
                        <Chip size="small" color={flagMeta.color} label={e.flag} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {e.item}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {e.note}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {e.org}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {e.amount ? (
                          <Typography fontWeight={700}>{fmtM(e.amount)} ลบ.</Typography>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            วัดไม่ได้
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{e.owner}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ตั้งแต่ {e.since}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={stateMeta.color} label={stateMeta.label} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => openAssign(e)}>
                          มอบหมาย
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

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title="ธงแต่ละประเภทหมายความว่าอะไร" subheader="ระบบทำอะไรต่อกับรายการที่ติดธงนั้น" />
          <TableContainer>
            <Table size="small">
              <TableBody>
                {FLAG_MEANING.map((f) => (
                  <TableRow key={f.flag}>
                    <TableCell sx={{ width: 160 }}>
                      <Chip size="small" color={EXC_FLAG_META[f.flag].color} label={f.flag} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{f.desc}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title="สัดส่วนเทียบต้นทุนรวม" subheader="ประเมินว่าปัญหาคุณภาพข้อมูลใหญ่แค่ไหนเมื่อเทียบกับตัวเลขทั้งหมด" />
          <CardContent>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  มูลค่าที่ติดธง
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {fmtM(totalAmt)}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  ล้านบาท
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  คิดเป็นสัดส่วน
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {pct.toFixed(2)}%
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  ของต้นทุนรวม {fmtM(RAW.UNI.TC)} ลบ.
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  เกณฑ์ที่ยอมรับ
                </Typography>
                <Typography variant="h6" color="success.main">
                  ≤ 1.0%
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  ตั้งไว้ในนโยบายคุณภาพข้อมูล
                </Typography>
              </Grid>
            </Grid>

            <LinearProgress
              variant="determinate"
              value={Math.max(pct, 1.2)}
              sx={{ height: 12, borderRadius: 6, mb: 2, bgcolor: 'success.main' }}
              color="warning"
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="warning.main" fontWeight={700}>
                ติดธง {fmtM(totalAmt)} ลบ. ({pct.toFixed(2)}%)
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight={700}>
                ผ่านโดยไม่มีข้อสังเกต {fmtM(RAW.UNI.TC - totalAmt)} ลบ.
              </Typography>
            </Stack>

            <Alert severity="warning" sx={{ mt: 4 }}>
              ตัวเลข <strong>{pct.toFixed(2)}%</strong> ดูน้อย แต่<strong>ไม่ได้นับค่าเสื่อมราคาอาคารที่หายไปทั้งก้อน</strong>
              เพราะวัดเป็นบาทไม่ได้จนกว่าจะมีข้อมูล — สัดส่วนที่แท้จริงจึงสูงกว่านี้
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>มอบหมายผู้รับผิดชอบ</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {assignTarget?.item}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="ผู้รับผิดชอบ / หน่วยงาน"
            value={assignName}
            onChange={(e) => setAssignName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)}>ยกเลิก</Button>
          <Button variant="contained" onClick={confirmAssign}>
            บันทึก
          </Button>
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

export default ExceptionsView;
