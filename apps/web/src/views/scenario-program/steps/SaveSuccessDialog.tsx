'use client';

// แจ้งบันทึกสำเร็จ — ทางไปต่อ: ดูรายงาน · คำนวณหลักสูตรใหม่ (กลับขั้นที่ 1) · อยู่หน้านี้ต่อ

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';

import type { ProgramHistoryEntry } from '../types';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');

interface Props {
  entry: ProgramHistoryEntry | null;
  onClose: () => void;
  onReport: (id: number) => void;
  onStartNew: () => void;
}

const SaveSuccessDialog = ({ entry, onClose, onReport, onStartNew }: Props) => (
  <Dialog open={!!entry} onClose={onClose} maxWidth="xs" fullWidth>
    {entry && (
      <>
        <DialogContent sx={{ textAlign: 'center', pt: 5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'var(--mui-palette-success-lightOpacity)',
              color: 'success.main',
              fontSize: 36,
            }}
          >
            <i className="ri-check-line" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            บันทึกผลคำนวณเรียบร้อย
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>{entry.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {entry.fac || '—'} · {entry.level}
          </Typography>
          {(
            [
              ['รวมเงินแผ่นดิน', entry.withGov.qStar],
              ['ไม่รวมเงินแผ่นดิน', entry.withoutGov.qStar],
            ] as const
          ).map(([label, q]) => {
            const ok = q !== null && q >= 0 && entry.q >= q;

            return (
              <Typography key={label} variant="body2">
                {label}: Q* <b>{q === null ? '—' : fmtN(q)}</b> คน · นิสิตจริง {fmtN(entry.q)}{' '}
                <Box
                  component="span"
                  sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}
                >
                  {q === null ? '' : ok ? '✓ คุ้มทุน' : '⚠ ยังไม่คุ้มทุน'}
                </Box>
              </Typography>
            );
          })}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            ผลนี้เก็บไว้ในประวัติการคำนวณแล้ว และใช้ในหน้าแผนการรับนิสิตได้
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1, pb: 4 }}>
          <Button onClick={onClose}>อยู่หน้านี้ต่อ</Button>
          <Button
            variant="outlined"
            startIcon={<i className="ri-file-pdf-2-line" />}
            onClick={() => onReport(entry.id)}
          >
            ดูรายงาน PDF
          </Button>
          <Button
            variant="contained"
            autoFocus
            startIcon={<i className="ri-add-line" />}
            onClick={onStartNew}
          >
            คำนวณหลักสูตรใหม่
          </Button>
        </DialogActions>
      </>
    )}
  </Dialog>
);

export default SaveSuccessDialog;
