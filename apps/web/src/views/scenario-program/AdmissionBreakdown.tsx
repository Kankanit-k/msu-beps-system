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
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';

import { DotTitle } from '@components/ChartBits';

import { distributeHeads } from '@beps/calc-engine';

import { downloadCsv } from '@/utils/csv';

import type { AdmissionPlan } from './admissionPlanStore';
import { CATEGORY_KEYS, SEGMENT_LABELS } from './admissionPlanStore';
import type { AdmissionPlanState } from './useAdmissionPlan';

/**
 * แบ่งจุดคุ้มทุนรวม (Q*) ตามแผนการรับนิสิต — ตามที่กองแผนงานขอ (บันทึกเสียงประชุม 2026):
 * คำนวณจุดคุ้มทุนรวมจากโครงสร้างต้นทุน/รายได้ก่อน แล้วค่อยแตกยอดเป็นกลุ่มนิสิตไทย/ต่างชาติ
 * x ภาคปกติ/พิเศษ (+ หลักสูตรต่อเนื่องสำหรับบางหลักสูตร)
 *
 * วิธีนี้ถือว่าทุกกลุ่มมีอัตราเท่ากัน จึงใช้ได้เมื่อยังไม่รู้ค่าธรรมเนียมรายกลุ่ม —
 * ถ้ารู้อัตราแล้วให้ใช้การ์ด "คำนวณจุดคุ้มทุนแยกรายกลุ่ม" (SegmentedBreakEven) ซึ่งแม่นกว่า
 *
 * สถานะทั้งหมดอยู่ใน useAdmissionPlan เพื่อให้การ์ดอื่นบนหน้าเดียวกันเห็นค่าชุดเดียวกัน
 */

const planLabel = (p: AdmissionPlan) => `${p.name} · ${p.programName} · ${p.savedAt}`;

interface Props {
  qStar: number | null;
  programName: string;
  state: AdmissionPlanState;
}

