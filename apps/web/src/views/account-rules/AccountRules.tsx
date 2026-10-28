'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';

// Next Imports
import Link from 'next/link';

// Component Imports
import StepperCustomDot from '@components/stepper-dot';

// Hook / Config Imports
import { useRole } from '@/hooks/useRole';
import { roleDisplay } from '@/configs/accessControl';

// Data Imports
import { RAW } from '@/data/mockup';
import { ACCOUNTS, BEH, ruleAt, type AccountRule, type Behavior } from './data';
import RuleEditDialog, { type RuleDraft } from './RuleEditDialog';
import {
  approveRule,
  dropRule,
  effectiveRule,
  fixedShare,
  fmtAt,
  proposeRule,
  recordKey,
  useRuleStore,
  type RuleLog,
} from './ruleStore';

// ไฟล์ต้นทาง (แท็บ Masterแยกหมวด) มีกติกาปีงบ 2568 ปีเดียว
const YEARS = [2568];
type Filter = 'all' | 'PENDING' | Behavior;

const BEH_FILTERS: Filter[] = ['all', 'TFC', 'TVC', 'MIXED', 'UNCLASSIFIED', 'PENDING'];
const BEH_FILTER_LABEL: Record<Filter, string> = {
  all: 'ทั้งหมด',
  PENDING: 'รออนุมัติ',
  TFC: 'คงที่',
  TVC: 'ผันแปร',
  MIXED: 'แบ่งสัดส่วน',
  UNCLASSIFIED: 'ยังไม่จำแนก',
};

/** ยอดเล็กกว่า 0.05 ลบ. แสดง "<0.1" แทน 0 จะได้ไม่ดูเหมือนไม่มียอด */
const fmtM = (n: number) =>
  n !== 0 && Math.abs(n) < 50_000
    ? '<0.1'
    : (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 });
const fmtN = (n: number) => n.toLocaleString('th-TH');
const pct = (r: Pick<AccountRule, 'beh' | 'f'>) => {
  const f = Math.round(fixedShare(r.beh, r.f) * 100);

  return `${f}:${100 - f}`;
};

const STEPS = ['เสนอแก้กติกา', 'รออนุมัติ', 'มีผลแทนค่าตามชีต'];

const ACTION_LABEL: Record<
  RuleLog['action'],
  { text: string; color: 'info' | 'success' | 'error' | 'default' }
> = {
  propose: { text: 'เสนอ', color: 'info' },
  approve: { text: 'อนุมัติ', color: 'success' },
  reject: { text: 'ไม่อนุมัติ', color: 'error' },
  cancel: { text: 'ถอนคำเสนอ', color: 'default' },
};

type Confirm = 'approve' | 'reject' | 'cancel';

const CONFIRM_TEXT: Record<
  Confirm,
  { title: string; button: string; color: 'success' | 'error' | 'inherit' }
> = {
  approve: { title: 'ยืนยันอนุมัติกติกาใหม่', button: 'อนุมัติ', color: 'success' },
  reject: { title: 'ไม่อนุมัติคำเสนอนี้', button: 'ไม่อนุมัติ', color: 'error' },
  cancel: { title: 'ถอนคำเสนอนี้', button: 'ถอนคำเสนอ', color: 'inherit' },
};

/** ข้อความสั้นของกติกา เช่น "แบ่งสัดส่วน 50:50 · ตามจำนวนนิสิต" */
const ruleText = (r: Pick<AccountRule, 'beh' | 'f'>) =>
  `${BEH[r.beh].label}${r.beh === 'MIXED' ? ` ${pct(r)}` : ''}`;

