'use client';

// React Imports
import { useState, type FormEvent } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Component Imports
import NumberTextField from '@components/NumberTextField';

import {
  BEH,
  type METHOD,
  type AccountBehaviorEntry,
  type AccountRule,
  type Behavior,
} from './data';
import { fixedShare } from './ruleStore';

export interface RuleDraft {
  beh: Behavior;
  /** สัดส่วนคงที่ % (จำนวนเต็ม 1–99) — ใช้เมื่อ MIXED */
  fixedPct: number;
  /** วิธีปันส่วนเดิมของกติกา — ไม่ให้แก้แล้ว (มติ 27 ต.ค.: วิธีปันส่วนเป็นนโยบายคณะ) */
  m: keyof typeof METHOD;
  note: string;
}

const BEHAVIORS: Behavior[] = ['TFC', 'TVC', 'MIXED', 'UNCLASSIFIED'];

const draftKey = (account: string, year: number) => `beps:account-rule-draft:${account}|${year}`;

const readDraft = (account: string, year: number): RuleDraft | null => {
  try {
    const raw = window.localStorage.getItem(draftKey(account, year));

    return raw ? (JSON.parse(raw) as RuleDraft) : null;
  } catch {
    return null;
  }
};

const writeDraft = (account: string, year: number, d: RuleDraft | null) => {
  try {
    if (d) window.localStorage.setItem(draftKey(account, year), JSON.stringify(d));
    else window.localStorage.removeItem(draftKey(account, year));
  } catch {
    // ร่างเป็นแค่ตัวช่วย — บันทึกไม่ได้ก็ยังกรอกต่อได้
  }
};

const fromRule = (r: AccountRule): RuleDraft => ({
  beh: r.beh,
  fixedPct: r.beh === 'MIXED' ? Math.round(r.f * 100) : 50,
  m: r.m,
  note: '',
});

const fmtM = (n: number) => (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 });

interface Props {
  account: AccountBehaviorEntry;
  year: number;
  /** กติกาที่มีผลอยู่ตอนนี้ */
  current: AccountRule;
  onClose: () => void;
  onSubmit: (d: RuleDraft) => void;
}

/**
 * ฟอร์มเสนอแก้ประเภทต้นทุนของบัญชี — ร่างถูกเก็บไว้ ปิดโดยไม่ตั้งใจ/รีเฟรชแล้วไม่หาย
 * ผู้เรียก mount เฉพาะตอนเปิด จะได้อ่านร่างใหม่ทุกครั้ง
 */
const RuleEditDialog = ({ account, year, current, onClose, onSubmit }: Props) => {
  const [d, setD] = useState<RuleDraft>(() => readDraft(account.key, year) ?? fromRule(current));
  const [touched, setTouched] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const base = fromRule(current);
  const dirty =
    d.beh !== base.beh ||
    d.m !== base.m ||
    d.note.trim() !== '' ||
    (d.beh === 'MIXED' && d.fixedPct !== base.fixedPct);

  const set = (patch: Partial<RuleDraft>) => {
    const next = { ...d, ...patch };

    setD(next);
    writeDraft(account.key, year, next);
  };

  const f = fixedShare(d.beh, d.fixedPct / 100);
  const sameAsCurrent =
    d.beh === current.beh && d.m === current.m && (d.beh !== 'MIXED' || f === current.f);

  const pctError =
    d.beh === 'MIXED' && (d.fixedPct < 1 || d.fixedPct > 99)
      ? 'สัดส่วนคงที่ต้องอยู่ระหว่าง 1–99%'
      : null;
  const noteError = !d.note.trim() ? 'ระบุเหตุผลหรือเลขมติที่ประชุม' : null;
  const changeError = sameAsCurrent ? 'ยังไม่ได้เปลี่ยนจากกติกาที่ใช้อยู่' : null;

  const discard = () => {
    writeDraft(account.key, year, null);
    setAskDiscard(false);
    onClose();
  };

  const tryClose = () => (dirty ? setAskDiscard(true) : discard());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (pctError || noteError || changeError) return;
    writeDraft(account.key, year, null);
    onSubmit({ ...d, note: d.note.trim() });
  };

  const shift = account.amount * (f - fixedShare(current.beh, current.f));

  return (
    <>
      <Dialog open onClose={tryClose} maxWidth="sm" fullWidth>
        <Box component="form" noValidate onSubmit={submit}>
          <DialogTitle>
            เสนอแก้ประเภทต้นทุน
            <Typography variant="body2" color="text.secondary">
              {account.name} · <code>{account.key}</code> · ปีงบประมาณ {year}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={4} pt={1}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  ประเภทต้นทุน
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  fullWidth
                  value={d.beh}
                  onChange={(_, v: Behavior | null) => v && set({ beh: v })}
                >
                  {BEHAVIORS.map((v) => (
                    <ToggleButton key={v} value={v}>
                      {BEH[v].label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {d.beh === 'MIXED' && (
                <Box display="flex" alignItems="flex-start" gap={3} flexWrap="wrap">
                  <NumberTextField
                    label="สัดส่วนคงที่ (%)"
                    size="small"
                    value={d.fixedPct}
                    onChange={(v) => set({ fixedPct: Math.min(v, 100) })}
                    onBlur={() => setTouched(true)}
                    error={!!pctError}
                    helperText={pctError ?? `ผันแปร ${100 - d.fixedPct}%`}
                    sx={{ width: 160 }}
                  />
                </Box>
              )}

              <TextField
                label="เหตุผล / อ้างอิงมติ"
                required
                value={d.note}
                onChange={(e) => set({ note: e.target.value })}
                onBlur={() => setTouched(true)}
                error={touched && !!noteError}
                helperText={touched && noteError}
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 300 } }}
              />

              {touched && changeError ? (
                <Alert severity="warning">{changeError}</Alert>
              ) : (
                !sameAsCurrent && (
                  <Alert severity="info">
                    ยอด {fmtM(account.amount)} ลบ. → ย้ายเข้าต้นทุนคงที่ {shift >= 0 ? '+' : '−'}
                    {fmtM(Math.abs(shift))} ลบ. (ผันแปร {shift >= 0 ? '−' : '+'}
                    {fmtM(Math.abs(shift))} ลบ.) · มีผลเมื่ออนุมัติแล้วเท่านั้น
                  </Alert>
                )
              )}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}
          >
            <Button
              color="secondary"
              disabled={!dirty}
              onClick={() => {
                setD(base);
                writeDraft(account.key, year, null);
              }}
            >
              ล้างร่าง
            </Button>
            <Box flexGrow={1} />
            <Button onClick={tryClose}>ยกเลิก</Button>
            <Button type="submit" variant="contained">
              📤 เสนออนุมัติ
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={askDiscard} onClose={() => setAskDiscard(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ทิ้งการแก้ไขที่ยังไม่ได้เสนอ?</DialogTitle>
        <DialogContent>
          <Typography>
            เลือก &ldquo;ทิ้งการแก้ไข&rdquo; แล้วสิ่งที่กรอกไว้จะหายไป ·
            หรือเก็บร่างไว้กลับมาเสนอภายหลัง
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskDiscard(false)}>แก้ต่อ</Button>
          <Button onClick={onClose}>เก็บร่างไว้แล้วปิด</Button>
          <Button variant="contained" color="error" onClick={discard}>
            ทิ้งการแก้ไข
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RuleEditDialog;
