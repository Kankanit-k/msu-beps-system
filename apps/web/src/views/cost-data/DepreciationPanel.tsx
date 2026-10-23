'use client';

import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

// Component Imports
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import { fmtMillion } from '@views/breakeven/calc';

import {
  DEP_GROUP_LABEL,
  DEP_LEVEL_SPLIT,
  DEP_PDF_TOTALS,
  DEP_UNITS,
  depTotals,
  type DepGroup,
  type DepUnit,
} from './depreciationData';

type GroupFilter = DepGroup | 'all';

const fmtB = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (now: number, before: number | null | undefined) =>
  before ? ((now - before) / before) * 100 : null;

const fmtPct = (v: number | null) =>
  v === null
    ? '—'
    : `${v > 0 ? '+' : ''}${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

const ROWS = DEP_UNITS.map((u) => ({ u, t68: depTotals(u.y2568)!, t67: depTotals(u.y2567) }));

const T68 = DEP_PDF_TOTALS[2568];
const T67 = DEP_PDF_TOTALS[2567];
const BUILD68 = ROWS.reduce((a, r) => a + r.t68.building, 0);

/** ส่วนแบ่งค่าเสื่อม 2568 ตามประเภทและแหล่งเงิน เทียบ 2567 */
const DetailDialog = ({ unit, onClose }: { unit: DepUnit | null; onClose: () => void }) => {
  const t68 = unit ? depTotals(unit.y2568)! : null;
  const t67 = unit ? depTotals(unit.y2567) : null;
  const lines: { label: string; i: number }[] = [
    { label: 'งบแผ่นดิน · อาคารและสิ่งปลูกสร้าง', i: 0 },
    { label: 'งบแผ่นดิน · ครุภัณฑ์', i: 1 },
    { label: 'เงินรายได้ · อาคารและสิ่งปลูกสร้าง', i: 2 },
    { label: 'เงินรายได้ · ครุภัณฑ์', i: 3 },
  ];

  return (
    <Dialog open={!!unit} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{unit?.name}</DialogTitle>
      <DialogContent>
        {unit && t68 && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รายการ (บาท)</TableCell>
                  <TableCell align="right">2567</TableCell>
                  <TableCell align="right">2568</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.i}>
                    <TableCell>{l.label}</TableCell>
                    <TableCell align="right">{fmtB(unit.y2567?.[l.i])}</TableCell>
                    <TableCell align="right">{fmtB(unit.y2568[l.i])}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtB(t67?.total)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtB(t68.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {unit.y2567 === null && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                ปี 2567 ไม่ได้แยกแถวโรงพยาบาล — ยอดรวมอยู่ในคณะต้นสังกัด
              </Typography>
            )}
            {unit.group === 'faculty' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                ไฟล์แบ่งยอดปี 2568 เป็นปริญญาตรี 90% ≈ {fmtB(t68.total * DEP_LEVEL_SPLIT.bachelor)}{' '}
                บ. · บัณฑิตศึกษา 10% ≈ {fmtB(t68.total * DEP_LEVEL_SPLIT.graduate)} บ.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
};

const DepreciationPanel = () => {
  const [group, setGroup] = useState<GroupFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState<DepUnit | null>(null);

  const rows = useMemo(() => {
    const q = query.trim();

    return ROWS.filter((r) => (group === 'all' || r.u.group === group) && r.u.name.includes(q));
  }, [group, query]);

  const shown = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const sumOf = (k: 'total' | 'building' | 'equipment' | 'budget' | 'revenue') =>
    rows.reduce((a, r) => a + r.t68[k], 0);
  const sum67 = rows.reduce((a, r) => a + (r.t67?.total ?? 0), 0);

  // คอลัมน์รอง ซ่อนบนจอเล็ก — กดแถวเพื่อดูรายละเอียดครบในกล่อง
  const wide = { display: { xs: 'none', md: 'table-cell' } };

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <NoteBar severity="info">
          <b>ข้อมูลอ้างอิง ไม่เข้าสูตรคำนวณ</b> — ตัวเลขจุดคุ้มทุนทั้งระบบยังใช้ค่าเสื่อม
          <b>ปี 2567</b> ตาม Google Sheet (ยอดคณะตรงกับคอลัมน์ 2567 ในตารางนี้ทุกคณะ) · ที่มา: ไฟล์
          &ldquo;ค่าเสื่อมราคา 2567-2568&rdquo; กองคลังและพัสดุ
        </NoteBar>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="ค่าเสื่อมราคารวม ปีงบ 2568"
          value={`${fmtMillion(T68.total)} ลบ.`}
          unit={`ทุกหน่วยงาน · ${DEP_UNITS.length} แถว`}
          accent="primary"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="เทียบปีงบ 2567"
          value={fmtPct(pct(T68.total, T67.total))}
          unit={`${fmtMillion(T67.total)} → ${fmtMillion(T68.total)} ลบ.`}
          accent="warning"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="งบแผ่นดิน / เงินรายได้ 2568"
          value={`${fmtMillion(T68.budget)} / ${fmtMillion(T68.revenue)}`}
          unit="ล้านบาท"
          accent="info"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="สัดส่วนอาคารและสิ่งปลูกสร้าง 2568"
          value={fmtPct((BUILD68 / T68.total) * 100).replace('+', '')}
          unit={`อาคาร ${fmtMillion(BUILD68)} ลบ. · ที่เหลือเป็นครุภัณฑ์`}
          accent="success"
        />
      </Grid>

      <Grid size={12}>
        <Card>
          <CardHeader
            title="ค่าเสื่อมราคาตามหน่วยงาน ปีงบ 2568 เทียบ 2567"
            subheader="บาท · กดแถวเพื่อดูแยกตามแหล่งเงินและประเภทสินทรัพย์"
          />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ px: 5, pb: 4 }}
            alignItems={{ md: 'center' }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={group}
              onChange={(_, v: GroupFilter | null) => {
                if (v) {
                  setGroup(v);
                  setPage(0);
                }
              }}
            >
              <ToggleButton value="all">ทั้งหมด</ToggleButton>
              {(Object.keys(DEP_GROUP_LABEL) as DepGroup[]).map((g) => (
                <ToggleButton key={g} value={g}>
                  {DEP_GROUP_LABEL[g]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              size="small"
              placeholder="ค้นหาหน่วยงาน"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 240 }}
            />
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>หน่วยงาน</TableCell>
                  <TableCell align="right" sx={wide}>
                    อาคาร
                  </TableCell>
                  <TableCell align="right" sx={wide}>
                    ครุภัณฑ์
                  </TableCell>
                  <TableCell align="right" sx={wide}>
                    งบแผ่นดิน
                  </TableCell>
                  <TableCell align="right" sx={wide}>
                    เงินรายได้
                  </TableCell>
                  <TableCell align="right">รวม 2568</TableCell>
                  <TableCell align="right" sx={wide}>
                    รวม 2567
                  </TableCell>
                  <TableCell align="right">เปลี่ยนแปลง</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                      ไม่พบหน่วยงานที่ตรงกับคำค้น — ลองล้างคำค้นหรือเลือก &ldquo;ทั้งหมด&rdquo;
                    </TableCell>
                  </TableRow>
                )}
                {shown.map(({ u, t67, t68 }) => {
                  const d = pct(t68.total, t67?.total);

                  return (
                    <TableRow
                      key={u.name}
                      hover
                      onClick={() => setOpen(u)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {u.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {DEP_GROUP_LABEL[u.group]}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={wide}>
                        {fmtB(t68.building)}
                      </TableCell>
                      <TableCell align="right" sx={wide}>
                        {fmtB(t68.equipment)}
                      </TableCell>
                      <TableCell align="right" sx={wide}>
                        {fmtB(t68.budget)}
                      </TableCell>
                      <TableCell align="right" sx={wide}>
                        {fmtB(t68.revenue)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {fmtB(t68.total)}
                      </TableCell>
                      <TableCell align="right" sx={wide}>
                        {t67 ? fmtB(t67.total) : 'รวมในคณะ'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            d === null ? 'text.disabled' : d > 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {fmtPct(d)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length > 0 && (
                  <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2 } }}>
                    <TableCell>รวม {rows.length} หน่วยงาน (ตามตัวกรอง ทุกหน้า)</TableCell>
                    <TableCell align="right" sx={wide}>
                      {fmtB(sumOf('building'))}
                    </TableCell>
                    <TableCell align="right" sx={wide}>
                      {fmtB(sumOf('equipment'))}
                    </TableCell>
                    <TableCell align="right" sx={wide}>
                      {fmtB(sumOf('budget'))}
                    </TableCell>
                    <TableCell align="right" sx={wide}>
                      {fmtB(sumOf('revenue'))}
                    </TableCell>
                    <TableCell align="right">{fmtB(sumOf('total'))}</TableCell>
                    <TableCell align="right" sx={wide}>
                      {fmtB(sum67)}
                    </TableCell>
                    <TableCell align="right">{fmtPct(pct(sumOf('total'), sum67))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(+e.target.value);
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="แถวต่อหน้า"
          />
        </Card>
      </Grid>

      <DetailDialog unit={open} onClose={() => setOpen(null)} />
    </Grid>
  );
};

export default DepreciationPanel;
