'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';
import type { ProgRow } from '@/data/mockup';
import { fmtMillion, REVENUE_MODE_LABEL, sheetQStar } from '@views/breakeven/calc';
import PercentTable, { fillRemainderPct } from '@views/fixed-cost-policy/PercentTable';

import {
  ALLOC_METHOD_LABEL,
  type AllocBucket,
  type AllocChoice,
  type AllocMethod,
  type AllocOutcome,
} from './facultyAllocation';

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtD = (v: number) => {
  const x = Math.round(v);

  return x === 0 ? '0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toLocaleString('th-TH')}`;
};

export const METHOD_HINT: Record<AllocMethod, string> = {
  SHEET:
    'ใช้ส่วนแบ่งที่ไฟล์ Excel ปันไว้แล้ว (ตามจำนวนนิสิตรายกลุ่มระดับ) — ตัวเลขตรงกับชีต ไม่ปันส่วนใหม่',
  PER_HEAD_FTES: 'ก้อนส่วนกลางคณะแบ่งตามจำนวนนิสิตของแต่ละหลักสูตร หลักสูตรใหญ่รับมาก',
  EQUAL_PROGRAM: 'ก้อนส่วนกลางคณะหารเท่ากันทุกหลักสูตร ไม่ขึ้นกับจำนวนนิสิต',
  CUSTOM_PCT:
    'คณะกำหนด % เองรายระดับการศึกษาหรือรายหลักสูตร (ต้องรวม 100% พอดี) แล้วแบ่งต่อภายในกลุ่ม',
};

const METHODS: AllocMethod[] = ['SHEET', 'PER_HEAD_FTES', 'EQUAL_PROGRAM', 'CUSTOM_PCT'];

interface Props {
  faculty: string | null;
  isNew: boolean;
  /** หลักสูตรใหม่ตั้งต้นจากหลักสูตรอ้างอิง (มีส่วนแบ่งของหลักสูตรนั้นติดมา) */
  hasRef: boolean;
  choice: AllocChoice;
  onChoice: (c: AllocChoice) => void;
  /** แหล่งที่มาของทางเลือกปัจจุบัน — เช่น ดึงจากร่างนโยบาย W20 */
  choiceSource: string | null;
  buckets: AllocBucket[];
  pool: number;
  /** หลักสูตรเดิมของคณะ (ใช้คำนวณ Q* ของหลักสูตรอื่นแบบชีต) */
  rows: { id: string; p: ProgRow }[];
  /** ผลปันส่วนของคอลัมน์ที่ใช้คำนวณอยู่ */
  outcome: AllocOutcome | null;
  /** หลักสูตรที่กำลังคำนวณ (คอลัมน์ที่ใช้คำนวณ) */
  targetId: string | null;
  targetLabel: string;
  mode: RevenueMode;
  onToast: (msg: string) => void;
}

const ROWS_PER_PAGE = 10;

/**
 * ขั้น "ปันส่วนต้นทุนคงที่" ก่อนคำนวณจุดคุ้มทุน — ตามมติ 3 วิธี + ตัวเลขเดิมตามชีต
 * ปันใหม่ทั้งคณะเสมอ (หลักสูตรใหม่เข้าไปแบ่งก้อนเดิม) แล้วเปิดดูผลกระทบต่อหลักสูตรอื่นได้
 */
