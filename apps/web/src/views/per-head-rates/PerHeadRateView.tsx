'use client';

// React Imports
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import Pagination from '@mui/material/Pagination';
import Snackbar from '@mui/material/Snackbar';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Component Imports
import NumberTextField from '@components/NumberTextField';
import StepperCustomDot from '@components/stepper-dot';

// Hook / Config Imports
import { useRole } from '@/hooks/useRole';
import { roleDisplay } from '@/configs/accessControl';
import { RAW } from '@/data/mockup';

import {
  RATE_YEAR,
  SHEET_RATES,
  approveRate,
  dropProposal,
  fmtAt,
  proposeRate,
  useRateRecord,
  type RateKey,
  type RateLog,
} from './rateStore';

export interface RatePageConfig {
  rateKey: RateKey;
  title: string;
  /** อธิบายว่าค่านี้คืออะไร มาจากไหนในชีต */
  desc: ReactNode;
  /** อัตรานี้มีผลกับหน้าไหน/ส่วนไหนของการคำนวณ */
  usedIn: ReactNode;
}

const fmt = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 0 });
const MAX_RATE = 100000;
const PAGE_SIZE = 5;
const STEPS = ['เสนออัตราใหม่', 'รออนุมัติ', 'มีผลกับการคำนวณ'];

const ACTION_LABEL: Record<RateLog['action'], { text: string; color: 'info' | 'success' | 'error' | 'default' }> = {
  propose: { text: 'เสนอ', color: 'info' },
  approve: { text: 'อนุมัติ', color: 'success' },
  reject: { text: 'ไม่อนุมัติ', color: 'error' },
  cancel: { text: 'ถอนคำเสนอ', color: 'default' },
};

type Confirm = 'approve' | 'reject' | 'cancel';

const CONFIRM_TEXT: Record<Confirm, { title: string; button: string; color: 'success' | 'error' | 'inherit' }> = {
  approve: { title: 'ยืนยันอนุมัติอัตราใหม่', button: 'อนุมัติ', color: 'success' },
  reject: { title: 'ไม่อนุมัติคำเสนอนี้', button: 'ไม่อนุมัติ', color: 'error' },
  cancel: { title: 'ถอนคำเสนอนี้', button: 'ถอนคำเสนอ', color: 'inherit' },
};

interface Draft {
  rate: number;
  note: string;
}

const draftKey = (k: RateKey) => `beps:per-head-rate-draft:${k}`;

