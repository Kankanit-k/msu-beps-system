'use client';

// แถบขั้นตอน (ด้านบน) + แถบนำทางติดขอบล่างพร้อมจุดคุ้มทุนสด — ขั้นที่ 1–2 ต้องครบตามลำดับ ครบแล้วกดข้ามขั้นได้อิสระ

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

import StepperCustomDot from '@components/stepper-dot';

import type { CostGroup } from '../CostBlockTable';

export const STEPS = [
  'ข้อมูลหลักสูตร',
  'ปันส่วนต้นทุนคงที่',
  'ต้นทุนและรายได้',
  'สัดส่วนนิสิต',
  'สรุปและบันทึก',
];

const fmtN = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

interface StepperProps {
  active: number;
  /** ขั้นสุดท้ายที่ไปได้ — ขั้นหลังจากนี้ล็อกจนกว่าขั้นก่อนหน้าจะครบ */
  maxStep: number;
  onGo: (i: number) => void;
}

export const WizardStepper = ({ active, maxStep, onGo }: StepperProps) => (
  <Card>
    <CardContent sx={{ overflowX: 'auto' }}>
      <Stepper activeStep={active} alternativeLabel nonLinear sx={{ minWidth: 520 }}>
        {STEPS.map((label, i) => {
          const disabled = i > maxStep;

          return (
            <Step key={label} completed={i < active} disabled={disabled}>
              <StepButton onClick={() => !disabled && onGo(i)}>
                <StepLabel StepIconComponent={StepperCustomDot}>{label}</StepLabel>
              </StepButton>
            </Step>
          );
        })}
      </Stepper>
    </CardContent>
  </Card>
);

/** จุดคุ้มทุนของคอลัมน์ที่ใช้คำนวณ แยกกรณีรวม/ไม่รวมเงินแผ่นดิน */
const LiveResult = ({ groups, basis }: { groups: CostGroup[]; basis: string }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 3 } }}>
    {groups.map((g) => {
      const c = g.cols.find((x) => x.key === basis) ?? g.cols[g.cols.length - 1]!;
      const { qStar } = c.result;
      const ok = qStar !== null && qStar >= 0 && c.block.q >= qStar;

      return (
        <Typography key={g.key} variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ color: `${g.color}.main`, fontWeight: 700 }}>
            {g.title}
          </Box>{' '}
          Q* <b>{qStar === null ? '—' : fmtN(qStar)}</b> · จริง {fmtN(c.block.q)}{' '}
          <Box component="span" sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}>
            {qStar === null ? '' : ok ? '✓' : `⚠ ขาด ${fmtN(qStar - c.block.q)}`}
          </Box>
        </Typography>
      );
    })}
  </Box>
);

interface NavProps {
  active: number;
  /** เหตุผลที่ยังไปขั้นถัดไปไม่ได้ — null = ไปต่อได้ */
  lockReason: string | null;
  groups: CostGroup[];
  basis: string;
  onGo: (i: number) => void;
  /** ขั้นสุดท้าย — ล้างฟอร์มเริ่มคำนวณหลักสูตรใหม่ */
  onRestart: () => void;
}

export const WizardNav = ({
  active,
  lockReason,
  groups,
  basis,
  onGo,
  onRestart,
}: NavProps) => {
  const last = active === STEPS.length - 1;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        borderRadius: 1,
      }}
    >
      <Button
        variant="outlined"
        color="secondary"
        disabled={active === 0}
        onClick={() => onGo(active - 1)}
      >
        ย้อนกลับ
      </Button>
      {/* จอแคบ: ข้อความ/ผลสดขึ้นบรรทัดบนเต็มความกว้าง ปุ่มอยู่บรรทัดล่าง */}
      <Box
        sx={{
          flex: { sm: 1 },
          flexBasis: { xs: '100%', sm: 0 },
          order: { xs: -1, sm: 0 },
          minWidth: 0,
        }}
      >
        {lockReason ? (
          <Typography variant="body2" color="text.secondary">
            {lockReason}
          </Typography>
        ) : (
          <LiveResult groups={groups} basis={basis} />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ ml: { xs: 'auto', sm: 0 } }}>
        ขั้นตอนที่ {active + 1} / {STEPS.length}
      </Typography>
      {last ? (
        <Button variant="contained" onClick={onRestart} startIcon={<i className="ri-add-line" />}>
          เริ่มคำนวณใหม่
        </Button>
      ) : (
        <Button variant="contained" disabled={!!lockReason} onClick={() => onGo(active + 1)}>
          ถัดไป →
        </Button>
      )}
    </Box>
  );
};
