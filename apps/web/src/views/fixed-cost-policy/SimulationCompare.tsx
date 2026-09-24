'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

// Type Imports
import type { SimulatedMethod } from '@beps/calc-engine';

// Calc Imports
import { fmtInt, fmtMillion, STATUS_COLOR, STATUS_LABEL, statusOf } from '@views/breakeven/calc';

import { METHOD_META } from './MethodCards';

const fmtBaht = (v: number) => `${fmtInt(v)} บ.`;

/** ส่วนต่างที่ต้องอ่านทิศทางได้ทันที — บวกแดง (ต้นทุนเพิ่ม) ลบเขียว */
const DeltaText = ({ value, format }: { value: number | null; format: (v: number) => string }) => {
  if (value === null) return <span>—</span>;
  if (Math.abs(value) < 0.5)
    return (
      <Box component="span" sx={{ color: 'text.disabled' }}>
        ไม่เปลี่ยน
      </Box>
    );

  return (
    <Box
      component="span"
      sx={{ color: value > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}
    >
      {value > 0 ? '+' : '−'}
      {format(Math.abs(value))}
    </Box>
  );
};

type DrillKind = 'up' | 'down' | 'status';

type Props = {
  loading: boolean;
  error: string | null;
  baseline: SimulatedMethod | null;
  selected: SimulatedMethod | null;
  onRetry: () => void;
};

const ROWS_PER_PAGE = [10, 25, 50];

/** ขั้นที่ 3 ของ Stepper — เทียบวิธีปัจจุบันกับวิธีที่เลือก รายหลักสูตร */
const SimulationCompare = ({ loading, error, baseline, selected, onRetry }: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [drill, setDrill] = useState<DrillKind | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('md'));

  const pairs = useMemo(() => {
    if (!baseline || !selected) return [];

    return selected.programs.map((row, i) => ({ row, base: baseline.programs[i]!, i }));
  }, [baseline, selected]);

  const stats = useMemo(() => {
    const up = pairs.filter((p) => p.row.tfc - p.base.tfc > 0.5);
    const down = pairs.filter((p) => p.base.tfc - p.row.tfc > 0.5);
    const flipped = pairs.filter((p) => statusOf(p.row.breakEven) !== statusOf(p.base.breakEven));

    return { up, down, flipped };
  }, [pairs]);

  if (loading) {
    return (
      <Stack spacing={4}>
        <Typography variant="body2" color="text.secondary">
          กำลังคำนวณผลของแต่ละวิธีบนข้อมูลจริงของปีที่เลือก…
        </Typography>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={280} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            ลองใหม่
          </Button>
        }
      >
        <AlertTitle>จำลองไม่สำเร็จ</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!baseline || !selected) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <i className="ri-bar-chart-box-line" style={{ fontSize: 44, opacity: 0.4 }} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          ยังไม่มีผลจำลอง
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          กดคำนวณเพื่อดูว่าวิธีที่เลือกทำให้ต้นทุนคงที่ของแต่ละหลักสูตรเปลี่ยนไปเท่าไหร่
        </Typography>
        <Button variant="contained" startIcon={<i className="ri-play-line" />} onClick={onRetry}>
          คำนวณผลจำลอง
        </Button>
      </Box>
    );
  }

  const errors = selected.issues.filter((i) => i.severity === 'error');
  const warnings = selected.issues.filter((i) => i.severity === 'warning');
  const isBaseline = selected.key === baseline.key;

  const drillRows =
    drill === 'up'
      ? stats.up
      : drill === 'down'
        ? stats.down
        : drill === 'status'
          ? stats.flipped
          : [];

  const drillTitle =
    drill === 'up'
      ? 'หลักสูตรที่ต้นทุนคงที่เพิ่มขึ้น'
      : drill === 'down'
        ? 'หลักสูตรที่ต้นทุนคงที่ลดลง'
        : 'หลักสูตรที่สถานะจุดคุ้มทุนเปลี่ยน';

  const detailPair = detail === null ? null : (pairs[detail] ?? null);

  const kpi: {
    key: DrillKind;
    label: string;
    value: number;
    color: 'error' | 'success' | 'warning';
  }[] = [
    { key: 'up', label: 'หลักสูตรที่ต้นทุนคงที่เพิ่ม', value: stats.up.length, color: 'error' },
    { key: 'down', label: 'หลักสูตรที่ต้นทุนคงที่ลด', value: stats.down.length, color: 'success' },
    {
      key: 'status',
      label: 'สถานะจุดคุ้มทุนเปลี่ยน',
      value: stats.flipped.length,
      color: 'warning',
    },
  ];

  const rows = pairs.slice(page * perPage, page * perPage + perPage);

  return (
    <Stack spacing={4}>
      {errors.length > 0 && (
        <Alert severity="error">
          <AlertTitle>ยังเสนอขออนุมัติไม่ได้</AlertTitle>
          <Stack component="ul" sx={{ m: 0, pl: 5 }}>
            {errors.map((i, n) => (
              <li key={n}>
                {i.message}
                {i.refs?.length
                  ? ` (${i.refs.slice(0, 5).join(', ')}${i.refs.length > 5 ? ' …' : ''})`
                  : ''}
              </li>
            ))}
          </Stack>
        </Alert>
      )}
      {warnings.map((i, n) => (
        <Alert key={n} severity="warning">
          {i.message}
        </Alert>
      ))}

      {isBaseline && (
        <Alert severity="info">
          วิธีที่เลือกคือวิธีเดียวกับที่ระบบใช้อยู่ ตัวเลขทุกคอลัมน์จึงเท่ากันทั้งสองฝั่ง —
          เลือกวิธีที่ 2 หรือ 3 เพื่อเห็นส่วนต่าง
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                ยอดต้นทุนคงที่ที่ปันส่วน
              </Typography>
              <Typography variant="h5">
                {fmtMillion(selected.programs.reduce((s, p) => s + p.allocatedFixedCost, 0))} ลบ.
              </Typography>
              <Typography variant="caption" color="success.main">
                เท่ากันทุกวิธี — เปลี่ยนวิธีคือเปลี่ยนการกระจาย ไม่ใช่เปลี่ยนต้นทุน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {kpi.map((k) => (
          <Grid key={k.key} size={{ xs: 12, sm: 4, md: 3 }}>
            <Card
              sx={{ height: '100%', cursor: k.value > 0 ? 'pointer' : 'default' }}
              onClick={() => k.value > 0 && setDrill(k.key)}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="h5" color={`${k.color}.main`}>
                  {fmtInt(k.value)}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {k.value > 0 ? 'คลิกเพื่อดูรายชื่อ' : 'ไม่มีหลักสูตรในกลุ่มนี้'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {pairs.length === 0 ? (
        <Alert severity="warning">ไม่มีหลักสูตรให้เทียบในขอบเขตที่เลือก</Alert>
      ) : compact ? (
        <Stack spacing={3}>
          {rows.map(({ row, base, i }) => (
            <Card
              key={row.programVersionId}
              onClick={() => setDetail(i)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent>
                <Typography fontWeight={600}>{row.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.bucketKey ?? '—'} · {fmtInt(base.breakEven.q)} นิสิต
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ต้นทุนคงที่</span>
                    <span>
                      {fmtBaht(base.tfc)} → {fmtBaht(row.tfc)}
                    </span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนต่าง</span>
                    <DeltaText value={row.tfc - base.tfc} format={fmtBaht} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Q*</span>
                    <span>
                      {fmtInt(base.breakEven.qStar)} → {fmtInt(row.breakEven.qStar)}
                    </span>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>หลักสูตร</TableCell>
                <TableCell rowSpan={2} align="right">
                  นิสิต
                </TableCell>
                <TableCell colSpan={3} align="center">
                  ต้นทุนคงที่ (TFC)
                </TableCell>
                <TableCell colSpan={2} align="center">
                  คงที่ต่อหัว
                </TableCell>
                <TableCell colSpan={3} align="center">
                  จุดคุ้มทุน Q*
                </TableCell>
                <TableCell rowSpan={2} align="center">
                  สถานะ
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right">ปัจจุบัน</TableCell>
                <TableCell align="right">วิธีที่เลือก</TableCell>
                <TableCell align="right">ส่วนต่าง</TableCell>
                <TableCell align="right">ปัจจุบัน</TableCell>
                <TableCell align="right">วิธีที่เลือก</TableCell>
                <TableCell align="right">ปัจจุบัน</TableCell>
                <TableCell align="right">วิธีที่เลือก</TableCell>
                <TableCell align="right">ส่วนต่าง</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ row, base, i }) => {
                const st = statusOf(row.breakEven);
                const flipped = st !== statusOf(base.breakEven);

                return (
                  <TableRow
                    key={row.programVersionId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setDetail(i)}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ maxWidth: 260 }}
                        title={row.label}
                      >
                        {row.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.bucketKey ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fmtInt(base.breakEven.q)}</TableCell>
                    <TableCell align="right">{fmtBaht(base.tfc)}</TableCell>
                    <TableCell align="right">{fmtBaht(row.tfc)}</TableCell>
                    <TableCell align="right">
                      <DeltaText value={row.tfc - base.tfc} format={fmtBaht} />
                    </TableCell>
                    <TableCell align="right">{fmtInt(base.fixedCostPerHead)}</TableCell>
                    <TableCell align="right">{fmtInt(row.fixedCostPerHead)}</TableCell>
                    <TableCell align="right">{fmtInt(base.breakEven.qStar)}</TableCell>
                    <TableCell align="right">{fmtInt(row.breakEven.qStar)}</TableCell>
                    <TableCell align="right">
                      <DeltaText
                        value={
                          row.breakEven.qStar !== null && base.breakEven.qStar !== null
                            ? row.breakEven.qStar - base.breakEven.qStar
                            : null
                        }
                        format={(v) => `${fmtInt(v)} คน`}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        variant="tonal"
                        color={STATUS_COLOR[st]}
                        label={flipped ? `${STATUS_LABEL[st]} *` : STATUS_LABEL[st]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pairs.length > ROWS_PER_PAGE[0]! && (
        <TablePagination
          component="div"
          count={pairs.length}
          page={page}
          rowsPerPage={perPage}
          rowsPerPageOptions={ROWS_PER_PAGE}
          labelRowsPerPage="แถวต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(0);
          }}
        />
      )}

      {/* เจาะจากตัวเลขสรุป → รายชื่อหลักสูตรที่อยู่เบื้องหลังตัวเลขนั้น */}
      <Dialog open={drill !== null} onClose={() => setDrill(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{drillTitle}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>หลักสูตร</TableCell>
                <TableCell align="right">ส่วนต่าง TFC</TableCell>
                <TableCell align="right">ส่วนต่าง Q*</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drillRows.map(({ row, base }) => (
                <TableRow key={row.programVersionId}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell align="right">
                    <DeltaText value={row.tfc - base.tfc} format={fmtBaht} />
                  </TableCell>
                  <TableCell align="right">
                    <DeltaText
                      value={
                        row.breakEven.qStar !== null && base.breakEven.qStar !== null
                          ? row.breakEven.qStar - base.breakEven.qStar
                          : null
                      }
                      format={(v) => `${fmtInt(v)} คน`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrill(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* รายละเอียดรายหลักสูตร */}
      <Dialog open={detailPair !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detailPair && (
          <>
            <DialogTitle>
              {detailPair.row.label}
              <Typography variant="caption" color="text.secondary" display="block">
                {detailPair.row.bucketKey ?? 'ไม่แบ่งกลุ่ม'} · {fmtInt(detailPair.base.breakEven.q)}{' '}
                นิสิต
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>รายการ</TableCell>
                    <TableCell align="right">
                      {METHOD_META.find((m) => m.value === baseline.policy.method)?.label ??
                        'ปัจจุบัน'}
                    </TableCell>
                    <TableCell align="right">
                      {METHOD_META.find((m) => m.value === selected.policy.method)?.label ??
                        'ที่เลือก'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    [
                      'ต้นทุนคงที่ทางตรง',
                      detailPair.base.directFixedCost,
                      detailPair.row.directFixedCost,
                      fmtBaht,
                    ],
                    [
                      'ส่วนที่ได้รับปันส่วน',
                      detailPair.base.allocatedFixedCost,
                      detailPair.row.allocatedFixedCost,
                      fmtBaht,
                    ],
                    ['ต้นทุนคงที่รวม', detailPair.base.tfc, detailPair.row.tfc, fmtBaht],
                    [
                      'ต้นทุนคงที่ต่อหัว',
                      detailPair.base.fixedCostPerHead,
                      detailPair.row.fixedCostPerHead,
                      fmtBaht,
                    ],
                    [
                      'ต้นทุนรวมต่อหัว (ATC)',
                      detailPair.base.breakEven.atc,
                      detailPair.row.breakEven.atc,
                      fmtBaht,
                    ],
                    [
                      'จุดคุ้มทุน Q*',
                      detailPair.base.breakEven.qStar,
                      detailPair.row.breakEven.qStar,
                      (v: number) => `${fmtInt(v)} คน`,
                    ],
                    [
                      'กำไร/ขาดทุน',
                      detailPair.base.breakEven.profit,
                      detailPair.row.breakEven.profit,
                      fmtBaht,
                    ],
                  ].map(([label, a, b, fmt]) => {
                    const f = fmt as (v: number) => string;

                    return (
                      <TableRow key={label as string}>
                        <TableCell>{label as string}</TableCell>
                        <TableCell align="right">{a === null ? '—' : f(a as number)}</TableCell>
                        <TableCell align="right">{b === null ? '—' : f(b as number)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)}>ปิด</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
};

export default SimulationCompare;