const AccountRules = () => {
  const [year, setYear] = useState(2568);
  const [fBeh, setFBeh] = useState<Filter>('all');
  const [sel, setSel] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const { role } = useRole();
  const who = roleDisplay[role].label;
  const { store } = useRuleStore();

  /** ทุกบัญชีที่มีกติกาในปีนี้ พร้อมกติกาที่มีผล (อนุมัติแล้ว > ตามชีต) */
  const all = useMemo(
    () =>
      ACCOUNTS.flatMap((a, i) => {
        const base = ruleAt(a, year);
        if (!base) return [];
        const rec = store[recordKey(a.key, year)];

        return [{ a, i, base, rec, r: effectiveRule(base, rec) }];
      }),
    [year, store],
  );

  const rows = useMemo(
    () =>
      all.filter((x) =>
        fBeh === 'all' ? true : fBeh === 'PENDING' ? !!x.rec?.pending : x.r.beh === fBeh,
      ),
    [all, fBeh],
  );

  const unclassified = all.filter((x) => x.r.beh === 'UNCLASSIFIED');
  const pendingCount = all.filter((x) => x.rec?.pending).length;
  const approvedCount = all.filter((x) => x.rec?.approved).length;
  // ยอดที่ย้ายเข้าต้นทุนคงที่จากกติกาที่อนุมัติ (เทียบกับชีต) — ยังไม่เข้าการคำนวณ
  const approvedShift = all.reduce(
    (s, x) => s + x.a.amount * (fixedShare(x.r.beh, x.r.f) - fixedShare(x.base.beh, x.base.f)),
    0,
  );

  const account = ACCOUNTS[sel] ?? ACCOUNTS[0]!;
  const selRow = all.find((x) => x.i === sel);
  const rule = selRow?.r ?? null;
  const rec = selRow?.rec;
  const pending = rec?.pending ?? null;

  const done = (ok: boolean, text: string) =>
    setToast(
      ok ? { ok, text } : { ok, text: 'บันทึกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล' },
    );

  const submitEdit = (d: RuleDraft) => {
    const f = d.beh === 'MIXED' ? d.fixedPct / 100 : fixedShare(d.beh, 0);
    const ok = proposeRule(account.key, year, { beh: d.beh, f, m: d.m, note: d.note }, who);

    setEditing(false);
    done(
      ok,
      `เสนอแก้ "${account.name}" เป็น ${ruleText({ beh: d.beh, f })} แล้ว — รออนุมัติ`,
    );
  };

  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
  };

  const runConfirm = () => {
    if (!confirm || !pending) return;
    const ok =
      confirm === 'approve'
        ? approveRule(account.key, year, who)
        : dropRule(account.key, year, confirm, reason.trim(), who);

    done(
      ok,
      confirm === 'approve'
        ? `อนุมัติแล้ว — "${account.name}" เป็น ${ruleText(pending)}`
        : confirm === 'reject'
          ? 'ไม่อนุมัติคำเสนอแล้ว — กติกาที่ใช้อยู่ไม่เปลี่ยน'
          : 'ถอนคำเสนอแล้ว',
    );
    closeConfirm();
  };

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="success" icon={<i className="ri-building-line" />} sx={{ mb: 3 }}>
          หน้านี้คือ<b>ค่าตั้งต้นของมหาวิทยาลัย</b> (มติ “ตั้งค่าต้นทุน” 27 ต.ค.) —
          คณะที่ยังไม่ได้ตั้งค่าใช้กติกาชุดนี้ และคณะปรับเป็นของตัวเองได้ที่{' '}
          <Link href="/admin/variable-cost">ตั้งค่าต้นทุนผันแปร</Link> ·
          วิธีปันส่วนลงหลักสูตรเป็นนโยบายคณะ จึงไม่ได้ตั้งที่หน้านี้
        </Alert>
        <Alert severity="info">
          กติกาผูกกับ <b>คีย์ผสม 4 ระดับ</b> (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย)
          ไม่ใช่รหัสหมวดรายจ่ายอย่างเดียว เพราะรหัสเดียวกันเป็นคนละประเภทได้เมื่ออยู่คนละแผนงาน — ดู{' '}
          <code>80001 เงินอุดหนุนทั่วไป</code> ที่มี 4 แผนงานและตีประเภทต่างกัน · ทุกกติกามี
          <b>ช่วงปีที่มีผล</b> เปลี่ยนปีใหม่แล้วตัวเลขปีเก่าไม่เปลี่ยนตาม
        </Alert>
        <Alert severity="warning" sx={{ mt: 3 }}>
          แก้กติกาได้แล้ว (เสนอ → อนุมัติ) แต่<b>กติกาที่อนุมัติยังไม่มีผลกับการคำนวณ</b> —
          จุดคุ้มทุนและรายงานทุกหน้ายังใช้ต้นทุนคงที่/ผันแปรตามชีต จนกว่าจะมีมติให้เปลี่ยน
          {approvedCount > 0 && (
            <>
              {' '}
              · อนุมัติแล้ว {fmtN(approvedCount)} บัญชี ถ้านำไปใช้จะย้ายยอดเข้าต้นทุนคงที่{' '}
              {approvedShift >= 0 ? '+' : '−'}
              {fmtM(Math.abs(approvedShift))} ลบ. (เทียบวงเงินงบประมาณ)
            </>
          )}
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนคงที่ (TFC)
            </Typography>
            <Typography variant="h4" color="info.main">
              {fmtM(RAW.UNI.TFC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {((RAW.UNI.TFC / RAW.UNI.TC) * 100).toFixed(1)}% ของต้นทุนรวม
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนผันแปร (TVC)
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtM(RAW.UNI.TVC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {((RAW.UNI.TVC / RAW.UNI.TC) * 100).toFixed(1)}% ของต้นทุนรวม
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              กติกาที่มีผลในปีที่เลือก
            </Typography>
            <Typography variant="h4" color="success.main">
              {fmtN(all.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              คีย์ผสม · จากแท็บ Masterแยกหมวด + ค่าเสื่อมราคา
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ยังไม่จำแนก
            </Typography>
            <Typography variant="h4" color="error.main">
              {fmtN(unclassified.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              รายการ · {fmtN(unclassified.reduce((s, x) => s + x.a.amount, 0))} บาท
              พักไว้ที่หน่วยงาน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={4}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="year-label">ปีงบประมาณที่ดู</InputLabel>
            <Select
              labelId="year-label"
              label="ปีงบประมาณที่ดู"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(0);
              }}
            >
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={fBeh}
            onChange={(_, v: Filter | null) => {
              if (v) {
                setFBeh(v);
                setPage(0);
              }
            }}
          >
            {BEH_FILTERS.map((f) => (
              <ToggleButton key={f} value={f}>
                {BEH_FILTER_LABEL[f]}
                {f === 'PENDING' && pendingCount > 0 && ` (${pendingCount})`}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader
            title={`กติกาที่มีผลในปีงบประมาณ ${year}`}
            subheader={`คลิกแถวเพื่อดูไทม์ไลน์รายปีของบัญชีเดียวกัน · แสดง ${rows.length} จาก ${ACCOUNTS.length} คีย์`}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>คีย์ผสม 4 ระดับ</TableCell>
                  <TableCell>ชื่อบัญชี</TableCell>
                  <TableCell align="right">ยอด (ลบ.)</TableCell>
                  <TableCell>ประเภท</TableCell>
                  <TableCell align="right">คงที่ : ผันแปร</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      {fBeh === 'PENDING'
                        ? 'ไม่มีคำเสนอที่รออนุมัติ — เลือกบัญชีแล้วกด “เสนอแก้ไข” เพื่อเริ่ม'
                        : '— ไม่มีกติกาที่ตรงกับตัวกรอง —'}
                    </TableCell>
                  </TableRow>
                )}
                {rows
                  .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                  .map(({ a, i, r, rec: rr }) => {
                    const b = BEH[r.beh];
                    return (
                      <TableRow
                        key={`${a.key}-${a.org ?? ''}`}
                        hover
                        selected={i === sel}
                        onClick={() => setSel(i)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <code>{a.key}</code>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>{a.name}</Typography>
                          {a.org && (
                            <Typography variant="caption" color="text.secondary">
                              ตั้งเจาะจง: {a.org}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{fmtM(a.amount)}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Chip size="small" color={b.color} label={b.label} />
                            {rr?.approved && (
                              <Chip size="small" variant="outlined" label="แก้แล้ว" />
                            )}
                            {rr?.pending && (
                              <Chip
                                size="small"
                                color="warning"
                                variant="tonal"
                                label="รออนุมัติ"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{r.beh === 'MIXED' ? pct(r) : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
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
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={account.name}
                subheader={
                  <>
                    <code>{account.key}</code>
                    {account.org ? ` · ตั้งเจาะจง ${account.org}` : ' · กติกากลางทั้งมหาวิทยาลัย'}
                  </>
                }
                action={
                  rule && (
                    <Chip size="small" color={BEH[rule.beh].color} label={BEH[rule.beh].label} />
                  )
                }
              />
              <CardContent>
                {!rule ? (
                  <Typography color="text.secondary">ไม่มีกติกาที่มีผลในปีนี้</Typography>
                ) : (
                  <>
                    <Stepper
                      activeStep={pending ? 1 : rec?.approved ? 3 : 0}
                      alternativeLabel
                      sx={{ mb: 4 }}
                    >
                      {STEPS.map((s) => (
                        <Step key={s}>
                          <StepLabel StepIconComponent={StepperCustomDot}>{s}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      กติกาที่ใช้อยู่ ปีงบประมาณ {year} ·{' '}
                      {rec?.approved
                        ? `อนุมัติโดย ${rec.approved.approvedBy} เมื่อ ${fmtAt(rec.approved.approvedAt)}`
                        : 'ตามชีต (ยังไม่เคยแก้)'}
                    </Typography>
                    <Typography fontWeight={600} mb={2}>
                      {ruleText(rule)}
                    </Typography>

                    {rule.beh === 'MIXED' && (
                      <Box mb={4}>
                        <Box display="flex" height={22} borderRadius={1} overflow="hidden">
                          <Box
                            flex={rule.f}
                            bgcolor="info.main"
                            color="info.contrastText"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize={11}
                            fontWeight={700}
                          >
                            คงที่ {(rule.f * 100).toFixed(0)}%
                          </Box>
                          <Box
                            flex={rule.v}
                            bgcolor="warning.main"
                            color="warning.contrastText"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize={11}
                            fontWeight={700}
                          >
                            ผันแปร {(rule.v * 100).toFixed(0)}%
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          ยอด {fmtM(account.amount)} ลบ. → คงที่ (TFC){' '}
                          {fmtM(account.amount * rule.f)} ลบ. · ผันแปร (TVC){' '}
                          {fmtM(account.amount * rule.v)} ลบ.
                        </Typography>
                      </Box>
                    )}

                    {rule.note && (
                      <Alert severity="info" sx={{ mb: 4 }}>
                        <b>เหตุผล:</b> {rule.note}
                      </Alert>
                    )}

                    {pending && (
                      <Box border={1} borderColor="warning.main" borderRadius={1} p={3} mb={2}>
                        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
                          <Chip size="small" color="warning" variant="tonal" label="รออนุมัติ" />
                          <Typography variant="body2" color="text.secondary">
                            เสนอโดย {pending.by} เมื่อ {fmtAt(pending.at)}
                          </Typography>
                        </Box>
                        <Typography>
                          <span style={{ opacity: 0.6 }}>{ruleText(rule)}</span> →{' '}
                          <b>{ruleText(pending)}</b>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          เหตุผล: {pending.note}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          ย้ายเข้าต้นทุนคงที่{' '}
                          {(() => {
                            const d =
                              account.amount *
                              (fixedShare(pending.beh, pending.f) - fixedShare(rule.beh, rule.f));

                            return `${d >= 0 ? '+' : '−'}${fmtM(Math.abs(d))} ลบ.`;
                          })()}{' '}
                          (เทียบวงเงินงบประมาณ)
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={2} mt={3}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => setConfirm('approve')}
                          >
                            ✅ อนุมัติ
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => setConfirm('reject')}
                          >
                            ไม่อนุมัติ
                          </Button>
                          <Button
                            variant="text"
                            color="secondary"
                            size="small"
                            onClick={() => setConfirm('cancel')}
                          >
                            ถอนคำเสนอ
                          </Button>
                        </Box>
                      </Box>
                    )}

                    <Divider sx={{ my: 3 }} />
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!!pending}
                        onClick={() => setEditing(true)}
                      >
                        ✎ เสนอแก้ไข
                      </Button>
                      {pending && (
                        <Typography variant="caption" color="text.secondary">
                          มีคำเสนอค้างอยู่ — อนุมัติหรือถอนก่อนจึงเสนอใหม่ได้
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title="ไทม์ไลน์รายปีของบัญชีนี้"
                subheader="บัญชีเดียวกันเปลี่ยนประเภทตามปีได้ · ปีที่คำนวณไปแล้วไม่เปลี่ยนตาม"
              />
              <CardContent sx={{ pt: 0 }}>
                <Timeline sx={{ p: 0, m: 0 }}>
                  {account.rules.map((r, idx) => {
                    const b = BEH[r.beh];
                    const on = year >= r.from && (r.to === null || year <= r.to) && !rec?.approved;
                    const span = `${r.from <= 2500 ? 'ตั้งแต่เริ่มระบบ' : r.from} – ${r.to === null ? 'ปัจจุบัน' : r.to}`;
                    return (
                      <TimelineItem
                        key={idx}
                        sx={{ opacity: on ? 1 : 0.55, '&::before': { display: 'none' } }}
                      >
                        <TimelineOppositeContent sx={{ flex: 0.001, p: 0 }} />
                        <TimelineSeparator>
                          <TimelineDot color={on ? 'primary' : 'grey'} />
                          {idx < account.rules.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
                            <Typography fontWeight={700} fontSize={12}>
                              {span}
                            </Typography>
                            <Chip size="small" color={b.color} label={b.label} />
                            {r.beh === 'MIXED' && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${(r.f * 100).toFixed(0)}:${(r.v * 100).toFixed(0)}`}
                              />
                            )}
                            {on && (
                              <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label="มีผลอยู่"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {r.note || 'ไม่มีหมายเหตุ'}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
                {rec?.approved && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    ปีงบ {year} ใช้กติกาที่อนุมัติแทนค่าตามชีต: <b>{ruleText(rec.approved)}</b>
                  </Alert>
                )}

                <Typography fontWeight={600} sx={{ mt: 4, mb: 2 }}>
                  ประวัติการเสนอ/อนุมัติ ปีงบ {year}
                </Typography>
                {!rec?.log.length ? (
                  <Typography variant="body2" color="text.secondary">
                    ยังไม่เคยเสนอแก้ — ใช้กติกาตามชีต · กด &ldquo;เสนอแก้ไข&rdquo; ด้านบนเพื่อเริ่ม
                  </Typography>
                ) : (
                  rec.log.map((l, i) => (
                    <Box
                      key={`${l.at}-${i}`}
                      display="flex"
                      flexWrap="wrap"
                      alignItems="center"
                      gap={2}
                      py={1.5}
                      borderBottom={1}
                      borderColor="divider"
                    >
                      <Chip
                        size="small"
                        variant="tonal"
                        color={ACTION_LABEL[l.action].color}
                        label={ACTION_LABEL[l.action].text}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {ruleText(l)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {l.by} · {fmtAt(l.at)}
                      </Typography>
                      {l.note && (
                        <Typography variant="body2" sx={{ flexBasis: '100%' }}>
                          {l.note}
                        </Typography>
                      )}
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="จุดที่ถ้าตั้งผิดจะทำให้ตัวเลขทั้งระบบผิด" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="error">
                <b>คีย์ผสม 4 ระดับ ไม่ใช่รหัสหมวดเดียว</b> — <code>80001 เงินอุดหนุนทั่วไป</code>{' '}
                ในแผนงานพื้นฐานเป็นคงที่/ผันแปร 50:50 แต่ในแผนงานบุคลากรภาครัฐเป็นคงที่
                และแผนงานบูรณาการเป็นผันแปร ถ้าตั้งด้วยรหัสหมวดอย่างเดียวจะจำแนกผิดทั้งก้อน
              </Alert>
              <Alert severity="warning">
                <b>กติกาเจาะจงหน่วยงานมาก่อนกติกากลางเสมอ</b> — ไฟล์ปัจจุบันมีแต่กติกากลาง
                ถ้าคณะใดต้องการสัดส่วนต่างจากกลาง (เช่น วัสดุคลินิก) ให้ตั้งเป็นกติกาเจาะจงหน่วยงาน
              </Alert>
              <Alert severity="warning">
                <b>&ldquo;ยังไม่จำแนก&rdquo; ไม่ใช่ค่าว่าง</b> — เป็นสถานะที่ตั้งใจ
                ระบบจะพักเงินไว้ที่หน่วยงานและติดธงไปที่รายการค้างตรวจ ไม่เดาแทน
              </Alert>
              <Alert severity="info">
                <b>ค่าเสื่อมราคาไม่มีรหัสผังบัญชี</b> จึงหากติกาปกติไม่เจอ — กำหนดผ่านค่าตั้ง
                &ldquo;ประเภทต้นทุนของค่าเสื่อมราคา&rdquo; ที่หน้านโยบายการคำนวณแทน
              </Alert>
              <Alert severity="success">
                การแก้กติกาต้องผ่านการอนุมัติ และรอบคำนวณที่ทำไปแล้วจะ<b>ล็อกเวอร์ชันกติกาไว้</b>{' '}
                คำนวณซ้ำได้ตัวเลขเดิมเป๊ะ
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {editing && rule && (
        <RuleEditDialog
          account={account}
          year={year}
          current={rule}
          onClose={() => setEditing(false)}
          onSubmit={submitEdit}
        />
      )}

      <Dialog open={!!confirm && !!pending} onClose={closeConfirm} maxWidth="xs" fullWidth>
        {confirm && pending && rule && (
          <>
            <DialogTitle>{CONFIRM_TEXT[confirm].title}</DialogTitle>
            <DialogContent>
              <Typography>
                {confirm === 'approve' ? (
                  <>
                    <b>{account.name}</b> จะเปลี่ยนจาก {ruleText(rule)} เป็น{' '}
                    <b>{ruleText(pending)}</b> ในปีงบ {year}
                  </>
                ) : (
                  <>คำเสนอ {ruleText(pending)} จะถูกปิด กติกาที่ใช้อยู่ไม่เปลี่ยน</>
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
          <Alert
            severity={toast.ok ? 'success' : 'error'}
            variant="filled"
            onClose={() => setToast(null)}
          >
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Grid>
  );
};

export default AccountRules;
