// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { RevenueMode } from '@beps/calc-engine';

import { BarTitle, BEPS } from '@components/ChartBits';
import { fmtMillion } from '@views/breakeven/calc';

import type { RankRow } from './FacultyRankDialog';

const GAIN = BEPS.breakEven;
const LOSS = BEPS.cost.dark;

const profitOf = (f: RankRow, mode: RevenueMode) =>
  mode === 'with_government' ? f.profitWith : f.profitWithout;

const fmtSigned = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMillion(Math.abs(v))}`;

/** การ์ดอันดับ 5 รายการ (ส่วนต่างสูงสุด / เฝ้าระวัง) — ใช้ทั้งภาพรวมมหาวิทยาลัย (รายคณะ) และภาพรวมคณะ (รายหลักสูตร) */
const RankCard = ({
  title,
  color,
  chip,
  rows,
  mode,
  emptyText,
  onViewAll,
  viewAllLabel,
  unitWord = 'คณะ',
}: {
  title: string;
  color: string;
  chip: string;
  rows: RankRow[];
  /** หัวคอลัมน์ชื่อ เช่น "คณะ" / "หลักสูตร" */
  unitWord?: string;
  mode: RevenueMode;
  emptyText: string;
  onViewAll: () => void;
  viewAllLabel: string;
}) => {
  const other: RevenueMode = mode === 'with_government' ? 'without_government' : 'with_government';

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        sx={{ pb: 1 }}
        title={<BarTitle>{title}</BarTitle>}
        action={
          <Chip
            size="small"
            label={chip}
            sx={{ color, bgcolor: `color-mix(in srgb, ${color} 16%, transparent)` }}
          />
        }
      />
      <CardContent sx={{ pt: 0, pb: '12px !important' }}>
        <Table
          size="small"
          sx={{
            '& th': { fontSize: '0.75rem', whiteSpace: 'nowrap', py: 1 },
            '& td': { fontSize: '0.8125rem', py: 1 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>{unitWord}</TableCell>
              <TableCell align="right">
                {mode === 'with_government' ? 'รวม ง.แผ่นดิน' : 'ไม่รวม ง.แผ่นดิน'} (ลบ.)
              </TableCell>
              <TableCell align="right">
                {other === 'with_government' ? 'รวม' : 'ไม่รวม'} (ลบ.)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {rows.map((f, i) => (
              <TableRow key={f.key}>
                <TableCell>{i + 1}</TableCell>
                <TableCell
                  title={f.name}
                  sx={{
                    maxWidth: 170,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </TableCell>
                <TableCell align="right" className="num" sx={{ fontWeight: 700, color }}>
                  {fmtSigned(profitOf(f, mode))}
                </TableCell>
                <TableCell
                  align="right"
                  className="num"
                  sx={{ color: profitOf(f, other) >= 0 ? GAIN : LOSS }}
                >
                  {fmtSigned(profitOf(f, other))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
            {/* ปุ่มทึบสีการ์ด ไอคอนนำหน้า แบบปุ่ม Dashboard-KPI */}
            <Button
              size="small"
              variant="contained"
              onClick={onViewAll}
              startIcon={<i className="ri-table-line" />}
              fullWidth
              sx={{
                height: 45,
                borderRadius: '6px',
                bgcolor: color,
                color: '#fff',
                fontWeight: 600,
                // เงาสีเดียวกับปุ่ม ~25%
                boxShadow: `0 4px 12px color-mix(in srgb, ${color} 25%, transparent)`,
                '&:hover': {
                  bgcolor: `color-mix(in srgb, ${color} 85%, black)`,
                  boxShadow: `0 6px 16px color-mix(in srgb, ${color} 25%, transparent)`,
                },
              }}
            >
              {viewAllLabel}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RankCard;
