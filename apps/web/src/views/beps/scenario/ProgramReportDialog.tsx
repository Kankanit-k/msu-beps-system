'use client'

// React Imports
import { useRef, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

// Util Imports
import { asset } from '@/utils/asset'
import { fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * รายงาน A4 ของ W7 — ย้ายจาก openPdfReport() ของ mockup/assets/page-scenario-program.js
 *
 * รายงานนี้เป็นเอกสารที่เอาไปแนบเรื่องเสนอจริง จึงต้อง **ระบุให้ชัดว่าเป็นแบบจำลอง**
 * และบอกฐานรายได้ที่ใช้ทุกครั้ง — ตัวเลขจากหน้านี้ไม่ใช่ผลจากรอบคำนวณที่อนุมัติแล้ว
 *
 * โหลด jsPDF และ html2canvas แบบ dynamic import เฉพาะตอนกดดาวน์โหลด เพื่อไม่ให้สอง
 * ไลบรารีนี้ (ขนาดใหญ่) ติดไปกับ bundle ของทุกหน้า
 */

export type ProgramScenarioSnapshot = {
  name: string
  faculty: string
  level: string
  isNewProgram: boolean
  q: number
  governmentBudget: number
  incomeBudget: number
  tfc: number
  tvc: number
  byMode: Record<RevenueMode, BreakEvenResult>
}

type Props = {
  open: boolean
  onClose: () => void
  snapshot: ProgramScenarioSnapshot
  revenueMode: RevenueMode
  revenueModeLabel: string
}

const ProgramReportDialog = ({ open, onClose, snapshot, revenueMode, revenueModeLabel }: Props) => {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const result = snapshot.byMode[revenueMode]
  const isOk = result.qStar !== null && result.q >= result.qStar
  const breakEvenRevenue = result.breakEvenRevenue ?? 0
  const marginOfSafety = result.marginOfSafety ?? 0

  const download = async () => {
    if (!reportRef.current) return

    setIsExporting(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const width = pdf.internal.pageSize.getWidth()
      const height = (canvas.height * width) / canvas.width

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height)
      pdf.save(`break-even-${snapshot.name}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const rows: [string, string][] = [
    ['จำนวนนิสิต (Q)', `${fmtInt(snapshot.q)} คน`],
    ['รายได้รวม (TR)', `${fmtMillions(result.tr)} ล้านบาท`],
    ['ต้นทุนคงที่ (TFC)', `${fmtMillions(result.tfc)} ล้านบาท`],
    ['ต้นทุนผันแปร (TVC)', `${fmtMillions(result.tvc)} ล้านบาท`],
    ['ต้นทุนรวม (TC)', `${fmtMillions(result.tc)} ล้านบาท`],
    ['รายได้ต่อหัว (R)', result.r === null ? '—' : `${fmtInt(result.r)} บาท/คน`],
    ['ต้นทุนผันแปรต่อหัว (AVC)', result.avc === null ? '—' : `${fmtInt(result.avc)} บาท/คน`],
    ['ส่วนเกินต่อหัว (CM = R − AVC)', result.cm === null ? '—' : `${fmtInt(result.cm)} บาท/คน`],
    ['จุดคุ้มทุน (Q*)', result.qStar === null ? 'ไม่มีจุดคุ้มทุน' : `${fmtInt(result.qStar)} คน`],
    ['รายได้ ณ จุดคุ้มทุน', result.breakEvenRevenue === null ? '—' : `${fmtMillions(breakEvenRevenue)} ล้านบาท`],
    ['Margin of Safety', result.marginOfSafety === null ? '—' : `${fmtMillions(marginOfSafety)} ล้านบาท`],
    ['ส่วนเกิน / ขาดทุน (π)', `${withSign(result.profit, fmtMillions)} ล้านบาท`]
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='body'>
      <DialogContent sx={{ backgroundColor: '#f1f5f9', padding: 4 }}>
        {/* กล่องรายงานใช้สีขาว/ดำคงที่ ไม่ใช้ token ของธีม เพราะต้องพิมพ์ลงกระดาษและแปลงเป็น PDF */}
        <Box
          ref={reportRef}
          sx={{
            backgroundColor: '#ffffff',
            color: '#1e293b',
            paddingBlock: 8,
            paddingInline: 8,
            inlineSize: '100%',
            fontSize: '0.8125rem'
          }}
        >
          <div className='flex items-center gap-4' style={{ borderBlockEnd: '2px solid #6d4cff', paddingBlockEnd: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/images/logos/msu.jpg')} alt='MSU' style={{ blockSize: 46, inlineSize: 'auto' }} />
            <div className='flex-1'>
              <Typography sx={{ fontWeight: 800, color: '#1e293b' }}>
                มหาวิทยาลัยมหาสารคาม | Mahasarakham University
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748b' }}>
                รายงานการวิเคราะห์จุดคุ้มทุน (Break-Even Analysis Report) · กองแผนงาน
              </Typography>
            </div>
            <div style={{ textAlign: 'end' }}>
              <Typography variant='caption' sx={{ color: '#6d4cff', fontWeight: 700, display: 'block' }}>
                {snapshot.isNewProgram ? 'หลักสูตรใหม่ (New Program)' : 'หลักสูตรเดิม (Existing Program)'}
              </Typography>
              <Typography variant='caption' sx={{ color: '#8a5a00' }}>
                ฐานรายได้: {revenueModeLabel}
              </Typography>
            </div>
          </div>

          <Typography variant='h5' sx={{ color: '#1e293b', marginBlockStart: 4, fontWeight: 800 }}>
            รายงานการวิเคราะห์จุดคุ้มทุนหลักสูตร
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748b' }}>
            {snapshot.name} · {snapshot.faculty || '—'} · {snapshot.level}
          </Typography>

          <Box
            sx={{
              marginBlock: 4,
              paddingBlock: 3,
              paddingInline: 4,
              borderRadius: 2,
              backgroundColor: isOk ? '#e8f7e0' : '#fff3d6',
              color: isOk ? '#3a8c00' : '#a67500'
            }}
          >
            <Typography sx={{ fontWeight: 800, color: 'inherit' }}>
              {isOk ? 'ผ่านจุดคุ้มทุน' : 'ยังไม่ถึงจุดคุ้มทุน'}
            </Typography>
            <Typography variant='caption' sx={{ color: '#5a5169' }}>
              {result.qStar === null
                ? 'ไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน (R ≤ AVC)'
                : `จำนวนนิสิต ณ จุดคุ้มทุน = ${fmtInt(result.qStar)} คน · นิสิตจริง = ${fmtInt(
                    result.q
                  )} คน · ส่วนต่าง ${result.q >= result.qStar ? '+' : ''}${fmtInt(
                    result.q - result.qStar
                  )} คน · รายได้ ณ จุดคุ้มทุน = ${fmtMillions(breakEvenRevenue)} ล้านบาท`}
            </Typography>
          </Box>

          <Typography sx={{ fontWeight: 700, color: '#6d4cff', marginBlockEnd: 2 }}>
            ตัวเลขที่ใช้และผลการคำนวณ
          </Typography>

          <Box component='table' sx={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <Box component='td' sx={{ paddingBlock: 1.5, borderBlockEnd: '1px solid #e2e8f0', color: '#475569' }}>
                    {label}
                  </Box>
                  <Box
                    component='td'
                    sx={{
                      paddingBlock: 1.5,
                      borderBlockEnd: '1px solid #e2e8f0',
                      textAlign: 'end',
                      fontWeight: 700,
                      color: '#1e293b'
                    }}
                  >
                    {value}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>

          <Typography variant='caption' sx={{ color: '#64748b', display: 'block', marginBlockStart: 4 }}>
            สูตรที่ใช้: Q* = TFC ÷ (R − AVC) · เมื่อ CM ≤ 0 ใช้สูตร 7 (Full-Cost Recovery) Q* = TC ÷ R ·
            คำนวณด้วยเครื่องคำนวณชุดเดียวกับระบบ (@beps/calc-engine)
          </Typography>

          <Typography variant='caption' sx={{ color: '#a67500', display: 'block', marginBlockStart: 2 }}>
            เอกสารนี้เป็น<b>แบบจำลอง</b> ไม่ใช่ผลจากรอบคำนวณที่อนุมัติแล้ว —
            ตัวเลขที่นำไปอ้างอิงในการตัดสินใจต้องมาจากรอบคำนวณที่ผ่านการอนุมัติ
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
        <Button
          variant='contained'
          onClick={download}
          disabled={isExporting}
          startIcon={<i className='ri-download-line' />}
        >
          {isExporting ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลด PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProgramReportDialog
