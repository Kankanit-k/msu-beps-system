'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import type { BreakEvenResult } from '@beps/calc-engine';

// Data / calc Imports
import type { ProgRow } from '@/data/mockup';
import { computeBreakEven, fmtInt, fmtMillion } from '@views/breakeven/calc';
import type { AfterResult } from '@views/cross/CrossPanels';

import CostCategoryPanel from './CostCategoryPanel';

export type DetailTab = 'be' | 'cost';

/** หน้าต่างรายละเอียดหลักสูตร — ตัวเลขทั้งสองกรณีวางคู่กัน */
const ProgramDialog = ({
  p,
  after,
  initialTab = 'be',
  onClose,
}: {
  p: ProgRow | null;
  after?: AfterResult;
  /** แท็บที่เปิดก่อน — หน้าต้นทุนเปิดแท็บหมวดรายจ่าย */
  initialTab?: DetailTab;
  onClose: () => void;
}) => {
  // key ของ Dialog เปลี่ยนตามหลักสูตร/แท็บ → state เริ่มใหม่ทุกครั้งที่เปิด
  const [tab, setTab] = useState<DetailTab>(initialTab);

  const both = useMemo(
    () =>
      p
        ? ([
            computeBreakEven(p, 'with_government'),
            computeBreakEven(p, 'without_government'),
          ] as const)
        : null,
    [p],
  );

  const rows: { label: string; v: (r: BreakEvenResult) => string }[] = [
    { label: 'รายได้รวม (ลบ.)', v: (r) => fmtMillion(r.tr) },
    { label: 'ต้นทุนรวม (ลบ.)', v: (r) => fmtMillion(r.tc) },
    { label: 'รายได้ต่อหัว (บาท)', v: (r) => fmtInt(r.r) },
    { label: 'ต้นทุนผันแปรต่อหัว (บาท)', v: (r) => fmtInt(r.avc) },
    {
      label: 'เป้า / จุดคุ้มทุน (คน)',
      v: (r) => (r.qStar !== null && r.qStar > 0 ? fmtInt(r.qStar) : 'ไม่มี'),
    },
    {
      label: 'ส่วนเกิน / ขาดทุน (ลบ.)',
      v: (r) => `${r.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(r.profit))}`,
    },
  ];

  return (
    <Dialog open={Boolean(p)} onClose={onClose} maxWidth="sm" fullWidth>
      {p && both && (
        <>
          <DialogTitle sx={{ pr: 12 }}>
            {p.prog}
            <Typography variant="body2" color="text.secondary">
              {p.lvl} · {p.deg}
            </Typography>
            <IconButton
              aria-label="ปิด"
              onClick={onClose}
              sx={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}
            >
              <i className="ri-close-line" />
            </IconButton>
          </DialogTitle>
          <Tabs
            value={tab}
            onChange={(_, v: DetailTab) => setTab(v)}
            sx={{ px: 5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="be" label="จุดคุ้มทุน" />
            <Tab value="cost" label="ต้นทุนตามหมวดรายจ่าย" />
          </Tabs>
          <DialogContent sx={{ pt: 4 }}>
            {tab === 'cost' ? (
              <CostCategoryPanel p={p} />
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
                  <Typography variant="body2">
                    นิสิตจริง <b>{fmtInt(p.Q)}</b> คน
                  </Typography>
                  <Typography variant="body2">
                    เงินแผ่นดิน <b>{fmtMillion(p.st)}</b> · เงินรายได้ <b>{fmtMillion(p.own)}</b>{' '}
                    ลบ.
                  </Typography>
                  <Typography variant="body2">
                    ต้นทุนคงที่ <b>{fmtMillion(p.TFC)}</b> · ผันแปร <b>{fmtMillion(p.TVC)}</b> ลบ.
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell align="right">รวมเงินแผ่นดิน</TableCell>
                      <TableCell align="right">ไม่รวมเงินแผ่นดิน</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="right" className="num">
                          {row.v(both[0])}
                        </TableCell>
                        <TableCell align="right" className="num">
                          {row.v(both[1])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  {after
                    ? `หลังปรับ (บันทึก ${after.savedAt}): เป้า ${after.valid && after.qStar !== null ? `${fmtInt(after.qStar)} คน` : 'ไม่มีจุดคุ้มทุน'} · ${after.profit >= 0 ? 'ส่วนเกิน +' : 'ขาดทุน −'}${fmtMillion(Math.abs(after.profit))} ลบ.`
                    : 'ยังไม่มีผลการปรับปรุงหลักสูตรนี้ที่บันทึกไว้ในเครื่องนี้'}
                </Typography>
              </>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default ProgramDialog;
