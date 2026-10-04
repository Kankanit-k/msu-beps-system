'use client';

// ขั้นที่ 3 — ตารางคำนวณจุดคุ้มทุน: แก้ต้นทุน/รายได้ของคอลัมน์กำหนดเอง แยกกรณีรวม/ไม่รวมเงินแผ่นดิน

// MUI Imports
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';

import CostBlockTable, { type CostGroup } from '../CostBlockTable';
import type { CostBlock } from '../newProgramCalc';

interface Props {
  groups: CostGroup[];
  subheader: string;
  showAllocAdj: boolean;
  onChange: (m: RevenueMode, b: CostBlock) => void;
  /** รีเซ็ตคอลัมน์กำหนดเองกลับเป็นค่าอ้างอิง (undefined = ไม่มีหลักสูตรอ้างอิง) */
  onReset?: () => void;
  resetLabel: string;
}

const CostStep = ({ groups, subheader, showAllocAdj, onChange, onReset, resetLabel }: Props) => (
  <Card>
    <CardHeader
      title={<DotTitle color="primary.main">ตารางคำนวณจุดคุ้มทุน</DotTitle>}
      subheader={subheader}
      action={
        onReset && (
          <Button size="small" color="secondary" onClick={onReset} sx={{ mr: 2 }}>
            {resetLabel}
          </Button>
        )
      }
    />
    <CardContent sx={{ px: 0 }}>
      <CostBlockTable groups={groups} showAllocAdj={showAllocAdj} onChange={onChange} />
    </CardContent>
  </Card>
);

export default CostStep;
