'use client';

/**
 * คำนวณจุดคุ้มทุน "แยกรายกลุ่มนิสิต" — ข้อกำหนด Student Segregation Analysis
 *
 * ต่างจากการ์ด AdmissionBreakdown ตรงที่ไม่ได้เอา Q* รวมมาแตกยอด แต่รับอัตราต่อหัว
 * ของแต่ละกลุ่ม (ค่าธรรมเนียม / เงินอุดหนุน / ต้นทุนผันแปร) แล้วหา Q* จาก CM
 * ถัวเฉลี่ยถ่วงน้ำหนัก จึงสะท้อนว่า "กลุ่มที่ค่าเทอมสูงกว่าช่วยดึงจุดคุ้มทุนลง" ได้จริง
 * และใช้กับหลักสูตรใหม่ที่ยังไม่มีนิสิตได้ เพราะไม่ต้องรู้ Q ล่วงหน้า
 *
 * สูตรอยู่ใน @beps/calc-engine (segmented.ts) ไม่ได้คำนวณในหน้าจอ — หน้าจอมีหน้าที่
 * รับค่าและแสดงผลเท่านั้น เพื่อให้ผลตรงกับฝั่ง batch เมื่อย้ายไปคำนวณบนเซิร์ฟเวอร์
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';

import type { RevenueMode } from '@beps/calc-engine';

import { downloadCsv } from '@/utils/csv';

import type { SegmentKey, SegmentRates } from './admissionPlanStore';
import { SEGMENT_LABELS } from './admissionPlanStore';
import type { AdmissionPlanState } from './useAdmissionPlan';

const baht = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : v.toLocaleString('th-TH', { maximumFractionDigits: 0 });

const RATE_FIELDS: { key: keyof SegmentRates; label: string; hint: string }[] = [
  { key: 'fee', label: 'ค่าธรรมเนียม/หัว', hint: 'เงินรายได้ที่เก็บจากนิสิตกลุ่มนี้ต่อปี' },
  {
    key: 'gov',
    label: 'เงินอุดหนุน/หัว',
    hint: 'เงินแผ่นดินที่ได้ต่อหัว — นับเฉพาะโหมดรวมเงินแผ่นดิน',
  },
  { key: 'avc', label: 'ต้นทุนผันแปร/หัว', hint: 'ต้นทุนที่เพิ่มขึ้นตามจำนวนนิสิตกลุ่มนี้' },
];

interface Props {
  programName: string;
  revenueMode: RevenueMode;
  state: AdmissionPlanState;
}

const SegmentedBreakEven = ({ programName, revenueMode, state }: Props) => {
  const { segmented, activeSegments, segmentedResult: result } = state;

  const setTfc = (v: number) =>
    state.setSegmented((prev) => ({ ...prev, tfc: Math.max(0, Number.isFinite(v) ? v : 0) }));

  const setRate = (key: SegmentKey, field: keyof SegmentRates, v: number) =>
    state.setSegmented((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [key]: { ...prev.rates[key], [field]: Math.max(0, Number.isFinite(v) ? v : 0) },
      },
    }));

  const ratesEmpty = activeSegments.every(
    ({ key }) => !segmented.rates[key].fee && !segmented.rates[key].gov,
  );

  const exportCsv = () => {
    downloadCsv(`จุดคุ้มทุนแยกรายกลุ่ม-${programName}`, [
      ['หลักสูตร', programName],
      ['ฐานรายได้', revenueMode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'],
      ['ต้นทุนคงที่รวม (บาท)', segmented.tfc],
      ['CM ถัวเฉลี่ยถ่วงน้ำหนัก (บาท/หัว)', result.weightedCm ?? ''],
      ['จุดคุ้มทุนรวม (คน)', result.qStar ?? 'คำนวณไม่ได้'],
      ['รายได้ ณ จุดคุ้มทุน (บาท)', result.breakEvenRevenue ?? ''],
      ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
      [],
      [
        'กลุ่มนิสิต',
        'สัดส่วน (%)',
        'ค่าธรรมเนียม/หัว',
        'เงินอุดหนุน/หัว',
        'รายได้/หัว (R)',
        'ต้นทุนผันแปร/หัว (AVC)',
        'CM/หัว',
        'จำนวนที่ต้องรับ (คน)',
        'รายได้ ณ จุดคุ้มทุน (บาท)',
      ],
      ...result.segments.map((s) => [
        s.label,
        (s.weight * 100).toFixed(2),
        segmented.rates[s.key as SegmentKey].fee,
        segmented.rates[s.key as SegmentKey].gov,
        s.r,
        s.avc,
        s.cm,
        s.heads ?? '',
        s.revenue ?? '',
      ]),
    ]);
    state.setToast('ส่งออก CSV แล้ว');
  };

  return (
    <Card>
      <CardHeader
        title="คำนวณจุดคุ้มทุนแยกรายกลุ่ม (Student Segregation)"
        subheader="กรอกอัตราต่อหัวของแต่ละกลุ่ม ระบบหา Q* จาก CM ถัวเฉลี่ยถ่วงน้ำหนัก — ไม่ต้องรู้จำนวนนิสิตล่วงหน้า"
        action={
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            disabled={ratesEmpty}
            onClick={exportCsv}
          >
            ส่งออก CSV
          </Button>
        }
      />
      <CardContent>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="ต้นทุนคงที่รวมของหลักสูตร (TFC)"
              value={segmented.tfc || ''}
              onChange={(e) => setTfc(Number(e.target.value))}
              helperText="ต้นทุนที่ไม่เปลี่ยนตามจำนวนนิสิต เช่น เงินเดือนอาจารย์ประจำหลักสูตร"
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">บาท</InputAdornment> },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 8 }}>
            <Alert severity="info" variant="outlined" sx={{ height: '100%' }}>
              สัดส่วนกลุ่มดึงมาจากการ์ดด้านบน — ปรับสัดส่วนที่นั่น แล้วตารางนี้จะคำนวณใหม่ทันที
              ฐานรายได้ที่ใช้อยู่คือ{' '}
              <strong>
                {revenueMode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'}
              </strong>
              {revenueMode === 'without_government' && ' (ช่องเงินอุดหนุน/หัว จะไม่ถูกนับ)'}
            </Alert>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          อัตราต่อหัวรายกลุ่ม
        </Typography>

        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>กลุ่มนิสิต</TableCell>
                <TableCell align="right">สัดส่วน</TableCell>
                {RATE_FIELDS.map((f) => (
                  <TableCell key={f.key} align="right" sx={{ minWidth: 150 }}>
                    {f.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeSegments.map(({ key, share }) => (
                <TableRow key={key} hover>
                  <TableCell>{SEGMENT_LABELS[key]}</TableCell>
                  <TableCell align="right">{share.toLocaleString('th-TH')}%</TableCell>
                  {RATE_FIELDS.map((f) => (
                    <TableCell key={f.key} align="right">
                      <TextField
                        size="small"
                        type="number"
                        disabled={f.key === 'gov' && revenueMode === 'without_government'}
                        value={segmented.rates[key][f.key] || ''}
                        onChange={(e) => setRate(key, f.key, Number(e.target.value))}
                        sx={{ width: 140 }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {ratesEmpty ? (
          <Alert severity="info" variant="outlined">
            กรอกค่าธรรมเนียม/หัว อย่างน้อยหนึ่งกลุ่ม เพื่อคำนวณจุดคุ้มทุนแยกรายกลุ่ม
          </Alert>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {[
                {
                  label: 'จุดคุ้มทุนรวม (Q*)',
                  value: result.qStar === null ? 'คำนวณไม่ได้' : `${baht(result.qStar)} คน`,
                },
                { label: 'CM ถัวเฉลี่ยถ่วงน้ำหนัก', value: `${baht(result.weightedCm)} บาท/หัว` },
                { label: 'รายได้ต่อหัวถัวเฉลี่ย', value: `${baht(result.weightedR)} บาท/หัว` },
                { label: 'รายได้ ณ จุดคุ้มทุน', value: `${baht(result.breakEvenRevenue)} บาท` },
              ].map((kpi) => (
                <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {result.qStarStatus === 'full_cost_recovery' && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                CM ถัวเฉลี่ย ≤ 0 (ต้นทุนผันแปรต่อหัวสูงกว่ารายได้ต่อหัว) — ตัวเลขที่แสดงเป็น
                &quot;เป้าหมายขั้นต่ำเพื่อคืนต้นทุนทั้งหมด&quot; ตามสูตร 7 ไม่ใช่จุดคุ้มทุนจริง
                รับนิสิตเพิ่มในโครงสร้างนี้จะยิ่งขาดทุน
              </Alert>
            )}

            {result.qStarStatus === 'not_computable' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                คำนวณจุดคุ้มทุนไม่ได้ — ตรวจว่ากรอกค่าธรรมเนียมและต้นทุนผันแปรครบทุกกลุ่มที่เปิดไว้
              </Alert>
            )}

            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>กลุ่มนิสิต</TableCell>
                    <TableCell align="right">สัดส่วน</TableCell>
                    <TableCell align="right">รายได้/หัว (R)</TableCell>
                    <TableCell align="right">ต้นทุนผันแปร/หัว</TableCell>
                    <TableCell align="right">CM/หัว</TableCell>
                    <TableCell align="right">จำนวนที่ต้องรับ</TableCell>
                    <TableCell align="right">รายได้ ณ จุดคุ้มทุน</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.segments.map((s) => (
                    <TableRow key={s.key} hover>
                      <TableCell>{s.label}</TableCell>
                      <TableCell align="right">
                        {(s.weight * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%
                      </TableCell>
                      <TableCell align="right">{baht(s.r)}</TableCell>
                      <TableCell align="right">{baht(s.avc)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          variant="tonal"
                          color={s.cm > 0 ? 'success' : 'error'}
                          label={baht(s.cm)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {s.heads === null ? '—' : baht(s.heads)}
                      </TableCell>
                      <TableCell align="right">{baht(s.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      100%
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {baht(result.weightedR)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {baht(result.weightedAvc)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {baht(result.weightedCm)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {result.qStar === null ? '—' : baht(result.qStar)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {baht(result.breakEvenRevenue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SegmentedBreakEven;
