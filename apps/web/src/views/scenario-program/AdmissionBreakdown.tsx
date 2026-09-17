'use client';

import { useMemo, useState } from 'react';

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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';

/**
 * แบ่งจุดคุ้มทุนรวม (Q*) ตามแผนการรับนิสิต — ตามที่กองแผนงานขอ (บันทึกเสียงประชุม 2026):
 * คำนวณจุดคุ้มทุนรวมจากโครงสร้างต้นทุน/รายได้ก่อน แล้วค่อยแตกยอดเป็นกลุ่มนิสิตไทย/ต่างชาติ
 * x ภาคปกติ/พิเศษ (+ หลักสูตรต่อเนื่องสำหรับบางหลักสูตร) ใช้ได้ทั้งหลักสูตรเดิมและหลักสูตรใหม่
 *
 * ระบบยังไม่มีข้อมูลจริงแยกไทย/ต่างชาติ x ปกติ/พิเศษ ต่อหลักสูตร (รอเชื่อมข้อมูลทะเบียนใน
 * apps/api) — สัดส่วนนี้จึงเป็นค่าที่ผู้ใช้กำหนดเอง ไม่ใช่ค่าจริงจากระบบ
 */

type CategoryKey = 'thaiSpecial' | 'foreignRegular' | 'foreignSpecial' | 'continuing';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  thaiSpecial: 'นิสิตไทย · ภาคพิเศษ',
  foreignRegular: 'นิสิตต่างชาติ · ภาคปกติ',
  foreignSpecial: 'นิสิตต่างชาติ · ภาคพิเศษ',
  continuing: 'หลักสูตรต่อเนื่อง (รับนิสิตเชื่อมโยง)',
};

/** ปัดเศษจำนวนคนให้รวมได้เท่ากับ total เป๊ะ ด้วยวิธี largest remainder */
const distributeByShare = (total: number, shares: number[]): number[] => {
  const raw = shares.map((s) => (total * s) / 100);
  const floors = raw.map((v) => Math.floor(v));
  let remaining = total - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];

  for (const { i } of order) {
    if (remaining <= 0) break;
    result[i] = (result[i] ?? 0) + 1;
    remaining -= 1;
  }

  return result;
};

const AdmissionBreakdown = ({ qStar, programName }: { qStar: number | null; programName: string }) => {
  const [enabled, setEnabled] = useState<Record<CategoryKey, boolean>>({
    thaiSpecial: false,
    foreignRegular: false,
    foreignSpecial: false,
    continuing: false,
  });
  const [pct, setPct] = useState<Record<CategoryKey, number>>({
    thaiSpecial: 0,
    foreignRegular: 0,
    foreignSpecial: 0,
    continuing: 0,
  });

  const activeKeys = (Object.keys(enabled) as CategoryKey[]).filter((k) => enabled[k]);
  const otherTotal = activeKeys.reduce((sum, k) => sum + (pct[k] || 0), 0);
  const thaiRegularPct = Math.max(0, 100 - otherTotal);
  const overAllocated = otherTotal > 100;

  const rows = useMemo(() => {
    const labels = ['นิสิตไทย · ภาคปกติ', ...activeKeys.map((k) => CATEGORY_LABELS[k])];
    const shares = [thaiRegularPct, ...activeKeys.map((k) => pct[k] || 0)];
    const heads = qStar && qStar > 0 ? distributeByShare(qStar, shares) : shares.map(() => 0);

    return labels.map((label, i) => ({ label, pct: shares[i] ?? 0, head: heads[i] ?? 0 }));
  }, [activeKeys, pct, thaiRegularPct, qStar]);

  const setCategoryPct = (key: CategoryKey, value: number) => {
    const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

    setPct((prev) => ({ ...prev, [key]: clamped }));
  };

  const toggleCategory = (key: CategoryKey, on: boolean) => {
    setEnabled((prev) => ({ ...prev, [key]: on }));

    if (!on) setPct((prev) => ({ ...prev, [key]: 0 }));
  };

  if (!qStar || qStar <= 0) return null;

  return (
    <Card sx={{ mt: 4 }}>
      <CardHeader
        title="แยกจุดคุ้มทุนตามแผนการรับนิสิต"
        subheader={`${programName} — จุดคุ้มทุนรวม ${qStar.toLocaleString('th-TH')} คน แตกยอดเป็นกลุ่มนิสิตด้านล่าง`}
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          เปิดกลุ่มที่ต้องการแยก แล้วกำหนดสัดส่วน (%) — นิสิตไทยภาคปกติจะคำนวณเป็นส่วนที่เหลือให้อัตโนมัติ
        </Typography>

        {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
          <Box
            key={key}
            sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, flexWrap: 'wrap' }}
          >
            <FormControlLabel
              sx={{ minWidth: 260 }}
              control={
                <Switch
                  checked={enabled[key]}
                  onChange={(e) => toggleCategory(key, e.target.checked)}
                />
              }
              label={CATEGORY_LABELS[key]}
            />
            <TextField
              size="small"
              type="number"
              disabled={!enabled[key]}
              value={pct[key] || ''}
              onChange={(e) => setCategoryPct(key, Number(e.target.value))}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              sx={{ width: 120 }}
            />
          </Box>
        ))}

        {overAllocated && (
          <Alert severity="error" sx={{ mb: 2 }}>
            สัดส่วนรวมของกลุ่มที่เปิดไว้เกิน 100% ({otherTotal.toLocaleString('th-TH')}%) — ลดสัดส่วนลงก่อน
          </Alert>
        )}

        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>กลุ่มนิสิต</TableCell>
                <TableCell align="right">สัดส่วน</TableCell>
                <TableCell align="right">จำนวนที่ต้องรับ (คน)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label} hover>
                  <TableCell>{r.label}</TableCell>
                  <TableCell align="right">{r.pct.toLocaleString('th-TH')}%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {r.head.toLocaleString('th-TH')}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  100%
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {qStar.toLocaleString('th-TH')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
          สัดส่วนไทย/ต่างชาติ x ภาคปกติ/พิเศษ ของแต่ละหลักสูตรยังไม่มีในระบบ (รอเชื่อมข้อมูลทะเบียนใน apps/api) —
          ตัวเลขข้างบนคำนวณจากสัดส่วนที่ผู้ใช้กำหนดเอง ไม่ใช่ข้อมูลจริงจากระบบทะเบียน
          หากต้องการดูรายละเอียดเกณฑ์การปันส่วนต้นทุนคงที่/ต้นทุนผันแปรเพิ่มเติม แจ้งทีมพัฒนาได้
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AdmissionBreakdown;
