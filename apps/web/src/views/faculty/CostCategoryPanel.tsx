'use client';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Data / calc Imports
import { LegendItem } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import type { ProgRow } from '@/data/mockup';
import { FIXED_CATS, VARIABLE_CATS } from '@/data/mockup/programCostCats';
import { fmtInt } from '@views/breakeven/calc';
import { blockFromProgram } from '@views/scenario-program/newProgramCalc';

import { C } from './FacultyCharts';

type Line = { label: string; v: number };

const sum = (xs: Line[]) => xs.reduce((a, x) => a + x.v, 0);

/** "410:ค่าสาธารณูปโภค" → "ค่าสาธารณูปโภค (410)" */
const catLabel = (c: string) => {
  const [code, name] = c.split(':');

  return `${name} (${code})`;
};

/** ผลต่างเกิน 1 บาทถึงจะแจ้ง (ปัดเศษในชีต) */
const DIFF_MIN = 1;

const Group = ({
  title,
  color,
  lines,
  total,
  pageTotal,
}: {
  title: string;
  color: string;
  lines: Line[];
  total: number;
  pageTotal: number;
}) => {
  const diff = total - pageTotal;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <LegendItem color={color} label={title} />
        <Typography variant="body2" fontWeight={700} className="num">
          {fmtInt(total)} บาท
        </Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {lines
            .filter((l) => l.v !== 0)
            .map((l) => (
              <TableRow key={l.label}>
                <TableCell sx={{ pl: 4 }}>{l.label}</TableCell>
                <TableCell align="right" className="num">
                  {fmtInt(l.v)}
                </TableCell>
                <TableCell
                  align="right"
                  className="num"
                  sx={{ color: 'text.secondary', inlineSize: 64 }}
                >
                  {total ? `${((l.v / total) * 100).toFixed(0)}%` : '—'}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {Math.abs(diff) > DIFF_MIN && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          ผลต่างจากยอดในหน้านี้ {diff > 0 ? '+' : '−'}
          {fmtInt(Math.abs(diff))} บาท (ยอดในหน้านี้ {fmtInt(pageTotal)})
          <InfoTip text="หมวดรายจ่ายมาจากแท็บ 4 ของชีต ส่วนยอดบนหน้าคณะมาจากแท็บ 3 ซึ่งปันต้นทุนส่วนกลางต่างกันเล็กน้อย — แสดงตามชีตโดยไม่ปรับตัวเลข" />
        </Typography>
      )}
    </Box>
  );
};

/**
 * ต้นทุนรายหมวดรายจ่ายของหลักสูตร (แท็บ 4 ของชีต) — ให้ผู้บริหารเห็นว่าต้นทุนคงที่มาจากหมวดไหน
 * ยอดแท็บ 4 รวมส่วนกลางคณะที่ปันมาไว้ในแต่ละหมวดแล้ว จึงไม่แยกบรรทัดส่วนกลาง
 */
const CostCategoryPanel = ({ p }: { p: ProgRow }) => {
  const b = blockFromProgram(p);

  const fixed: Line[] = [
    ...FIXED_CATS.map((c, i) => ({ label: catLabel(c), v: b.fix[i] ?? 0 })),
    { label: 'ค่าเสื่อมราคา (ปีงบก่อนหน้า)', v: b.dep },
  ];

  const variable: Line[] = [
    ...VARIABLE_CATS.map((c, i) => ({ label: catLabel(c), v: b.var[i] ?? 0 })),
    { label: 'วิชาศึกษาทั่วไป (GE)', v: b.genEd },
    { label: 'เงินสมทบค่าธรรมเนียมรายการหลัก', v: b.mainFee },
    { label: 'เงินสมทบมหาวิทยาลัย', v: b.uniShare },
  ];

  const empty = sum(fixed) === 0 && sum(variable) === 0;

  if (empty) return <Alert severity="info">ยังไม่มีข้อมูลต้นทุนรายหมวดของหลักสูตรนี้ในชีต</Alert>;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        บาท · ต้นทุนคงที่แต่ละหมวดรวมส่วนกลางของคณะที่ปันมาแล้ว · ที่มา: ชีตจุดคุ้มทุนหลักสูตร แท็บ
        4
      </Typography>
      <Group
        title="ต้นทุนคงที่"
        color={C.fixed}
        lines={fixed}
        total={sum(fixed)}
        pageTotal={p.TFC}
      />
      <Group
        title="ต้นทุนผันแปร"
        color={C.variable}
        lines={variable}
        total={sum(variable)}
        pageTotal={p.TVC}
      />
    </Box>
  );
};

export default CostCategoryPanel;
