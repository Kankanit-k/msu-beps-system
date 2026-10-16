'use client';

// ขั้นที่ 4 — สรุปจุดคุ้มทุน กราฟ บันทึกผล ออกรายงาน PDF และประวัติ

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';

import BreakEvenChart, { type ChartCase } from '../BreakEvenChart';
import BreakEvenCompare from '../BreakEvenCompare';
import type { CostGroup } from '../CostBlockTable';
import type { ProgramHistoryEntry } from '../types';
import HistoryTable from './HistoryTable';
import LatestResultCard from './LatestResultCard';

interface Props {
  groups: CostGroup[];
  compareSubheader: string;
  chartSubheader: string;
  /** กรณีที่มีจำนวนนิสิตแล้ว — ว่าง = ยังวาดกราฟไม่ได้ */
  chart: ChartCase[];
  saveBlocker: string | null;
  onSave: () => void;
  history: ProgramHistoryEntry[];
  /** ว่าง = บทบาทนี้ออกรายงานไม่ได้ (ดู canExportReport) — ซ่อนปุ่ม */
  onPrint?: (id: number) => void;
  onClearHistory: () => void;
  onOpenHistory: (h: ProgramHistoryEntry) => void;
  onDeleteHistory: (h: ProgramHistoryEntry) => void;
  /** กำลังแก้ไขผลที่บันทึกไว้ — บันทึกแล้วทับรายการเดิม */
  editingId: number | null;
}

const SummaryStep = (props: Props) => {
  const { history } = props;
  const latest = history[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">ต้องรับนิสิตเท่าไหร่ถึงจะคุ้มทุน</DotTitle>}
          subheader={props.compareSubheader}
        />
        <CardContent>
          <BreakEvenCompare groups={props.groups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">กราฟจุดคุ้มทุน</DotTitle>}
          subheader={props.chartSubheader}
        />
        <CardContent>
          {props.chart.length > 0 ? (
            <BreakEvenChart cases={props.chart} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              กราฟจะแสดงเมื่อมีจำนวนนิสิตและต้นทุน
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* บันทึกเป็นขั้นสุดท้าย — เก็บทั้งตารางคำนวณและสัดส่วนนิสิต */}
      <Card>
        <CardContent
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            color={props.saveBlocker ? 'error.main' : 'text.secondary'}
            sx={{ mr: 'auto' }}
          >
            {props.saveBlocker ?? 'ตรวจตารางคำนวณและสัดส่วนนิสิตแล้ว กดบันทึกเพื่อเก็บผล'}
          </Typography>
          {props.onPrint ? (
            <Button
              variant="outlined"
              disabled={!latest}
              onClick={() => latest && props.onPrint?.(latest.id)}
              title={
                latest
                  ? 'เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ — เลือก "บันทึกเป็น PDF" ได้'
                  : 'บันทึกผลก่อนเพื่อเปิดใช้งาน'
              }
            >
              🖨 ออกรายงาน PDF
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              ผลจำลองเท่านั้น — ออกรายงานได้เฉพาะกองแผนและอาจารย์ประจำหลักสูตร
            </Typography>
          )}
          <Button variant="contained" disabled={!!props.saveBlocker} onClick={props.onSave}>
            {props.editingId ? 'บันทึกการแก้ไข' : 'บันทึกผลคำนวณ'}
          </Button>
        </CardContent>
      </Card>

      {latest ? (
        <>
          <LatestResultCard latest={latest} />
          <HistoryTable
            history={history}
            onPrint={props.onPrint}
            onClear={props.onClearHistory}
            onOpen={props.onOpenHistory}
            onDelete={props.onDeleteHistory}
            editingId={props.editingId}
          />
        </>
      ) : (
        <Alert severity="info" variant="outlined">
          กด &quot;บันทึกผลคำนวณ&quot; เพื่อเก็บผลไว้ในประวัติ
          {props.onPrint ? ' เปิดใช้งานปุ่มออกรายงาน PDF' : ''} และใช้จุดคุ้มทุนในหน้าแผนการรับนิสิต
        </Alert>
      )}
    </Box>
  );
};

export default SummaryStep;