const AdmissionBreakdown = ({ qStar, programName, state }: Props) => {
  const { mix, plans, loadingPlans, selectedPlan, pristine, shares } = state;
  const { enabled, pct } = mix;
  const { activeKeys, otherTotal, thaiRegularPct, overAllocated } = shares;

  const [saveOpen, setSaveOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null);

  const rows = useMemo(() => {
    const labels = [SEGMENT_LABELS.thaiRegular, ...activeKeys.map((k) => SEGMENT_LABELS[k])];
    const pcts = [thaiRegularPct, ...activeKeys.map((k) => pct[k] || 0)];
    const heads = qStar && qStar > 0 ? distributeHeads(qStar, pcts) : pcts.map(() => 0);

    return labels.map((label, i) => ({ label, pct: pcts[i] ?? 0, head: heads[i] ?? 0 }));
  }, [activeKeys, pct, thaiRegularPct, qStar]);

  const openSaveDialog = () => {
    const n = plans.filter((p) => p.programName === programName).length + 1;

    setPlanName(`แผน ${n} — ${programName}`);
    setSaveOpen(true);
  };

  const commitSave = () => {
    if (!planName.trim()) return;

    state.savePlan(planName);
    setSaveOpen(false);
  };

  const exportCsv = () => {
    downloadCsv(`แผนการรับนิสิต-${programName}`, [
      ['หลักสูตร', programName],
      ['จุดคุ้มทุนรวม (คน)', qStar ?? ''],
      ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
      [],
      ['กลุ่มนิสิต', 'สัดส่วน (%)', 'จำนวนที่ต้องรับ (คน)'],
      ...rows.map((r) => [r.label, r.pct, r.head]),
      ['รวม', 100, qStar ?? 0],
    ]);
    state.setToast('ส่งออก CSV แล้ว');
  };

  if (!qStar || qStar <= 0) return null;

  return (
    <Card>
      <CardHeader
        title={<DotTitle color="primary.main">แยกจุดคุ้มทุนตามแผนการรับนิสิต</DotTitle>}
        subheader={`${programName} — จุดคุ้มทุนรวม ${qStar.toLocaleString('th-TH')} คน แตกยอดเป็นกลุ่มนิสิตด้านล่าง`}
        action={
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" color="secondary" onClick={exportCsv}>
              ส่งออก CSV
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              disabled={pristine}
              onClick={() => setConfirm('clear')}
            >
              ล้างค่า
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={pristine || overAllocated}
              onClick={openSaveDialog}
            >
              บันทึกแผน
            </Button>
          </Box>
        }
      />
      <CardContent>
        {loadingPlans ? (
          <Skeleton variant="rounded" height={40} sx={{ mb: 3, maxWidth: 560 }} />
        ) : (
          plans.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
              <Autocomplete
                sx={{ flex: 1, maxWidth: 560 }}
                size="small"
                options={plans}
                getOptionLabel={planLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={selectedPlan}
                onChange={(_, v) => state.applyPlan(v)}
                renderInput={(params) => <TextField {...params} label="📋 แผนที่บันทึกไว้" />}
              />
              <Tooltip title={selectedPlan ? 'ลบแผนนี้' : 'เลือกแผนก่อนจึงจะลบได้'}>
                <span>
                  <IconButton
                    color="error"
                    disabled={!selectedPlan}
                    onClick={() => setConfirm('delete')}
                  >
                    <i className="ri-delete-bin-line" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )
        )}

        <Typography component="div" variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          เปิดกลุ่มที่ต้องการแยก แล้วกำหนดสัดส่วน (%) —
          นิสิตไทยภาคปกติจะคำนวณเป็นส่วนที่เหลือให้อัตโนมัติ
          {!pristine && (
            <Chip
              size="small"
              variant="tonal"
              color="success"
              label="เซฟร่างอัตโนมัติแล้ว"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>

        {CATEGORY_KEYS.map((key) => (
          <Box
            key={key}
            sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, flexWrap: 'wrap' }}
          >
            <FormControlLabel
              sx={{ minWidth: 260 }}
              control={
                <Switch
                  checked={enabled[key]}
                  onChange={(e) => state.toggleCategory(key, e.target.checked)}
                />
              }
              label={SEGMENT_LABELS[key]}
            />
            <TextField
              size="small"
              type="number"
              disabled={!enabled[key]}
              value={pct[key] || ''}
              onChange={(e) => state.setCategoryPct(key, Number(e.target.value))}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              }}
              sx={{ width: 120 }}
            />
          </Box>
        ))}

        {overAllocated && (
          <Alert severity="error" sx={{ mb: 2 }}>
            สัดส่วนรวมของกลุ่มที่เปิดไว้เกิน 100% ({otherTotal.toLocaleString('th-TH')}%) —
            ลดสัดส่วนลงก่อน
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
          ตารางนี้ถือว่าทุกกลุ่มมีอัตราค่าธรรมเนียมเท่ากัน — ถ้ามีอัตรารายกลุ่มจริงแล้ว ให้ใช้การ์ด
          &quot;คำนวณจุดคุ้มทุนแยกรายกลุ่ม&quot; ด้านล่างแทน ซึ่งคำนวณ Q* จาก CM
          ถัวเฉลี่ยถ่วงน้ำหนัก แผนที่บันทึกไว้เก็บอยู่ในเครื่องนี้เท่านั้น
          (ยังไม่ได้เก็บบนเซิร์ฟเวอร์)
        </Alert>
      </CardContent>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>บันทึกแผนการรับนิสิต</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            sx={{ mt: 2 }}
            label="ชื่อแผน"
            placeholder="เช่น แผน A — เน้นนิสิตต่างชาติ"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSave()}
            error={!planName.trim()}
            helperText={planName.trim() ? ' ' : 'ตั้งชื่อแผนก่อนบันทึก'}
          />
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setSaveOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="contained" disabled={!planName.trim()} onClick={commitSave}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirm === 'delete' ? 'ลบแผนนี้?' : 'ล้างค่าที่กรอกไว้?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'delete'
              ? `แผน "${selectedPlan?.name ?? ''}" จะถูกลบถาวร ย้อนกลับไม่ได้`
              : 'สัดส่วนและอัตรารายกลุ่มที่กรอกไว้จะถูกล้าง (แผนที่บันทึกไว้แล้วยังอยู่ครบ)'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirm === 'delete' && selectedPlan) state.deletePlan(selectedPlan);
              else if (confirm === 'clear') state.clearAll();

              setConfirm(null);
            }}
          >
            {confirm === 'delete' ? 'ลบ' : 'ล้างค่า'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AdmissionBreakdown;