const readDraft = (k: RateKey): Draft | null => {
  try {
    const raw = window.localStorage.getItem(draftKey(k));

    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const writeDraft = (k: RateKey, d: Draft | null) => {
  try {
    if (d) window.localStorage.setItem(draftKey(k), JSON.stringify(d));
    else window.localStorage.removeItem(draftKey(k));
  } catch {
    // ร่างเป็นแค่ตัวช่วย — บันทึกไม่ได้ก็ยังกรอกต่อได้
  }
};

/** หน้าตั้งค่าอัตราค่าธรรมเนียมรายหัว (บาท/คน/ภาค) รายปี — เสนอ → อนุมัติ → มีผล */
const PerHeadRateView = ({ rateKey, title, desc, usedIn }: RatePageConfig) => {
  const { role } = useRole();
  const who = roleDisplay[role].label;
  const { record, ready } = useRateRecord(rateKey);
  const current = record.approved?.rate ?? SHEET_RATES[rateKey];
  const pending = record.pending;

  const [rate, setRate] = useState(0);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(1);

  // คืนร่างที่กรอกค้างไว้ (ปิดแท็บ/รีเฟรชแล้วไม่หาย)
  useEffect(() => {
    const d = readDraft(rateKey);

    if (d) {
      setRate(d.rate);
      setNote(d.note);
    }
  }, [rateKey]);

  const setDraft = (d: Draft) => {
    setRate(d.rate);
    setNote(d.note);
    writeDraft(rateKey, d.rate || d.note ? d : null);
  };

  const clearDraft = () => {
    setDraft({ rate: 0, note: '' });
    setTouched(false);
  };

  const rateError = !rate
    ? 'กรอกอัตรา (บาท/คน/ภาค)'
    : rate > MAX_RATE
      ? `ไม่เกิน ${fmt(MAX_RATE)} บาท`
      : rate === current
        ? 'เท่ากับอัตราที่ใช้อยู่แล้ว'
        : null;

  const done = (ok: boolean, text: string) =>
    setToast(ok ? { ok, text } : { ok, text: 'บันทึกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (rateError) return;

    const ok = proposeRate(rateKey, RATE_YEAR, rate, note.trim(), who);

    if (ok) clearDraft();
    done(ok, `เสนออัตรา ${fmt(rate)} บาท/คน/ภาค แล้ว — รออนุมัติ`);
  };

  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
  };

  const runConfirm = () => {
    if (!confirm || !pending) return;

    const ok =
      confirm === 'approve'
        ? approveRate(rateKey, RATE_YEAR, who)
        : dropProposal(rateKey, RATE_YEAR, confirm, reason.trim(), who);

    done(
      ok,
      confirm === 'approve'
        ? `อนุมัติแล้ว — ใช้อัตรา ${fmt(pending.rate)} บาท/คน/ภาค ในการคำนวณ`
        : confirm === 'reject'
          ? 'ไม่อนุมัติคำเสนอแล้ว — อัตราที่ใช้อยู่ไม่เปลี่ยน'
          : 'ถอนคำเสนอแล้ว',
    );
    closeConfirm();
  };

  // ผลต่อทั้งมหาวิทยาลัยต่อปี (2 ภาค) — ให้ผู้อนุมัติเห็นขนาดของการเปลี่ยน
  const yearlyDiff = pending ? (pending.rate - current) * RAW.UNI.Q * 2 : 0;
  const pages = Math.max(1, Math.ceil(record.log.length / PAGE_SIZE));
  const curPage = Math.min(page, pages);
  const logPage = record.log.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box display="flex" alignItems="center" flexWrap="wrap" gap={3}>
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          <Chip size="small" color="primary" variant="tonal" label={`ปีงบประมาณ ${RATE_YEAR}`} />
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {desc}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stepper activeStep={pending ? 1 : record.approved ? 3 : 0} alternativeLabel>
              {STEPS.map((s) => (
                <Step key={s}>
                  <StepLabel StepIconComponent={StepperCustomDot}>{s}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="อัตราที่ใช้อยู่" subheader="มีผลกับการคำนวณตอนนี้" />
          <CardContent>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {ready ? fmt(current) : '…'}
            </Typography>
            <Typography color="text.secondary">บาท/คน/ภาค · {fmt(current * 2)} บาท/คน/ปี</Typography>
            <Box mt={3}>
              {record.approved ? (
                <Typography variant="body2">
                  อนุมัติโดย <b>{record.approved.approvedBy}</b> เมื่อ {fmtAt(record.approved.approvedAt)}
                  {record.approved.note && <> · เหตุผล: {record.approved.note}</>}
                </Typography>
              ) : (
                <Typography variant="body2">
                  ยังไม่เคยอนุมัติ — ใช้อัตราตามชีต ({fmt(SHEET_RATES[rateKey])} บาท/คน/ภาค)
                </Typography>
              )}
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>
              {usedIn}
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        {pending ? (
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="คำเสนอที่รออนุมัติ"
              subheader={`เสนอโดย ${pending.by} เมื่อ ${fmtAt(pending.at)}`}
              action={<Chip color="warning" variant="tonal" label="รออนุมัติ" />}
            />
            <CardContent>
              <Box display="flex" alignItems="baseline" flexWrap="wrap" gap={2}>
                <Typography variant="h5" color="text.secondary">
                  {fmt(current)}
                </Typography>
                <Typography variant="h5">→</Typography>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {fmt(pending.rate)}
                </Typography>
                <Typography color="text.secondary">บาท/คน/ภาค</Typography>
              </Box>
              {pending.note && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  เหตุผล: {pending.note}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                ผลต่อต้นทุนผันแปรทั้งมหาวิทยาลัย ≈ {yearlyDiff >= 0 ? '+' : '−'}
                {fmt(Math.abs(yearlyDiff))} บาท/ปี (นิสิต {fmt(RAW.UNI.Q)} คน × 2 ภาค)
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2} mt={4}>
                <Button variant="contained" color="success" onClick={() => setConfirm('approve')}>
                  ✅ อนุมัติ
                </Button>
                <Button variant="outlined" color="error" onClick={() => setConfirm('reject')}>
                  ไม่อนุมัติ
                </Button>
                <Button variant="text" color="secondary" onClick={() => setConfirm('cancel')}>
                  ถอนคำเสนอ
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="เสนออัตราใหม่"
              subheader="อัตราใหม่ยังไม่มีผลจนกว่าจะได้รับอนุมัติ · ร่างที่กรอกค้างไว้จะถูกเก็บไว้ให้"
            />
            <CardContent>
              <Box component="form" noValidate onSubmit={submit} display="flex" flexDirection="column" gap={4}>
                <NumberTextField
                  label="อัตราใหม่ (บาท/คน/ภาค)"
                  value={rate}
                  onChange={(v) => setDraft({ rate: v, note })}
                  onBlur={() => setTouched(true)}
                  error={touched && !!rateError}
                  helperText={
                    touched && rateError
                      ? rateError
                      : rate
                        ? `${fmt(rate * 2)} บาท/คน/ปี · ต่างจากเดิม ${rate >= current ? '+' : '−'}${fmt(Math.abs(rate - current))} บาท/คน/ภาค`
                        : `อัตราที่ใช้อยู่ ${fmt(current)} บาท/คน/ภาค`
                  }
                  sx={{ maxWidth: 260 }}
                />
                <TextField
                  label="เหตุผล / อ้างอิงมติ (ถ้ามี)"
                  value={note}
                  onChange={(e) => setDraft({ rate, note: e.target.value })}
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
                <Box display="flex" flexWrap="wrap" gap={2}>
                  <Button type="submit" variant="contained">
                    📤 เสนออนุมัติ
                  </Button>
                  <Button variant="outlined" color="secondary" disabled={!rate && !note} onClick={clearDraft}>
                    ล้างร่าง
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="ประวัติการเปลี่ยนอัตรา" subheader={`ปีงบประมาณ ${RATE_YEAR} · ใหม่สุดก่อน`} />
          <CardContent>
            {record.log.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography fontSize={32}>🗂️</Typography>
                <Typography fontWeight={600}>ยังไม่มีการเปลี่ยนอัตรา</Typography>
                <Typography variant="body2" color="text.secondary">
                  ระบบใช้อัตราตามชีตอยู่ — เสนออัตราใหม่ได้จากการ์ดด้านบน
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {logPage.map((l, i) => (
                  <Box
                    key={`${l.at}-${i}`}
                    display="flex"
                    flexWrap="wrap"
                    alignItems="center"
                    gap={2}
                    py={2}
                    borderBottom={1}
                    borderColor="divider"
                  >
                    <Chip size="small" variant="tonal" color={ACTION_LABEL[l.action].color} label={ACTION_LABEL[l.action].text} />
                    <Typography fontWeight={600}>{fmt(l.rate)} บาท/คน/ภาค</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {l.by} · {fmtAt(l.at)}
                    </Typography>
                    {l.note && (
                      <Typography variant="body2" sx={{ flexBasis: '100%' }}>
                        {l.note}
                      </Typography>
                    )}
                  </Box>
                ))}
                {pages > 1 && (
                  <Pagination count={pages} page={curPage} onChange={(_, p) => setPage(p)} sx={{ alignSelf: 'center' }} />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={!!confirm && !!pending} onClose={closeConfirm} maxWidth="xs" fullWidth>
        {confirm && pending && (
          <>
            <DialogTitle>{CONFIRM_TEXT[confirm].title}</DialogTitle>
            <DialogContent>
              <Typography>
                {confirm === 'approve' ? (
                  <>
                    อัตราจะเปลี่ยนจาก <b>{fmt(current)}</b> เป็น <b>{fmt(pending.rate)}</b> บาท/คน/ภาค
                    และมีผลกับการคำนวณทันที
                  </>
                ) : (
                  <>
                    คำเสนอ {fmt(pending.rate)} บาท/คน/ภาค จะถูกปิด อัตราที่ใช้อยู่ ({fmt(current)}) ไม่เปลี่ยน
                  </>
                )}
              </Typography>
              {confirm !== 'approve' && (
                <TextField
                  label="เหตุผล (ถ้ามี)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  fullWidth
                  sx={{ mt: 3 }}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeConfirm}>ยกเลิก</Button>
              <Button variant="contained" color={CONFIRM_TEXT[confirm].color} onClick={runConfirm}>
                {CONFIRM_TEXT[confirm].button}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        {toast ? (
          <Alert severity={toast.ok ? 'success' : 'error'} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Grid>
  );
};

export default PerHeadRateView;
