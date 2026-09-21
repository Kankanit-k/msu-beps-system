// รายงานสำหรับพิมพ์/บันทึกเป็น PDF ผ่านกล่องโต้ตอบพิมพ์ของเบราว์เซอร์ (window.print())
// พอร์ตเนื้อหาจาก openPdfReport() ใน page-scenario-program.js แบบย่อ — ไม่ใช้ html2canvas/jsPDF
// เพราะต้นฉบับเองก็ใช้ window.print() เป็นทางเลือกหลัก (ปุ่ม "พิมพ์ / บันทึก PDF")
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { ProgramHistoryEntry } from './types';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface Props {
  entry: ProgramHistoryEntry;
}

const ProgramReport = ({ entry }: Props) => {
  const r = entry.mode === 'with_government' ? entry.withGov : entry.withoutGov;
  const isOk = r.qStar !== null && entry.q >= r.qStar;
  const beRev = r.qStar && r.r ? r.qStar * r.r : 0;
  const mos = entry.tr - beRev;
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box sx={{ p: 6, color: '#2e263d', fontFamily: 'inherit', maxWidth: 820, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #5938e0', pb: 2, mb: 4 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#5938e0', fontSize: 15 }}>
            มหาวิทยาลัยมหาสารคาม | Mahasarakham University
          </Typography>
          <Typography variant="caption" color="text.secondary">
            รายงานการวิเคราะห์จุดคุ้มทุน (Break-Even Analysis Report) · กองแผนงาน
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" display="block" sx={{ fontWeight: 700, color: '#5938e0' }}>
            ปีการศึกษา 2568
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {dateStr}
          </Typography>
        </Box>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800, color: '#5938e0' }}>
        รายงานการวิเคราะห์จุดคุ้มทุนหลักสูตร
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {entry.name} · {entry.fac || '-'} · {entry.level}
      </Typography>

      <Box
        sx={{
          border: `2px solid ${isOk ? '#56ca00' : '#ffb400'}`,
          bgcolor: isOk ? '#e6f8d9' : '#fff3d6',
          borderRadius: 2,
          p: 3,
          mb: 4,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: 28 }}>{isOk ? '✅' : '⚠️'}</Typography>
        <Box>
          <Typography sx={{ fontWeight: 800, color: isOk ? '#3a8c00' : '#a67500' }}>
            {isOk ? 'ผ่านจุดคุ้มทุน' : 'ยังไม่ถึงจุดคุ้มทุน'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.qStar
              ? `จำนวนนิสิต ณ จุดคุ้มทุน = ${fmtN(r.qStar)} คน · นิสิตจริง = ${fmtN(entry.q)} คน · ส่วนต่าง ${entry.q >= r.qStar ? '+' : ''}${fmtN(entry.q - r.qStar)} คน · รายได้ ณ จุดคุ้มทุน = ${fmtM(beRev)} ล้านบาท`
              : 'ไม่มีจุดคุ้มทุน'}
          </Typography>
        </Box>
      </Box>

      <Typography variant="overline" sx={{ color: '#6d4cff', fontWeight: 800 }}>
        1. ข้อมูลหลักสูตร
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3, mt: 1 }}>
        {[
          ['ชื่อหลักสูตร', entry.name],
          ['สังกัดคณะ / วิทยาลัย', entry.fac || '-'],
          ['ระดับการศึกษา', entry.level],
          ['ประเภทหลักสูตร', entry.isNew ? 'หลักสูตรใหม่ (New)' : 'หลักสูตรเดิม (Existing)'],
        ].map(([label, val]) => (
          <Box key={label} sx={{ bgcolor: '#f8fafd', border: '1px solid #e2e8f2', borderRadius: 1.5, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {label}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{val}</Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="overline" sx={{ color: '#6d4cff', fontWeight: 800 }}>
        2. โครงสร้างต้นทุนและรายได้ (โหมด: {entry.mode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน'})
      </Typography>
      <Table size="small" sx={{ mt: 1, mb: 3 }}>
        <TableHead>
          <TableRow sx={{ '& th': { bgcolor: '#5938e0', color: '#fff', fontWeight: 700 } }}>
            <TableCell>รายการ</TableCell>
            <TableCell align="right">บาท</TableCell>
            <TableCell align="right">ล้านบาท</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>รายได้รวม (TR)</TableCell>
            <TableCell align="right">{fmtB(r.tr)}</TableCell>
            <TableCell align="right">{fmtM(r.tr)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ต้นทุนรวม (TC)</TableCell>
            <TableCell align="right">{fmtB(r.tc)}</TableCell>
            <TableCell align="right">{fmtM(r.tc)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ pl: 4, color: 'text.secondary' }}>ต้นทุนคงที่รวม (TFC)</TableCell>
            <TableCell align="right">{fmtB(r.tfc)}</TableCell>
            <TableCell align="right">{fmtM(r.tfc)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ pl: 4, color: 'text.secondary' }}>ต้นทุนผันแปรรวม (TVC)</TableCell>
            <TableCell align="right">{fmtB(r.tvc)}</TableCell>
            <TableCell align="right">{fmtM(r.tvc)}</TableCell>
          </TableRow>
          <TableRow sx={{ bgcolor: '#f0ecff' }}>
            <TableCell sx={{ fontWeight: 700 }}>Contribution Margin/หน่วย (CM)</TableCell>
            <TableCell align="right" colSpan={2} sx={{ fontWeight: 700 }}>
              {fmtB(r.cm ?? 0)} บ./คน
            </TableCell>
          </TableRow>
          <TableRow sx={{ bgcolor: r.profit >= 0 ? '#e6f8d9' : '#ffe4e5' }}>
            <TableCell sx={{ fontWeight: 700 }}>ส่วนเกิน / ขาดทุน (π)</TableCell>
            <TableCell align="right" colSpan={2} sx={{ fontWeight: 700 }}>
              {r.profit >= 0 ? '+' : ''}
              {fmtB(r.profit)} ({fmtM(r.profit)} ล.)
            </TableCell>
          </TableRow>
          {r.qStar && (
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Margin of Safety (MoS)</TableCell>
              <TableCell align="right" colSpan={2} sx={{ fontWeight: 700 }}>
                {fmtB(mos)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Typography variant="overline" sx={{ color: '#6d4cff', fontWeight: 800 }}>
        3. การคำนวณจุดคุ้มทุน
      </Typography>
      <Box sx={{ bgcolor: '#f0ecff', border: '1px solid rgba(109,76,255,.25)', borderRadius: 1.5, p: 2, mt: 1, mb: 2 }}>
        <Typography variant="body2" sx={{ color: '#5938e0' }}>
          Q* = TFC / (R − AVC) = {fmtB(r.tfc)} / ({fmtB(r.r ?? 0)} − {fmtB(r.avc ?? 0)}){' '}
          <b>{r.qStar ? `= ${fmtN(r.qStar)} คน` : ''}</b>
        </Typography>
      </Box>
      <Box sx={{ bgcolor: '#f0ecff', border: '1px solid rgba(109,76,255,.25)', borderRadius: 1.5, p: 2, mb: 4 }}>
        <Typography variant="body2" sx={{ color: '#5938e0' }}>
          π = (R − AVC) × Q − TFC = ({fmtB(r.r ?? 0)} − {fmtB(r.avc ?? 0)}) × {fmtN(entry.q)} − {fmtB(r.tfc)} ={' '}
          <b style={{ color: r.profit >= 0 ? '#3a8c00' : '#c2383c' }}>
            {r.profit >= 0 ? '+' : ''}
            {fmtB(r.profit)} บาท
          </b>
        </Typography>
      </Box>

      <Typography variant="overline" sx={{ color: '#6d4cff', fontWeight: 800 }}>
        4. ผู้รับรองรายงาน
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mt: 3 }}>
        {['ผู้จัดทำ', 'ประธานหลักสูตร', 'คณบดี / ผู้อำนวยการ'].map((role) => (
          <Box key={role} sx={{ textAlign: 'center', pt: 5, borderTop: '1px solid #334155' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{role}</Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              (...................................)
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              วันที่: .........................
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ProgramReport;
