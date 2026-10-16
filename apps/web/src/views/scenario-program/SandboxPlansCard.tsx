'use client';

// แผนที่บันทึกไว้ในห้องจำลองแผนรับนิสิต — ตั้งชื่อ/บันทึก · ดูย้อนหลัง (แบ่งหน้า) · เปิดกลับมาแก้ · ลบ · เทียบสูงสุด 3 แผน

import { useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Pagination from '@mui/material/Pagination';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';

import type { SandboxPlan } from './sandboxStore';

const fmt = (v: number) => Math.round(v).toLocaleString('th-TH');
const mb = (v: number) =>
  `${(v / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้าน`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const PAGE_SIZE = 5;
const MAX_COMPARE = 3;

const StatusChip = ({ r }: { r: SandboxPlan['result']['with_government'] }) =>
  r.qStar === null ? (
    <Chip size="small" label="—" />
  ) : (
    <Chip
      size="small"
      color={r.profit >= 0 ? 'success' : 'error'}
      label={r.profit >= 0 ? 'คุ้มทุน' : 'ขาดทุน'}
    />
  );

interface Props {
  plans: SandboxPlan[];
  /** ข้อความบอกเหตุผลที่ยังบันทึกไม่ได้ — null = บันทึกได้ */
  saveBlocker: string | null;
  onSave: (name: string) => void;
  onOpen: (p: SandboxPlan) => void;
  onDelete: (p: SandboxPlan) => void;
  onToast: (msg: string) => void;
}

const SandboxPlansCard = ({ plans, saveBlocker, onSave, onOpen, onDelete, onToast }: Props) => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [toDelete, setToDelete] = useState<SandboxPlan | null>(null);

  const pages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = plans.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const compared = plans.filter((p) => picked.includes(p.id));

  const submit = () => {
    if (!name.trim()) {
      setNameError('ตั้งชื่อแผนก่อนบันทึก เพื่อให้หาเจอในประวัติ');

      return;
    }

    if (saveBlocker) {
      setNameError(saveBlocker);

      return;
    }

    onSave(name.trim());
    setName('');
    setPage(1);
  };

  const togglePick = (id: number, on: boolean) => {
    if (on && picked.length >= MAX_COMPARE) {
      onToast(`เทียบได้สูงสุด ${MAX_COMPARE} แผน — เอาติ๊กแผนอื่นออกก่อน`);

      return;
    }

    setPicked((xs) => (on ? [...xs, id] : xs.filter((x) => x !== id)));
  };

  return (
    <Card>
      <CardHeader
        title={<DotTitle color="primary.main">บันทึกและเทียบแผน</DotTitle>}
        subheader="🔒 แสดงเฉพาะแผนที่คุณบันทึกเอง ผู้ใช้อื่นรวมถึงผู้ดูแลคณะมองไม่เห็น · ติ๊กได้สูงสุด 3 แผนเพื่อเทียบ"
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
        >
          <TextField
            size="small"
            label="ชื่อแผน"
            placeholder="เช่น แผน A เพิ่มภาคพิเศษ"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            onBlur={() => {
              if (name && !name.trim()) setNameError('ชื่อแผนต้องไม่เป็นช่องว่าง');
            }}
            error={!!nameError}
            helperText={nameError ?? ' '}
            slotProps={{ htmlInput: { maxLength: 60 } }}
            sx={{ width: { xs: '100%', sm: 320 } }}
          />
          <Button type="submit" variant="contained">
            บันทึกแผน
          </Button>
        </Box>

        {plans.length === 0 ? (
          <Alert severity="info" variant="outlined">
            ยังไม่มีแผนที่บันทึกไว้ — ตั้งชื่อแผนด้านบนแล้วกด &quot;บันทึกแผน&quot;
            เพื่อเก็บไว้ดูย้อนหลังหรือเทียบกัน
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">เทียบ</TableCell>
                    <TableCell>ชื่อแผน</TableCell>
                    <TableCell>หลักสูตร</TableCell>
                    <TableCell>บันทึกเมื่อ</TableCell>
                    <TableCell>ข้อมูลปี</TableCell>
                    <TableCell align="right">แผนรับ</TableCell>
                    <TableCell align="right">Q* รวมเงินแผ่นดิน</TableCell>
                    <TableCell align="right">Q* ไม่รวมเงินแผ่นดิน</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={picked.includes(p.id)}
                          onChange={(e) => togglePick(p.id, e.target.checked)}
                          slotProps={{ input: { 'aria-label': `เลือกเทียบ ${p.name}` } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{p.progLabel}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {when(p.savedAt)}
                      </TableCell>
                      <TableCell>{p.dataYear}</TableCell>
                      <TableCell align="right">{fmt(p.q)}</TableCell>
                      {(['with_government', 'without_government'] as const).map((m) => (
                        <TableCell key={m} align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {p.result[m].qStar === null ? '—' : fmt(p.result[m].qStar)}{' '}
                          <StatusChip r={p.result[m]} />
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" onClick={() => onOpen(p)}>
                          เปิด
                        </Button>
                        <Button size="small" color="error" onClick={() => setToDelete(p)}>
                          ลบ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {pages > 1 && (
              <Pagination
                count={pages}
                page={current}
                onChange={(_, v) => setPage(v)}
                size="small"
                sx={{ alignSelf: 'flex-end' }}
              />
            )}
          </>
        )}

        {compared.length === 1 && (
          <Typography variant="body2" color="text.secondary">
            ติ๊กอีกอย่างน้อย 1 แผนเพื่อเทียบ
          </Typography>
        )}
        {compared.length >= 2 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: `repeat(${compared.length}, 1fr)` },
              gap: 2,
            }}
          >
            {compared.map((p) => (
              <Box
                key={p.id}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, fontSize: 14 }}
              >
                <Typography fontWeight={700}>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {p.progLabel} · ข้อมูลปี {p.dataYear}
                </Typography>
                {p.segs
                  .filter((s) => s.n > 0)
                  .map((s) => (
                    <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.label}</span>
                      <span>{fmt(s.n)}</span>
                    </Box>
                  ))}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: 1,
                    borderColor: 'divider',
                    mt: 1,
                    pt: 1,
                    fontWeight: 700,
                  }}
                >
                  <span>รวมรับ</span>
                  <span>{fmt(p.q)}</span>
                </Box>
                {(['with_government', 'without_government'] as const).map((m) => (
                  <Box key={m} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      กำไร(ขาดทุน) · {m === 'with_government' ? 'รวมแผ่นดิน' : 'ไม่รวม'}
                    </span>
                    <Box
                      component="span"
                      sx={{ color: p.result[m].profit >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {mb(p.result[m].profit)}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>ลบแผน &quot;{toDelete?.name}&quot;?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ลบแล้วกู้คืนไม่ได้ ผลจำลองนี้จะหายจากประวัติและตารางเทียบ
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>ยกเลิก</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (toDelete) {
                setPicked((xs) => xs.filter((x) => x !== toDelete.id));
                onDelete(toDelete);
              }

              setToDelete(null);
            }}
          >
            ลบแผน
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SandboxPlansCard;
