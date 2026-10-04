'use client';

// ประวัติการคำนวณ — ทุกรายการออกรายงาน PDF ได้

// MUI Imports
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { DotTitle } from '@components/ChartBits';

import type { ProgramHistoryEntry } from '../types';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');

interface Props {
  history: ProgramHistoryEntry[];
  onPrint: (id: number) => void;
  onClear: () => void;
}

const HistoryTable = ({ history, onPrint, onClear }: Props) => (
  <Card>
    <CardHeader
      title={<DotTitle color="warning.main">ประวัติการคำนวณ</DotTitle>}
      action={
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={onClear}
          sx={{ mr: 2, borderRadius: 5 }}
        >
          ล้าง
        </Button>
      }
    />
    <CardContent sx={{ p: 0 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>เวลา</TableCell>
              <TableCell>หลักสูตร</TableCell>
              <TableCell>ระดับ</TableCell>
              <TableCell>ประเภท</TableCell>
              <TableCell align="right">นิสิต (Q)</TableCell>
              <TableCell align="right">ผันแปร/หัว (AVC)</TableCell>
              <TableCell align="right">จุดคุ้มทุน (Q*) รวมแผ่นดิน</TableCell>
              <TableCell align="right">จุดคุ้มทุน (Q*) ไม่รวมแผ่นดิน</TableCell>
              <TableCell align="right">สถานะ</TableCell>
              <TableCell align="right">รายงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((h) => {
              const okA = h.withGov.qStar !== null && h.q >= h.withGov.qStar;
              const okB = h.withoutGov.qStar !== null && h.q >= h.withoutGov.qStar;

              return (
                <TableRow key={h.id} hover>
                  <TableCell sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                    {h.time}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={h.name}
                  >
                    {h.name}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{h.level || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={h.isNew ? 'ใหม่' : 'ปรับปรุง'}
                      color={h.isNew ? 'primary' : 'warning'}
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell align="right">{fmtN(h.q)}</TableCell>
                  <TableCell align="right" sx={{ color: 'warning.main' }}>
                    {fmtN(h.avc)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: okA ? 'success.main' : 'error.main' }}>
                    {h.withGov.qStar ? fmtN(h.withGov.qStar) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ color: okB ? 'success.main' : 'error.main' }}>
                    {h.withoutGov.qStar ? fmtN(h.withoutGov.qStar) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={okA ? '✓' : '⚠'} color={okA ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => onPrint(h.id)}
                      title={
                        h.detail
                          ? 'ออกรายงาน PDF ครบทุกขั้นตอนของผลคำนวณนี้'
                          : 'บันทึกก่อนมีรายงานฉบับเต็ม — ออกได้เฉพาะแบบสรุป'
                      }
                    >
                      🖨 PDF
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export default HistoryTable;