const FixedCostAllocationCard = ({
  faculty,
  isNew,
  hasRef,
  choice,
  onChoice,
  choiceSource,
  buckets,
  pool,
  rows,
  outcome,
  targetId,
  targetLabel,
  mode,
  onToast,
}: Props) => {
  const [impactOpen, setImpactOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [page, setPage] = useState(0);

  const set = (patch: Partial<AllocChoice>) => onChoice({ ...choice, ...patch });
  const target = outcome?.shares.find((s) => s.id === targetId) ?? null;
  const errors = outcome?.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings = outcome?.issues.filter((i) => i.severity === 'warning') ?? [];
  const blocked = choice.method !== 'SHEET' && !!outcome && !outcome.applied;

  // ผลกระทบต่อหลักสูตรอื่นในคณะ — Q* ใช้สูตรชีตเดียวกับหน้ารายงาน เทียบก่อน/หลังด้วยสูตรเดียวกัน
  const impact = useMemo(() => {
    if (!outcome?.applied) return [];
    const byId = new Map(outcome.shares.map((s) => [s.id, s]));

    return rows
      .filter((r) => r.id !== targetId)
      .map(({ id, p }) => {
        const s = byId.get(id)!;
        const after = { ...p, TFC: p.TFC - s.before + s.after };

        return {
          id,
          label: `${p.prog} — ${p.deg}`,
          lvl: p.lvl,
          q: p.Q,
          before: s.before,
          after: s.after,
          qBefore: sheetQStar(p, mode),
          qAfter: sheetQStar(after, mode),
        };
      })
      .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
  }, [outcome, rows, targetId, mode]);

  const counted = outcome?.shares.reduce((s, x) => s + x.after, 0) ?? 0;
  const sheetCounted = outcome?.shares.reduce((s, x) => s + x.before, 0) ?? 0;

  const fill = () => {
    const res = fillRemainderPct(buckets, choice.pct);

    if (!res) return;
    if ('error' in res) onToast(res.error);
    else set({ pct: res.pct });
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={<DotTitle color="info.main">ปันส่วนต้นทุนคงที่ส่วนกลางคณะ</DotTitle>}
        subheader="งบสำนักงาน/ส่วนกลางคณะ + ค่าเสื่อม ถูกปันลงทุกหลักสูตรในคณะก่อน แล้วจึงคำนวณจุดคุ้มทุนของหลักสูตรนี้จากส่วนแบ่งที่ได้"
      />
      <CardContent>
        {!faculty ? (
          <Alert severity="info" variant="outlined">
            เลือกคณะก่อน — การปันส่วนต้องคำนวณทั้งคณะ
          </Alert>
        ) : (
          <>
            <ToggleButtonGroup
              exclusive
              color="primary"
              value={choice.method}
              onChange={(_, v: AllocMethod | null) => v && set({ method: v })}
              sx={{ flexWrap: 'wrap', mb: 1.5 }}
            >
              {METHODS.map((m) => (
                <ToggleButton key={m} value={m}>
                  {ALLOC_METHOD_LABEL[m]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {METHOD_HINT[choice.method]}
              {choiceSource && (
                <Box component="span" sx={{ display: 'block', color: 'info.main' }}>
                  {choiceSource}
                </Box>
              )}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              {(
                [
                  ['ก้อนส่วนกลางคณะ', `${fmtMillion(pool)} ลบ.`, 'ยอดเดียวกันทุกวิธี'],
                  [
                    'หลักสูตรที่ร่วมแบ่ง',
                    `${rows.length + (isNew ? 1 : 0)} หลักสูตร`,
                    isNew ? `เดิม ${rows.length} + หลักสูตรใหม่ 1` : 'ทุกหลักสูตรในคณะ',
                  ],
                  [
                    `ส่วนแบ่งของ${targetLabel}`,
                    target ? `${fmtB(target.after)} บาท` : '—',
                    target
                      ? `ตามชีต ${fmtB(target.before)} · ผลต่าง ${fmtD(target.after - target.before)}`
                      : 'เลือกหลักสูตรก่อน',
                  ],
                ] as const
              ).map(([label, value, note]) => (
                <Grid key={label} size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover', height: '100%' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {label}
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {note}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {isNew && choice.method === 'SHEET' && hasRef && target && (
              <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
                แบบตามชีต หลักสูตรใหม่ได้ส่วนแบ่งเท่าหลักสูตรอ้างอิง ({fmtB(target.before)} บาท)
                โดยหลักสูตรเดิมไม่ได้ส่วนแบ่งลดลง — ต้นทุนส่วนกลางคณะจึงถูกนับเพิ่มจาก{' '}
                {fmtMillion(pool)} เป็น {fmtMillion(sheetCounted)} ลบ. ·
                เลือกวิธีอื่นเพื่อปันก้อนเดิมใหม่ทั้งคณะ
              </Alert>
            )}
            {isNew && !hasRef && (
              <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                ไม่มีหลักสูตรอ้างอิง — ต้นทุนคงที่ที่กรอกในตารางถือเป็นต้นทุนตรงของหลักสูตร
                {choice.method === 'SHEET'
                  ? ' และแบบตามชีตจะไม่บวกส่วนแบ่งส่วนกลางคณะให้'
                  : ' ระบบบวกส่วนแบ่งส่วนกลางคณะให้ตามวิธีที่เลือก'}
              </Alert>
            )}

            {choice.method === 'CUSTOM_PCT' && (
              <Box sx={{ mb: 3 }}>
                <PercentTable
                  buckets={buckets}
                  pct={choice.pct}
                  onPctChange={(k, v) => set({ pct: { ...choice.pct, [k]: v } })}
                  bucketLevel={choice.bucketLevel}
                  onBucketLevelChange={(bucketLevel) => set({ bucketLevel })}
                  subMethod={choice.subMethod}
                  onSubMethodChange={(subMethod) => set({ subMethod })}
                  onFillRemainder={fill}
                  onClearDraft={() => setConfirmClear(true)}
                  draftSavedAt={null}
                />
              </Box>
            )}

            {errors.map((i) => (
              <Alert key={i.code} severity="error" sx={{ mb: 2 }}>
                {i.message}
                {i.refs?.length ? ` — ${i.refs.join(', ')}` : ''}
              </Alert>
            ))}
            {blocked && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                ยังใช้ส่วนแบ่งตามชีตในการคำนวณ จนกว่าจะแก้ข้อทักท้วงข้างบน และยังบันทึกผลไม่ได้
              </Alert>
            )}
            {warnings.map((i) => (
              <Alert key={i.code} severity="warning" variant="outlined" sx={{ mb: 2 }}>
                {i.message}
              </Alert>
            ))}

            {outcome?.applied && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<i className="ri-git-branch-line" />}
                  onClick={() => {
                    setPage(0);
                    setImpactOpen(true);
                  }}
                >
                  ดูผลกระทบต่อหลักสูตรอื่นในคณะ ({impact.length})
                </Button>
                <Typography variant="caption" color="text.secondary">
                  ส่วนกลางคณะที่ถูกนับรวมทุกหลักสูตร {fmtB(counted)} บาท = ก้อนของคณะพอดี
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={impactOpen} onClose={() => setImpactOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          ผลกระทบต่อหลักสูตรอื่นใน{faculty} — {ALLOC_METHOD_LABEL[choice.method]}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {isNew
              ? 'หลักสูตรใหม่เข้าไปแบ่งก้อนส่วนกลางเดิมของคณะ ส่วนแบ่งของหลักสูตรเดิมจึงเปลี่ยน'
              : 'ส่วนแบ่งของหลักสูตรอื่นเมื่อปันก้อนส่วนกลางคณะด้วยวิธีนี้'}{' '}
            · Q* แบบชีต ROUNDUP(TFC ÷ (R − AVC)) {REVENUE_MODE_LABEL[mode]} · เรียงตามผลต่างมากสุด
          </DialogContentText>
          {impact.length === 0 ? (
            <Alert severity="info">คณะนี้ไม่มีหลักสูตรอื่น</Alert>
          ) : (
            <>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>หลักสูตร</TableCell>
                      <TableCell>ระดับ</TableCell>
                      <TableCell align="right">นิสิต</TableCell>
                      <TableCell align="right">ส่วนแบ่งตามชีต</TableCell>
                      <TableCell align="right">ส่วนแบ่งใหม่</TableCell>
                      <TableCell align="right">ผลต่าง</TableCell>
                      <TableCell align="right">Q* เดิม</TableCell>
                      <TableCell align="right">Q* ใหม่</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {impact
                      .slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE)
                      .map((r) => {
                        const d = r.after - r.before;

                        return (
                          <TableRow key={r.id} hover>
                            <TableCell>{r.label}</TableCell>
                            <TableCell>{r.lvl}</TableCell>
                            <TableCell align="right">{fmtB(r.q)}</TableCell>
                            <TableCell align="right">{fmtB(r.before)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {fmtB(r.after)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color:
                                  Math.round(d) === 0
                                    ? 'text.disabled'
                                    : d > 0
                                      ? 'error.main'
                                      : 'success.main',
                              }}
                            >
                              {fmtD(d)}
                            </TableCell>
                            <TableCell align="right">{fmtB(r.qBefore)}</TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: r.qAfter < 0 ? 'warning.main' : undefined,
                              }}
                            >
                              {fmtB(r.qAfter)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              {impact.length > ROWS_PER_PAGE && (
                <TablePagination
                  component="div"
                  count={impact.length}
                  page={page}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[ROWS_PER_PAGE]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                  onPageChange={(_, p) => setPage(p)}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpactOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>ล้างสัดส่วนที่กรอกไว้?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            สัดส่วน % ของ{faculty}ที่กรอกในหน้านี้จะถูกลบ (ร่างนโยบายในหน้า W20 ไม่ถูกแตะ)
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>ยกเลิก</Button>
          <Button
            color="error"
            onClick={() => {
              set({ pct: {} });
              setConfirmClear(false);
            }}
          >
            ล้าง
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default FixedCostAllocationCard;
