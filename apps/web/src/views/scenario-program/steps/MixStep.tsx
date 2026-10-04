'use client';

// ขั้นที่ 4 — การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน (แท็บ 4 คอลัมน์ X:AD)

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';

import StudentMixTable, { type ModeCosts } from '../StudentMixTable';
import type { Segment } from '../newProgramCalc';

export type CostBasis = 'ref' | 'manual';

interface Props {
  segs: Segment[];
  onSegsChange: (s: Segment[]) => void;
  costs: ModeCosts;
  /** แสดงตัวเลือกฐานต้นทุนเมื่อมีทั้งคอลัมน์อ้างอิงและกำหนดเอง */
  showBasis: boolean;
  basis: CostBasis;
  onBasisChange: (b: CostBasis) => void;
  refCol: string;
  customCol: string;
}

const MixStep = (props: Props) => (
  <Card>
    <CardHeader
      title={
        <DotTitle color="warning.main">การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน</DotTitle>
      }
      subheader="แสดงกรณีรวมและไม่รวมเงินแผ่นดินคู่กัน · ปันต้นทุนคงที่ตามสัดส่วนนิสิต · ต้นทุนผันแปร = AVC × จำนวนนิสิต · รายรับต่อปี = (ค่าธรรมเนียม + เงินแผ่นดิน) × นิสิต × เทอม"
    />
    <CardContent>
      {props.showBasis && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            ใช้ต้นทุนจาก
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={props.basis}
            onChange={(_, v: CostBasis | null) => v && props.onBasisChange(v)}
          >
            <ToggleButton value="ref">{props.refCol}</ToggleButton>
            <ToggleButton value="manual">{props.customCol}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      <StudentMixTable segs={props.segs} onChange={props.onSegsChange} costs={props.costs} />
    </CardContent>
  </Card>
);

export default MixStep;
