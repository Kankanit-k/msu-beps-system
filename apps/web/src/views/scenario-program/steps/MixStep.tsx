'use client';

// ขั้นที่ 3 — การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน (แท็บ 4 คอลัมน์ X:AD)

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';

import StudentMixTable, { type ModeCosts } from '../StudentMixTable';
import type { Segment } from '../newProgramCalc';

export type CostBasis = 'ref' | 'manual';

interface Props {
  segs: Segment[];
  onSegsChange: (s: Segment[]) => void;
  costs: ModeCosts;
  /** บอกว่าจำนวนนิสิตตั้งต้นมาจากไหน */
  note?: string;
}

const MixStep = (props: Props) => (
  <Card>
    <CardHeader
      title={
        <DotTitle color="warning.main">การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน</DotTitle>
      }
      subheader={
        props.note && (
          <Typography component="span" variant="body2" color="primary.main">
            {props.note}
          </Typography>
        )
      }
    />
    <CardContent>
      <StudentMixTable segs={props.segs} onChange={props.onSegsChange} costs={props.costs} />
    </CardContent>
  </Card>
);

export default MixStep;
