'use client';

// ดูตัวอย่างรายงานก่อนออก — ดาวน์โหลด PDF (จับภาพทีละหน้า A4) · พิมพ์ผ่านเบราว์เซอร์ · ปิด

import { useRef, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';

import ProgramReport from './ProgramReport';
import type { ProgramHistoryEntry } from './types';

const fileName = (name: string) =>
  `รายงานจุดคุ้มทุน_${(name || 'รายงาน').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60)}.pdf`;

interface Props {
  entry: ProgramHistoryEntry | null;
  onClose: () => void;
  /** พิมพ์ผ่านเบราว์เซอร์ — ใช้รายงานชุดที่ซ่อนไว้สำหรับพิมพ์ในหน้าหลัก */
  onPrint: () => void;
  onToast: (msg: string) => void;
}

const ReportPreviewDialog = ({ entry, onClose, onPrint, onToast }: Props) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const pages = reportRef.current?.querySelectorAll<HTMLElement>('[data-report-page]');

    if (!entry || !pages?.length) return;
    setBusy(true);

    try {
      // โหลดเมื่อกดเท่านั้น — ไม่ถ่วงหน้าหลัก
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = 210;
      const H = 297;

      for (const [i, page] of [...pages].entries()) {
        const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff' });
        const ratio = Math.min(W / canvas.width, H / canvas.height);

        if (i > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          (W - canvas.width * ratio) / 2,
          0,
          canvas.width * ratio,
          canvas.height * ratio,
        );
      }

      pdf.save(fileName(entry.name));
      onToast('ดาวน์โหลดรายงาน PDF แล้ว');
    } catch {
      onToast('สร้างไฟล์ PDF ไม่สำเร็จ — ใช้ปุ่ม "พิมพ์ / บันทึก PDF" แล้วเลือกบันทึกเป็น PDF แทน');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!entry}
      onClose={onClose}
      fullScreen
      sx={{ '@media print': { display: 'none' } }}
      slotProps={{
        paper: { sx: { bgcolor: 'transparent', boxShadow: 'none' } },
        backdrop: { sx: { bgcolor: 'rgba(0,0,0,.6)' } },
      }}
    >
      <IconButton
        onClick={onClose}
        title="ปิด (Esc)"
        sx={{
          position: 'fixed',
          top: 16,
          right: 24,
          zIndex: 2,
          bgcolor: 'rgba(255,255,255,.9)',
          boxShadow: 2,
          '&:hover': { bgcolor: '#fff' },
        }}
      >
        <i className="ri-close-line" />
      </IconButton>

      {/* คลิกพื้นหลังรอบกระดาษ = ปิด */}
      <Box
        onClick={(e) => e.target === e.currentTarget && onClose()}
        sx={{ overflowY: 'auto', height: '100%', pt: 3, pb: 14, px: 2 }}
      >
        <Box ref={reportRef} sx={{ width: 'fit-content', mx: 'auto' }}>
          {entry && <ProgramReport entry={entry} />}
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button
          variant="contained"
          color="success"
          size="large"
          disabled={busy}
          onClick={() => void download()}
          startIcon={
            busy ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <i className="ri-download-2-line" />
            )
          }
        >
          {busy ? 'กำลังสร้าง PDF…' : 'ดาวน์โหลด PDF'}
        </Button>
        <Button
          variant="contained"
          size="large"
          disabled={busy}
          onClick={onPrint}
          startIcon={<i className="ri-printer-line" />}
        >
          พิมพ์ / บันทึก PDF
        </Button>
        <Button variant="contained" color="secondary" size="large" onClick={onClose}>
          ปิด
        </Button>
      </Box>
    </Dialog>
  );
};

export default ReportPreviewDialog;
