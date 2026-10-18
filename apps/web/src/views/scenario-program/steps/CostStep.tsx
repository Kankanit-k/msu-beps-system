'use client';

// ขั้นที่ 2 — ตารางคำนวณจุดคุ้มทุน: แก้ต้นทุน/รายได้ของคอลัมน์กำหนดเอง แยกกรณีรวม/ไม่รวมเงินแผ่นดิน

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
  /** หัวการ์ด — ค่าตั้งต้น "ตารางคำนวณจุดคุ้มทุน" */
  title?: string;
  groups: CostGroup[];
  subheader: string;
  showAllocAdj: boolean;
  /** จำกัดให้แก้ได้เฉพาะจำนวนนิสิตและค่าธรรมเนียมการศึกษา */
  basicOnly?: boolean;
  onChange: (m: RevenueMode, b: CostBlock) => void;
  /** รีเซ็ตคอลัมน์กำหนดเองกลับเป็นค่าอ้างอิง (undefined = ไม่มีหลักสูตรอ้างอิง) */
  onReset?: () => void;
  resetLabel: string;
}

const CostStep = ({
  title = 'ตารางคำนวณจุดคุ้มทุน',
  groups,
  subheader,
  showAllocAdj,
  basicOnly,
  onChange,
  onReset,
  resetLabel,
}: Props) => (
  <Card>
    <CardHeader
      title={<DotTitle color="primary.main">{title}</DotTitle>}
      subheader={subheader}
      action={
        onReset && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onReset}
            startIcon={<i className="ri-refresh-line" />}
            sx={{ mr: 2 }}
          >
            {resetLabel}
          </Button>
        )
      }
      sx={{ pb: 1 }}
    />
    <CardContent sx={{ pt: 0 }}>
      <CostBlockTable
        groups={groups}
        showAllocAdj={showAllocAdj}
        basicOnly={basicOnly}
        onChange={onChange}
      />
    </CardContent>
  </Card>
);

export default CostStep;
