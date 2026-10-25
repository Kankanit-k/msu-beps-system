'use client';

// ขั้นที่ 2 — ตารางคำนวณจุดคุ้มทุน: แก้ต้นทุน/รายได้ของคอลัมน์กำหนดเอง แยกกรณีรวม/ไม่รวมเงินแผ่นดิน

import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
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
  /** basicOnly + แก้ต้นทุนผันแปรรายหมวดได้ */
  editVariable?: boolean;
  /** ยืนยันแล้ว — แสดงอย่างเดียว */
  readOnly?: boolean;
  /** แสดงค่าธรรมเนียมต่อภาค/ตลอดหลักสูตร */
  semesters?: number;
  years?: number;
  /** ปุ่มเพิ่มเติมข้างปุ่มรีเซ็ต */
  extraAction?: ReactNode;
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
  editVariable,
  readOnly,
  semesters,
  years,
  extraAction,
  onChange,
  onReset,
  resetLabel,
}: Props) => (
  <Card>
    <CardHeader
      title={<DotTitle color="primary.main">{title}</DotTitle>}
      subheader={subheader}
      action={
        (onReset || extraAction) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mr: 2 }}>
            {extraAction}
            {onReset && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={onReset}
                startIcon={<i className="ri-refresh-line" />}
              >
                {resetLabel}
              </Button>
            )}
          </Box>
        )
      }
      // จอแคบ: ปุ่มขึ้นบรรทัดใหม่ใต้หัวการ์ด ไม่ล้นขอบจอ
      sx={{ pb: 1, flexWrap: 'wrap', rowGap: 2, '& .MuiCardHeader-action': { alignSelf: 'center' } }}
    />
    <CardContent sx={{ pt: 0 }}>
      <CostBlockTable
        groups={groups}
        showAllocAdj={showAllocAdj}
        basicOnly={basicOnly}
        editVariable={editVariable}
        readOnly={readOnly}
        semesters={semesters}
        years={years}
        onChange={onChange}
      />
    </CardContent>
  </Card>
);

export default CostStep;
