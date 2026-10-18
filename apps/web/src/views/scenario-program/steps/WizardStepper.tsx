'use client';

// แถบขั้นตอน (ด้านบน) + แถบนำทางติดขอบล่างพร้อมจุดคุ้มทุนสด — ขั้นที่ 1 ต้องครบก่อน ครบแล้วกดข้ามขั้นได้อิสระ

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

import type { CostGroup } from '../CostBlockTable';

export const STEP_LABEL = {
  program: 'ข้อมูลหลักสูตร',
  mix: 'สัดส่วนนิสิต',
  summary: 'สรุปและบันทึก',
};

export type StepKey = keyof typeof STEP_LABEL;

const fmtN = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

interface StepperProps {
  steps: string[];
  /** คำอธิบายสั้นใต้ชื่อขั้น — บอกผู้ใช้ใหม่ว่าขั้นนี้ทำอะไร */
  hints?: string[];
  active: number;
  /** ขั้นสุดท้ายที่ไปได้ — ขั้นหลังจากนี้ล็อกจนกว่าขั้นก่อนหน้าจะครบ */
  maxStep: number;
  onGo: (i: number) => void;
}

export const WizardStepper = ({ steps, hints, active, maxStep, onGo }: StepperProps) => (
  <Card>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Stepper activeStep={active} nonLinear>
        {steps.map((label, i) => {
          const disabled = i > maxStep;

          return (
            <Step key={label} completed={i < active} disabled={disabled}>
              {/* StepButton ส่ง optional ทับของ StepLabel — ต้องใส่ที่นี่ */}
              <StepButton
                onClick={() => !disabled && onGo(i)}
                optional={
                  hints?.[i] && (
                    <Typography variant="caption" color="text.secondary">
                      {hints[i]}
                    </Typography>
                  )
                }
              >
                {/* ไอคอนตัวเลขของ MUI — ผู้ใช้เห็นลำดับ 1 2 3 · จอแคบโชว์ชื่อเฉพาะขั้นปัจจุบัน */}
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-labelContainer': {
                      display: { xs: i === active ? 'block' : 'none', sm: 'block' },
                    },
                  }}
                >
                  <Box component="span" sx={{ fontWeight: i === active ? 700 : 500 }}>
                    ขั้นที่ {i + 1} · {label}
                  </Box>
                </StepLabel>
              </StepButton>
            </Step>
          );
        })}
      </Stepper>
    </CardContent>
  </Card>
);

export interface GuideItem {
  text: string;
  /** ทำแล้ว — ขึ้นเครื่องหมายถูก · undefined = ข้อแนะนำ ไม่มีสถานะ */
  done?: boolean;
}

interface GuideProps {
  active: number;
  total: number;
  title: string;
  items: GuideItem[];
}

/** กล่องบอกว่า "ขั้นนี้ต้องทำอะไร" เรียงเป็นข้อ — อ่านจากบนลงล่างตามลำดับการ์ดในหน้า */
export const StepGuide = ({ active, total, title, items }: GuideProps) => (
  <Box
    sx={{
      display: 'flex',
      gap: 3,
      alignItems: 'flex-start',
      p: 3,
      borderRadius: 1,
      border: 1,
      borderColor: 'primary.light',
      bgcolor: 'var(--mui-palette-primary-lighterOpacity)',
    }}
  >
    <Box
      sx={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 20,
      }}
    >
      {active + 1}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle1" fontWeight={700} color="primary.main">
        ขั้นที่ {active + 1} จาก {total}: {title}
      </Typography>
      <Box component="ol" sx={{ m: 0, mt: 1, pl: 0, listStyle: 'none' }}>
        {items.map((it, i) => (
          <Typography
            key={it.text}
            component="li"
            variant="body2"
            sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', py: 0.25 }}
          >
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                fontWeight: 700,
                color: it.done ? 'success.main' : 'text.secondary',
                minWidth: 20,
              }}
            >
              {it.done ? '✓' : `${i + 1}.`}
            </Box>
            <Box component="span" sx={{ color: it.done ? 'text.secondary' : 'text.primary' }}>
              {it.text}
            </Box>
          </Typography>
        ))}
      </Box>
    </Box>
  </Box>
);

/** จุดคุ้มทุนของคอลัมน์ที่แก้ได้ (คอลัมน์สุดท้าย) แยกกรณีรวม/ไม่รวมเงินแผ่นดิน */
const LiveResult = ({ groups }: { groups: CostGroup[] }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 3 } }}>
    {groups.map((g) => {
      const c = g.cols[g.cols.length - 1]!;
      const { qStar } = c.result;
      const ok = qStar !== null && qStar >= 0 && c.block.q >= qStar;

      return (
        <Typography key={g.key} variant="body2" sx={{ whiteSpace: { sm: 'nowrap' } }}>
          <Box component="span" sx={{ color: `${g.color}.main`, fontWeight: 700 }}>
            {g.title}
          </Box>{' '}
          จุดคุ้มทุน <b>{qStar === null ? '—' : fmtN(qStar)}</b> คน · นิสิตจริง {fmtN(c.block.q)} คน{' '}
          <Box component="span" sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}>
            {qStar === null ? '' : ok ? '✓' : `⚠ ขาด ${fmtN(qStar - c.block.q)}`}
          </Box>
        </Typography>
      );
    })}
  </Box>
);

interface NavProps {
  steps: string[];
  active: number;
  /** เหตุผลที่ยังไปขั้นถัดไปไม่ได้ — null = ไปต่อได้ */
  lockReason: string | null;
  groups: CostGroup[];
  onGo: (i: number) => void;
  /** ขั้นสุดท้าย — ล้างฟอร์มเริ่มคำนวณหลักสูตรใหม่ */
  onRestart: () => void;
}

export const WizardNav = ({ steps, active, lockReason, groups, onGo, onRestart }: NavProps) => {
  const last = active === steps.length - 1;

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
        py: 1,
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
          <LiveResult groups={groups} />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ ml: { xs: 'auto', sm: 0 } }}>
        ขั้นตอนที่ {active + 1} / {steps.length}
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
