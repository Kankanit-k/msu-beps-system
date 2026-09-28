'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Type Imports
import type { FixedCostPool } from '@beps/shared-types';

// Component Imports
import NoteBar from '@components/NoteBar';

// Calc Imports
import { fmtMillion } from '@views/breakeven/calc';

import { buildCostComposition, MISSING_PARTS, poolOption } from './data';

type Props = {
  faculty: string;
  pool: FixedCostPool;
  year: string;
};

/**
 * ที่มาของต้นทุนคงที่ — ขั้นที่ 2 ของ FIXED-COST-WORKFLOW.md ในมุมของผู้ใช้
 *
 * หน้าจอเดิมบอกแค่ยอดก้อนเดียว ("ก้อนที่ปันส่วน X ลบ.") โดยไม่บอกว่ามาจากอะไร
 * การ์ดนี้กางให้เห็นว่า ต้นทุนคงที่รวม = ทางตรง + สำนักงาน + ค่าเสื่อม
 * แล้วชี้ว่าส่วนไหนถูกนโยบายฉบับนี้ปันส่วน ส่วนไหนผูกหลักสูตรอยู่แล้ว
 *
 * ท้ายการ์ดคือช่องที่ยังว่าง (เงินเดือนอาจารย์ · ค่าเสื่อมอาคาร) ซึ่งตั้งใจให้เห็นชัด
 * เพื่อใช้เป็นรายการขอข้อมูลจากกองคลัง ไม่ใช่ซ่อนไว้แล้วให้ตัวเลขดูครบทั้งที่ยังไม่ครบ
 */
const CostComposition = ({ faculty, pool, year }: Props) => {
  const comp = buildCostComposition(faculty, pool);
  const poolMeta = poolOption(pool);

  // คณะที่ไม่มีหลักสูตรเลยถูกกรองออกตั้งแต่ FACULTIES แล้ว แต่กัน 0/0 ไว้เผื่อชุดข้อมูลเปลี่ยน
  const erpDirectPct = comp.total > 0 ? (comp.erpDirect / comp.total) * 100 : 0;

  return (
    <Card>
      <CardHeader
        title="ที่มาของต้นทุนคงที่"
        subheader={`${faculty} · ปีงบประมาณ ${year} — ยอดนี้ประกอบจากอะไรบ้าง และส่วนไหนที่นโยบายฉบับนี้เป็นคนหาร`}
      />
      <CardContent>
        <NoteBar severity="info">
          <b>ต้นทุนคงที่รวมของคณะ = ทางตรงของหลักสูตร + งบสำนักงาน/ส่วนกลาง + ค่าเสื่อมราคา</b> —
          เลือกกลุ่มต้นทุนที่หัวหน้าจอแล้วแถวที่นโยบายฉบับนี้รับไปหารจะถูกเน้นไว้
          ยอดรวมไม่เปลี่ยนไม่ว่าจะเลือกกลุ่มไหนหรือวิธีหารแบบใด
        </NoteBar>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>องค์ประกอบ</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  ที่มาของตัวเลข
                </TableCell>
                <TableCell align="right">ยอด (ลบ.)</TableCell>
                <TableCell>การปันส่วน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comp.rows.map((row) => (
                <TableRow
                  key={row.key}
                  sx={row.pooled ? { bgcolor: 'primary.lighterOpacity' } : {}}
                >
                  <TableCell sx={{ fontWeight: row.pooled ? 600 : 400 }}>{row.label}</TableCell>
                  <TableCell
                    sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}
                  >
                    {row.source}
                  </TableCell>
                  <TableCell align="right">{fmtMillion(row.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="tonal"
                      color={row.pooled ? 'primary' : 'default'}
                      label={row.pooled ? 'นโยบายนี้เป็นคนหาร' : 'ผูกหลักสูตรแล้ว ไม่ต้องหาร'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ต้นทุนคงที่รวมของคณะ</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtMillion(comp.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2, mt: 4 }}>
          <Chip
            size="small"
            variant="tonal"
            color="primary"
            label={`ก้อนที่หารด้วยนโยบายนี้ ${fmtMillion(comp.pooled)} ลบ. · ${poolMeta.label}`}
          />
          <Chip
            size="small"
            variant="tonal"
            label={`ผูกหลักสูตรอยู่แล้ว ${fmtMillion(comp.direct)} ลบ.`}
          />
          <Chip size="small" variant="tonal" label={`รวม ${fmtMillion(comp.total)} ลบ.`} />
        </Stack>

        <Box sx={{ mt: 4 }}>
          <NoteBar severity={erpDirectPct < 20 ? 'warning' : 'info'}>
            <b>วิธีหารมีผลแค่ไหน</b> — ต้นทุนคงที่ของคณะนี้มีเพียง <b>{erpDirectPct.toFixed(1)}%</b>{' '}
            ({fmtMillion(comp.erpDirect)} ลบ.) ที่ ERP
            ผูกรหัสหลักสูตรมาให้โดยตรงและไม่ขยับไม่ว่าจะใช้วิธีไหน ส่วนที่เหลืออีก{' '}
            <b>{(100 - erpDirectPct).toFixed(1)}%</b> ต้องถูกหารลงหลักสูตร{' '}
            <b>วิธีหารที่เลือกจึงเป็นตัวกำหนดจุดคุ้มทุนของหลักสูตรเกือบทั้งหมด</b> —
            นี่คือเหตุผลที่มติที่ประชุมให้เพิ่มตัวเลือกวิธีหาร
          </NoteBar>
        </Box>

        <Box sx={{ mt: 5 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            ส่วนที่ยังขาด — ต้องขอข้อมูลจากกองคลัง
          </Typography>
          <NoteBar severity="warning">
            ตัวเลขข้างบนยัง<b>ไม่ใช่ต้นทุนคงที่ทั้งหมด</b>ตามที่มติที่ประชุมนิยามไว้
            (เงินเดือนอาจารย์ + ค่าเสื่อมราคา) — สองรายการนี้ยังแยกหรือยังไม่มีในระบบ
            จึงยังไม่ถูกนำเข้าการคำนวณจุดคุ้มทุน
          </NoteBar>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รายการ</TableCell>
                  <TableCell>สถานะตอนนี้</TableCell>
                  <TableCell>ข้อมูลที่ต้องขอ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MISSING_PARTS.map((m) => (
                  <TableRow key={m.label}>
                    <TableCell sx={{ fontWeight: 600 }}>{m.label}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{m.status}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{m.ask}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CostComposition;
