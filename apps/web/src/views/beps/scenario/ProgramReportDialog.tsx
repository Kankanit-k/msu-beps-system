'use client'

// React Imports
import { useRef, useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// Type Imports
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

// Logger Imports
import { clientLogger } from '@/libs/logger/client'

// Util Imports
import { asset } from '@/utils/asset'
import { fmtDec, fmtInt, fmtMillions, toMillions, withSign } from '@/utils/beps-format'

/**
 * รายงาน A4 2 หน้าของ W7 — ย้ายจาก openPdfReport() ของ mockup/assets/page-scenario-program.js
 *
 * รายงานนี้เป็นเอกสารที่เอาไปแนบเรื่องเสนอเปิดหลักสูตรจริง จึงต้อง **ระบุให้ชัดว่าเป็นแบบจำลอง**
 * และบอกฐานรายได้ที่ใช้ทุกครั้ง — ตัวเลขจากหน้านี้ไม่ใช่ผลจากรอบคำนวณที่อนุมัติแล้ว
 *
 * ทำไมกระดาษรายงานถึงใช้ CSS ธรรมดา (class `pdf-*`) แทน `sx` ของ MUI:
 * 1. ต้องเป็นสีคงที่ ไม่เปลี่ยนตามธีมสว่าง/มืด เพราะปลายทางคือกระดาษ A4
 * 2. ปุ่ม "พิมพ์" ยก `innerHTML` ของกระดาษไปวางในหน้าต่างใหม่ตรงๆ — emotion class ของ MUI
 *    จะไม่มี stylesheet ตามไปด้วย ทำให้รายงานที่พิมพ์ออกมาไม่มีสไตล์เลย
 *
 * jsPDF และ html2canvas โหลดแบบ dynamic import เฉพาะตอนกดดาวน์โหลด เพื่อไม่ให้สองไลบรารีนี้
 * (ขนาดใหญ่) ติดไปกับ bundle ของทุกหน้า
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

/** TODO Phase 4: อ่านจากงวดที่เลือก (`period`) แทนค่าคงที่ — mockup ก็ฝังปีไว้เช่นกัน */
const ACADEMIC_YEAR = 2568

const LOGO_PATH = '/images/logos/msu.jpg'

/** สไตล์ของกระดาษรายงาน — ใช้ทั้งในกล่องพรีวิวและในหน้าต่างพิมพ์ ยกจาก reportDocHtml() ของ mockup */
const REPORT_CSS = `
.pdf-paper{font-family:'Sarabun','IBM Plex Sans Thai',sans-serif;color:#2e263d}
.pdf-page{inline-size:794px;min-block-size:1123px;padding:40px 48px 62px;background:#fff;position:relative;margin-block-end:20px;box-shadow:0 4px 20px rgba(0,0,0,.1);page-break-after:always}
.pdf-page:last-child{page-break-after:auto}
.pdf-header{display:flex;align-items:center;gap:14px;padding-block-end:12px;border-block-end:3.5px solid #5938e0;margin-block-end:18px}
.pdf-logo{inline-size:52px;block-size:52px;border-radius:8px;object-fit:contain;background:#f0f4fa;padding:3px}
.pdf-header-text h1{font-size:13.5px;font-weight:800;color:#5938e0;margin:0}
.pdf-header-text p{font-size:9.5px;color:#6f6880;margin:0}
.pdf-meta{margin-inline-start:auto;text-align:end;font-size:9px;color:#9b95a6;line-height:1.8}
.pdf-meta .pdf-year{font-weight:700;color:#5938e0}
.pdf-tag{font-size:8px;padding:2px 8px;border-radius:10px;display:inline-block;font-weight:700;margin-block-start:3px}
.pdf-tag-type{background:#efeaff;color:#6d4cff}
.pdf-tag-mode{background:#fff3d6;color:#8a5a00}
.pdf-title{font-size:18px;font-weight:800;color:#5938e0;margin:0 0 4px}
.pdf-subtitle{font-size:11px;color:#6f6880;margin:0 0 12px}
.pdf-sec{font-size:9.5px;font-weight:800;letter-spacing:.12em;color:#6d4cff;margin:12px 0 6px;display:flex;align-items:center;gap:7px}
.pdf-sec::before{content:'';inline-size:3px;block-size:11px;background:#6d4cff;border-radius:2px}
.pdf-result-box{border-radius:9px;padding:10px 16px;margin-block-end:10px;border:2px solid;display:flex;align-items:center;gap:14px}
.pdf-result-ok{background:#e6f8d9;border-color:#56ca00}
.pdf-result-warn{background:#fff3d6;border-color:#ffb400}
.pdf-result-icon{font-size:28px;line-height:1}
.pdf-result-title{font-size:14px;font-weight:800}
.pdf-result-detail{font-size:11px;color:#5a5169;margin-block-start:2px}
.pdf-draft-note{background:#fff3d6;border:1px solid #ffb400;border-radius:8px;padding:7px 14px;font-size:10px;color:#8a5a00;line-height:1.7;margin-block-end:4px}
.pdf-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-block-end:10px}
.pdf-info-box{background:#f8fafd;border:1px solid #e2e8f2;border-radius:7px;padding:9px 13px}
.pdf-info-label{font-size:8px;font-weight:700;color:#9b95a6;margin-block-end:3px}
.pdf-info-val{font-size:12.5px;font-weight:700;color:#2e263d}
.pdf-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-block-end:10px}
.pdf-kpi{background:#f8fafd;border:1px solid #e2e8f2;border-radius:7px;padding:9px 11px;text-align:center}
.pdf-kpi-label{font-size:7.5px;font-weight:700;color:#9b95a6;margin-block-end:4px}
.pdf-kpi-val{font-size:15px;font-weight:800}
.pdf-kpi-unit{font-size:9px;color:#9b95a6}
.pdf-table{inline-size:100%;border-collapse:collapse;font-size:11px;margin-block-end:10px}
.pdf-table th{background:#5938e0;color:#fff;padding:7px 11px;text-align:start;font-size:9px;font-weight:700}
.pdf-table th:last-child,.pdf-table td:last-child{text-align:end}
.pdf-table td{padding:5.5px 11px;border-block-end:1px solid #e2e8f2}
.pdf-table .indent{padding-inline-start:20px;color:#5a5169}
.pdf-table .bold{font-weight:700}
.pdf-table .navy{color:#5938e0;font-weight:700}
.pdf-table .gold{color:#b8860b;font-weight:700}
.pdf-table .green{color:#3a8c00;font-weight:700}
.pdf-table .red{color:#c2383c;font-weight:700}
.pdf-table .row-cm{background:#f0ecff}
.pdf-table .row-profit-pos{background:#e6f8d9}
.pdf-table .row-profit-neg{background:#ffe4e5}
.pdf-table .row-be{background:#f8fafd}
.pdf-formula-box{background:#f0ecff;border:1px solid rgba(109,76,255,.25);border-radius:7px;padding:9px 14px;margin-block-end:8px;font-size:11.5px;color:#5938e0;line-height:1.7}
.pdf-method-note{font-size:9px;color:#6f6880;line-height:1.7;margin-block-start:2px}
.pdf-chart-frame{text-align:center;margin-block-end:12px;border:1px solid #e2e8f2;border-radius:8px;overflow:hidden}
.pdf-chart-caption{font-size:9.5px;color:#6f6880;text-align:center;margin-block-end:16px}
.pdf-advice{font-size:11.5px;color:#334155;line-height:2;background:#f8fafd;border:1px solid #e2e8f2;border-radius:8px;padding:14px 16px;margin-block-end:16px}
.pdf-sig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-block-start:24px}
.pdf-sig-box{text-align:center;padding-block-start:45px;border-block-start:1px solid #334155;font-size:10px;color:#5a5169}
.pdf-sig-box .sig-title{font-weight:700;color:#2e263d;font-size:10.5px}
.pdf-ref{margin-block-start:20px;padding:10px 14px;background:#f0ecff;border:1px solid rgba(109,76,255,.20);border-radius:8px;font-size:9.5px;color:#5938e0;line-height:1.8}
.pdf-footer-line{position:absolute;inset-block-end:24px;inset-inline:48px;border-block-start:1px solid #e2e8f2;padding-block-start:7px;font-size:8px;color:#9b95a6;display:flex;justify-content:space-between}
`

/** สไตล์เฉพาะหน้าต่างพิมพ์ — ไม่เอาเข้ามาในแอป เพราะ @page/@media print จะไปกวนการสั่งพิมพ์หน้าอื่น */
const PRINT_ONLY_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f4f8;padding-block:20px}
.toolbar{background:#5938e0;color:#fff;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;font-family:'Sarabun',sans-serif}
.toolbar h2{font-size:14px;font-weight:700}
.toolbar p{font-size:11px;opacity:.7;margin-block-start:2px}
.btn-print{background:#6d4cff;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}
.btn-close{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:8px 16px;font-family:inherit;font-size:12px;cursor:pointer;margin-inline-start:10px}
.page-wrap{max-inline-size:794px;margin:20px auto}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{background:#fff!important;padding:0!important}
  .toolbar{display:none!important}
  .page-wrap{margin:0!important;max-inline-size:none!important}
  .pdf-page{box-shadow:none!important;margin:0!important;min-block-size:auto!important}
  @page{size:A4;margin:0}
}
`

const ProgramReportDialog = ({ open, onClose, snapshot, revenueMode, revenueModeLabel }: Props) => {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const result = snapshot.byMode[revenueMode]
  const isOk = result.qStar !== null && result.q >= result.qStar
  const isFullCostRecovery = result.qStarStatus === 'full_cost_recovery'
  const r = result.r ?? 0
  const avc = result.avc ?? 0
  const cm = result.cm ?? 0
  const breakEvenRevenue = result.breakEvenRevenue ?? 0
  const marginOfSafety = result.marginOfSafety ?? 0

  const typeLabel = snapshot.isNewProgram ? 'หลักสูตรใหม่ (New Program)' : 'หลักสูตรเดิม (Existing Program)'
  const statusColor = isOk ? '#3a8c00' : '#a67500'
  const profitColor = result.profit >= 0 ? '#3a8c00' : '#c2383c'
  const printedAt = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

  const fileName = `รายงานจุดคุ้มทุน_${snapshot.name.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60)}`

  /** ประกอบเอกสารฉบับเต็มสำหรับหน้าต่างพิมพ์ / ไฟล์ HTML สำรอง — ยก markup ของกระดาษไปตรงๆ */
  const reportDocHtml = (): string | null => {
    const paper = reportRef.current

    if (!paper?.innerHTML.trim()) return null

    /* หน้าต่างใหม่เป็น about:blank จึงไม่มี base URL — path ของโลโก้ต้องเป็น absolute */
    const body = paper.innerHTML.replaceAll(asset(LOGO_PATH), new URL(asset(LOGO_PATH), window.location.origin).href)

    return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>รายงานการวิเคราะห์จุดคุ้มทุน — มหาวิทยาลัยมหาสารคาม</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${PRINT_ONLY_CSS}${REPORT_CSS}</style></head>
<body class="pdf-paper">
<div class="toolbar"><div><h2>รายงานการวิเคราะห์จุดคุ้มทุน — มหาวิทยาลัยมหาสารคาม</h2><p>ตรวจสอบก่อนบันทึก · กด &ldquo;พิมพ์ / บันทึก PDF&rdquo; เพื่อดาวน์โหลด</p></div>
<div><button class="btn-print" onclick="window.print()">พิมพ์ / บันทึก PDF</button><button class="btn-close" onclick="window.close()">ปิด</button></div></div>
<div class="page-wrap">${body}</div></body></html>`
  }

  const printReport = () => {
    const doc = reportDocHtml()

    if (!doc) return

    const win = window.open('', '_blank', 'width=880,height=900,scrollbars=yes')

    if (!win) {
      clientLogger.error('เปิดหน้าต่างพิมพ์รายงานไม่ได้ (ถูกบล็อก Pop-up)', { context: { screen: 'W7' } })
      alert('เบราว์เซอร์บล็อก Pop-up — กรุณาอนุญาต หรือใช้ปุ่ม "ดาวน์โหลด PDF" แทน')

      return
    }

    win.document.write(doc)
    win.document.close()
  }

  /** ทางสำรองเมื่อสร้าง PDF ไม่ได้ — ได้ไฟล์ HTML ที่เปิดแล้วสั่งพิมพ์เป็น PDF ได้เหมือนกัน */
  const downloadHtml = () => {
    const doc = reportDocHtml()

    if (!doc) return

    const url = URL.createObjectURL(new Blob([`﻿${doc}`], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')

    link.href = url
    link.download = `${fileName}.html`
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      link.remove()
    }, 1500)
  }

  /**
   * แปลงกระดาษเป็น PDF ทีละหน้า — ต้องวนต่อ `.pdf-page` ไม่ใช่ถ่ายทั้งก้อนครั้งเดียว
   * เพราะรายงานสูงกว่า A4 หนึ่งหน้า ถ้าย่อทั้งก้อนลงหน้าเดียวตัวหนังสือจะเล็กจนอ่านไม่ออก
   */
  const download = async () => {
    const paper = reportRef.current

    if (!paper) return

    setIsExporting(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const pages = [...paper.querySelectorAll<HTMLElement>('.pdf-page')]
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      for (const [index, page] of pages.entries()) {
        // eslint-disable-next-line no-await-in-loop -- ถ่ายทีละหน้าตามลำดับ ไม่งั้นลำดับหน้าใน PDF สลับได้
        const canvas = await html2canvas(page, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: page.scrollWidth
        })

        if (index > 0) pdf.addPage()

        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)

        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          (pageWidth - canvas.width * ratio) / 2,
          0,
          canvas.width * ratio,
          canvas.height * ratio,
          undefined,
          'FAST'
        )
      }

      pdf.save(`${fileName}.pdf`)
    } catch (error) {
      clientLogger.error('สร้างไฟล์ PDF รายงานจุดคุ้มทุนไม่สำเร็จ', {
        error,
        context: { screen: 'W7', program: snapshot.name, revenueMode }
      })
      alert('สร้างไฟล์ PDF ไม่สำเร็จ — จะดาวน์โหลดเป็นไฟล์ HTML ให้แทน (เปิดแล้วสั่งพิมพ์เป็น PDF ได้)')
      downloadHtml()
    } finally {
      setIsExporting(false)
    }
  }

  const header = (
    <div className='pdf-header'>
      {/* eslint-disable-next-line @next/next/no-img-element -- ต้องเป็น <img> ธรรมดา เพราะ markup นี้ถูกยกไปวางในหน้าต่างพิมพ์ */}
      <img src={asset(LOGO_PATH)} alt='MSU' className='pdf-logo' />
      <div className='pdf-header-text'>
        <h1>มหาวิทยาลัยมหาสารคาม | Mahasarakham University</h1>
        <p>รายงานการวิเคราะห์จุดคุ้มทุน (Break-Even Analysis Report) · กองแผนงาน</p>
      </div>
      <div className='pdf-meta'>
        <div className='pdf-year'>ปีการศึกษา {ACADEMIC_YEAR}</div>
        <div>{printedAt}</div>
        <div>
          <span className='pdf-tag pdf-tag-type'>{typeLabel}</span>
        </div>
        <div>
          <span className='pdf-tag pdf-tag-mode'>ฐานรายได้: {revenueModeLabel}</span>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} scroll='body'>
      <DialogContent sx={{ backgroundColor: '#f0f4f8', padding: 4, overflowX: 'auto' }}>
        <style>{REPORT_CSS}</style>
        <div className='pdf-paper' ref={reportRef}>
          <div className='pdf-page'>
            {header}

            <h2 className='pdf-title'>รายงานการวิเคราะห์จุดคุ้มทุนหลักสูตร</h2>
            <p className='pdf-subtitle'>
              {snapshot.name} · {snapshot.faculty || '—'} · {snapshot.level}
            </p>

            <div className={`pdf-result-box ${isOk ? 'pdf-result-ok' : 'pdf-result-warn'}`}>
              <div className='pdf-result-icon'>{isOk ? '✅' : '⚠️'}</div>
              <div>
                <div className='pdf-result-title' style={{ color: statusColor }}>
                  {isOk ? 'ผ่านจุดคุ้มทุน' : 'ยังไม่ถึงจุดคุ้มทุน'}
                </div>
                <div className='pdf-result-detail'>
                  {result.qStar === null
                    ? 'ไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน (R ≤ AVC)'
                    : `จำนวนนิสิต ณ จุดคุ้มทุน = ${fmtInt(result.qStar)} คน · นิสิตจริง = ${fmtInt(
                        result.q
                      )} คน · ส่วนต่าง ${result.q >= result.qStar ? '+' : '−'}${fmtInt(
                        Math.abs(result.q - result.qStar)
                      )} คน · รายได้ ณ จุดคุ้มทุน = ${fmtMillions(breakEvenRevenue)} ล้านบาท`}
                </div>
              </div>
            </div>

            <div className='pdf-draft-note'>
              เอกสารนี้เป็น<b>แบบจำลอง (Scenario)</b> ไม่ใช่ผลจากรอบคำนวณที่อนุมัติแล้ว —
              ตัวเลขที่นำไปอ้างอิงในการตัดสินใจต้องมาจากรอบคำนวณที่ผ่านการอนุมัติของกองแผนงาน
            </div>

            <div className='pdf-sec'>1. ข้อมูลหลักสูตร</div>
            <div className='pdf-info-grid'>
              <div className='pdf-info-box'>
                <div className='pdf-info-label'>ชื่อหลักสูตร</div>
                <div className='pdf-info-val'>{snapshot.name}</div>
              </div>
              <div className='pdf-info-box'>
                <div className='pdf-info-label'>สังกัดคณะ / วิทยาลัย</div>
                <div className='pdf-info-val'>{snapshot.faculty || '—'}</div>
              </div>
              <div className='pdf-info-box'>
                <div className='pdf-info-label'>ระดับการศึกษา</div>
                <div className='pdf-info-val'>{snapshot.level}</div>
              </div>
              <div className='pdf-info-box'>
                <div className='pdf-info-label'>ประเภทหลักสูตร</div>
                <div className='pdf-info-val'>{typeLabel}</div>
              </div>
            </div>

            <div className='pdf-sec'>2. ตัวชี้วัดทางการเงิน</div>
            <div className='pdf-kpi-row'>
              <div className='pdf-kpi'>
                <div className='pdf-kpi-label'>นิสิตจริง (Q)</div>
                <div className='pdf-kpi-val' style={{ color: '#5938e0' }}>
                  {fmtInt(result.q)}
                </div>
                <div className='pdf-kpi-unit'>คน</div>
              </div>
              <div className='pdf-kpi'>
                <div className='pdf-kpi-label'>Q* จุดคุ้มทุน</div>
                <div className='pdf-kpi-val' style={{ color: statusColor }}>
                  {result.qStar === null ? 'N/A' : fmtInt(result.qStar)}
                </div>
                <div className='pdf-kpi-unit'>คน</div>
              </div>
              <div className='pdf-kpi'>
                <div className='pdf-kpi-label'>รายได้/หัว (R)</div>
                <div className='pdf-kpi-val' style={{ color: '#6d4cff' }}>
                  {result.r === null ? '—' : fmtInt(r)}
                </div>
                <div className='pdf-kpi-unit'>บาท/คน</div>
              </div>
              <div className='pdf-kpi'>
                <div className='pdf-kpi-label'>CM/หัว</div>
                <div className='pdf-kpi-val' style={{ color: cm >= 0 ? '#3a8c00' : '#c2383c' }}>
                  {result.cm === null ? '—' : fmtInt(cm)}
                </div>
                <div className='pdf-kpi-unit'>บาท/คน</div>
              </div>
            </div>

            <div className='pdf-sec'>3. โครงสร้างต้นทุนและรายได้</div>
            <table className='pdf-table'>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>สัญลักษณ์</th>
                  <th>จำนวนเงิน (บาท)</th>
                  <th>ล้านบาท</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>รายได้รวม</td>
                  <td>TR</td>
                  <td className='bold navy'>{fmtInt(result.tr)}</td>
                  <td className='navy'>{fmtMillions(result.tr)}</td>
                </tr>
                <tr>
                  <td>ต้นทุนรวม</td>
                  <td>TC</td>
                  <td className='bold'>{fmtInt(result.tc)}</td>
                  <td>{fmtMillions(result.tc)}</td>
                </tr>
                <tr>
                  <td className='indent'>ต้นทุนคงที่รวม</td>
                  <td>TFC</td>
                  <td className='navy'>{fmtInt(result.tfc)}</td>
                  <td className='navy'>{fmtMillions(result.tfc)}</td>
                </tr>
                <tr>
                  <td className='indent'>ต้นทุนผันแปรรวม</td>
                  <td>TVC</td>
                  <td className='gold'>{fmtInt(result.tvc)}</td>
                  <td className='gold'>{fmtMillions(result.tvc)}</td>
                </tr>
                <tr>
                  <td className='indent'>ต้นทุนผันแปรต่อหน่วย</td>
                  <td>AVC</td>
                  <td className='gold'>{result.avc === null ? '—' : fmtInt(avc)}</td>
                  <td className='gold'>บ./คน</td>
                </tr>
                <tr className='row-cm'>
                  <td className='bold'>Contribution Margin/หน่วย</td>
                  <td>CM</td>
                  <td className='bold' style={{ color: cm >= 0 ? '#3a8c00' : '#c2383c' }}>
                    {result.cm === null ? '—' : fmtInt(cm)}
                  </td>
                  <td style={{ color: cm >= 0 ? '#3a8c00' : '#c2383c', fontWeight: 700 }}>บ./คน</td>
                </tr>
                <tr className={result.profit >= 0 ? 'row-profit-pos' : 'row-profit-neg'}>
                  <td className='bold'>ส่วนเกิน / ขาดทุน</td>
                  <td>π</td>
                  <td className='bold' style={{ color: profitColor }}>
                    {withSign(result.profit, fmtInt)}
                  </td>
                  <td style={{ color: profitColor, fontWeight: 700 }}>
                    {withSign(result.profit, fmtMillions)}
                    {result.profitPct === null ? '' : ` (${withSign(result.profitPct, value => `${fmtDec(value)}%`)})`}
                  </td>
                </tr>
                {result.qStar !== null && (
                  <>
                    <tr className='row-be'>
                      <td className='bold'>รายได้ ณ จุดคุ้มทุน</td>
                      <td>BE Rev</td>
                      <td className='bold'>{fmtInt(breakEvenRevenue)}</td>
                      <td>{fmtMillions(breakEvenRevenue)}</td>
                    </tr>
                    <tr className='row-be'>
                      <td className='bold'>Margin of Safety</td>
                      <td>MoS</td>
                      <td className={`bold ${marginOfSafety >= 0 ? 'green' : 'red'}`}>{fmtInt(marginOfSafety)}</td>
                      <td className={marginOfSafety >= 0 ? 'green' : 'red'}>{fmtMillions(marginOfSafety)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div className='pdf-sec'>4. การคำนวณจุดคุ้มทุน</div>
            {isFullCostRecovery ? (
              <div className='pdf-formula-box'>
                CM ≤ 0 (AVC สูงกว่า R) จึงใช้<b>สูตร 7 — Full-Cost Recovery</b> แทน · Q* = TC ÷ R = {fmtInt(result.tc)}{' '}
                ÷ {fmtInt(r)} <b>{result.qStar === null ? '' : `= ${fmtInt(result.qStar)} คน`}</b>{' '}
                ค่านี้เป็น&ldquo;เป้าหมายขั้นต่ำ&rdquo; ไม่ใช่จุดคุ้มทุนจริง
              </div>
            ) : (
              <div className='pdf-formula-box'>
                Q* = TFC ÷ (R − AVC) = {fmtInt(result.tfc)} ÷ ({fmtInt(r)} − {fmtInt(avc)}){' '}
                <b>{result.qStar === null ? '' : `= ${fmtInt(result.qStar)} คน`}</b>
              </div>
            )}
            <div className='pdf-formula-box'>
              π = (R − AVC) × Q − TFC = ({fmtInt(r)} − {fmtInt(avc)}) × {fmtInt(result.q)} − {fmtInt(result.tfc)} ={' '}
              <b style={{ color: profitColor }}>{withSign(result.profit, fmtInt)} บาท</b>
            </div>
            <div className='pdf-method-note'>
              คำนวณด้วยเครื่องคำนวณชุดเดียวกับทั้งระบบ (@beps/calc-engine) · ปัดเศษ Q* แบบ ceil · ตัวหารของกำไร %
              มาจากนโยบาย profit_pct_basis
            </div>

            <div className='pdf-footer-line'>
              <span>รายงานโดย MSU-BEPS · มหาวิทยาลัยมหาสารคาม · ปีการศึกษา {ACADEMIC_YEAR}</span>
              <span>หน้า 1 / 2</span>
            </div>
          </div>

          <div className='pdf-page'>
            {header}

            <div className='pdf-sec'>5. กราฟเส้นจุดคุ้มทุน (Break-Even Chart)</div>
            <div className='pdf-chart-frame'>
              <ReportBreakEvenSvg q={result.q} qStar={result.qStar} r={r} avc={avc} tfc={result.tfc} />
            </div>
            <div className='pdf-chart-caption'>
              จุดสีม่วง (●) = Q* จุดคุ้มทุน{result.qStar === null ? '' : ` = ${fmtInt(result.qStar)} คน`} · จุดสีทอง (●)
              = นิสิตจริง {fmtInt(result.q)} คน
            </div>

            <div className='pdf-sec'>6. ข้อเสนอแนะ</div>
            <div className='pdf-advice'>
              {isOk ? (
                <>
                  <b style={{ color: '#3a8c00' }}>✅ หลักสูตรผ่านเกณฑ์จุดคุ้มทุน</b>
                  <br />
                  มีนิสิตจริง <b>{fmtInt(result.q)} คน</b>
                  {result.qStar === null ? '' : ` เกินจุดคุ้มทุน ${fmtInt(result.qStar)} คน อยู่ `}
                  {result.qStar === null ? '' : <b>+{fmtInt(result.q - result.qStar)} คน</b>} · CM{' '}
                  <b>{fmtInt(cm)} บ./คน</b> · ส่วนเกิน <b>{fmtMillions(result.profit)} ล้านบาท</b>
                  <br />
                  แนะนำ:{' '}
                  {snapshot.isNewProgram
                    ? `สามารถเปิดหลักสูตรได้ตามแผน โดยรักษาจำนวนนิสิตไม่ต่ำกว่า ${
                        result.qStar === null ? '—' : fmtInt(result.qStar)
                      } คน`
                    : 'รักษาจำนวนนิสิตและโครงสร้างต้นทุนให้คงที่เพื่อความยั่งยืน และพิจารณานำส่วนเกินไปพัฒนาคุณภาพ'}
                </>
              ) : (
                <>
                  <b style={{ color: '#a67500' }}>⚠️ หลักสูตรยังไม่ถึงจุดคุ้มทุน</b>
                  <br />
                  มีนิสิตจริง <b>{fmtInt(result.q)} คน</b> ต้องเพิ่มอีก{' '}
                  <b>{result.qStar === null ? '—' : fmtInt(result.qStar - result.q)} คน</b> เพื่อให้ถึงจุดคุ้มทุน
                  <br />
                  แนะนำ:{' '}
                  {snapshot.isNewProgram
                    ? 'ควรทบทวนแผนรับนิสิต เพิ่มการประชาสัมพันธ์ หรือลดต้นทุนคงที่ก่อนเปิดหลักสูตร'
                    : 'ควรพิจารณาปรับโครงสร้างต้นทุน เพิ่มค่าธรรมเนียม หรือเพิ่มจำนวนนิสิตให้ถึงเกณฑ์ · หากพึ่งพางบแผ่นดินสูงควรวางแผนความยั่งยืน'}
                </>
              )}
            </div>

            <div className='pdf-sec'>7. ผู้รับรองรายงาน</div>
            <div className='pdf-sig-grid'>
              <div className='pdf-sig-box'>
                <div className='sig-title'>ผู้จัดทำ</div>
                <div>(...................................)</div>
                <div style={{ fontSize: 9, marginBlockStart: 4 }}>วันที่: {printedAt}</div>
              </div>
              <div className='pdf-sig-box'>
                <div className='sig-title'>ประธานหลักสูตร</div>
                <div>(...................................)</div>
                <div style={{ fontSize: 9, marginBlockStart: 4 }}>วันที่: .........................</div>
              </div>
              <div className='pdf-sig-box'>
                <div className='sig-title'>คณบดี / ผู้อำนวยการ</div>
                <div>(...................................)</div>
                <div style={{ fontSize: 9, marginBlockStart: 4 }}>วันที่: .........................</div>
              </div>
            </div>

            <div className='pdf-ref'>
              <b>อ้างอิงมาตรฐาน:</b> การวิเคราะห์จุดคุ้มทุนอ้างอิงตาม Horngren, Datar &amp; Rajan (2015)
              และหลักเกณฑ์กรมบัญชีกลาง (2566) ว่าด้วยการคำนวณต้นทุนต่อหน่วยผลผลิตของสถาบันอุดมศึกษา
            </div>

            <div className='pdf-footer-line'>
              <span>รายงานโดย MSU-BEPS · มหาวิทยาลัยมหาสารคาม · ปีการศึกษา {ACADEMIC_YEAR}</span>
              <span>หน้า 2 / 2</span>
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
        <Button variant='outlined' onClick={printReport} startIcon={<i className='ri-printer-line' />}>
          พิมพ์ / บันทึก PDF
        </Button>
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

/**
 * กราฟจุดคุ้มทุนในรายงาน — วาดเป็น SVG ไม่ใช่ Chart.js
 *
 * Chart.js วาดลง <canvas> ซึ่ง html2canvas ถ่ายไม่ติดเมื่ออยู่ในกล่องที่ถูก clone
 * และหน้าต่างพิมพ์ก็ได้แค่ผืนผ้าใบเปล่า — SVG เป็น markup ธรรมดาจึงไปได้ทั้งสองทาง
 * (mockup เลือกวิธีเดียวกัน)
 */
const ReportBreakEvenSvg = ({
  q,
  qStar,
  r,
  avc,
  tfc
}: {
  q: number
  qStar: number | null
  r: number
  avc: number
  tfc: number
}) => {
  const width = 640
  const height = 240
  const pad = 50
  const maxQ = Math.max(q * 1.4, qStar ? qStar * 1.6 : q * 2, 30)
  const maxY = Math.max(toMillions(maxQ * r) * 1.15, toMillions(tfc + avc * maxQ) * 1.15, 1)

  const sx = (value: number) => pad + (value / maxQ) * (width - pad * 2)
  const sy = (value: number) => height - pad - (value / maxY) * (height - pad * 2)

  const steps = 10
  const revenueLine: string[] = []
  const costLine: string[] = []

  for (let i = 0; i <= steps; i++) {
    const at = (i * maxQ) / steps

    revenueLine.push(`${sx(at).toFixed(1)},${sy(toMillions(at * r)).toFixed(1)}`)
    costLine.push(`${sx(at).toFixed(1)},${sy(toMillions(tfc + avc * at)).toFixed(1)}`)
  }

  const tfcY = sy(toMillions(tfc)).toFixed(1)

  return (
    <svg width={width} height={height} xmlns='http://www.w3.org/2000/svg' style={{ fontFamily: 'sans-serif' }}>
      <rect width={width} height={height} fill='#f8fafd' rx={8} />
      {[1, 2, 3, 4].map(i => (
        <line key={i} x1={pad} y1={sy((maxY * i) / 5)} x2={width - pad} y2={sy((maxY * i) / 5)} stroke='#e2e8f2' />
      ))}
      <line x1={pad} y1={tfcY} x2={width - pad} y2={tfcY} stroke='#56ca00' strokeWidth={1.5} strokeDasharray='6,4' />
      <text x={width - pad + 4} y={tfcY} fontSize={9} fill='#56ca00' dominantBaseline='middle'>
        TFC
      </text>
      <polyline points={costLine.join(' ')} fill='none' stroke='#ff4c51' strokeWidth={2} />
      <polyline points={revenueLine.join(' ')} fill='none' stroke='#6d4cff' strokeWidth={2.5} />
      {qStar !== null && qStar <= maxQ && (
        <>
          <line
            x1={sx(qStar)}
            y1={sy(toMillions(qStar * r))}
            x2={sx(qStar)}
            y2={height - pad}
            stroke='#5938e0'
            strokeDasharray='4,3'
          />
          <circle cx={sx(qStar)} cy={sy(toMillions(qStar * r))} r={5} fill='#5938e0' stroke='#fff' strokeWidth={1.5} />
          <text x={sx(qStar)} y={height - pad + 12} fontSize={9} fill='#5938e0' textAnchor='middle' fontWeight={700}>
            Q*={fmtInt(qStar)}
          </text>
        </>
      )}
      <circle cx={sx(q)} cy={sy(toMillions(q * r))} r={4} fill='#ffb400' stroke='#fff' strokeWidth={1.5} />
      <text x={sx(q)} y={sy(toMillions(q * r)) - 8} fontSize={9} fill='#b8860b' textAnchor='middle' fontWeight={700}>
        Q={fmtInt(q)}
      </text>
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke='#334155' strokeWidth={1.5} />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke='#334155' strokeWidth={1.5} />
      <text x={width / 2} y={height - 8} fontSize={9} fill='#6f6880' textAnchor='middle'>
        จำนวนนิสิต (คน)
      </text>
      <text
        x={12}
        y={height / 2}
        fontSize={9}
        fill='#6f6880'
        textAnchor='middle'
        transform={`rotate(-90,12,${height / 2})`}
      >
        ล้านบาท
      </text>
      <rect x={pad + 10} y={pad - 5} width={8} height={8} fill='#6d4cff' rx={1} />
      <text x={pad + 22} y={pad + 3} fontSize={9} fill='#334155'>
        TR
      </text>
      <rect x={pad + 50} y={pad - 5} width={8} height={8} fill='#ff4c51' rx={1} />
      <text x={pad + 62} y={pad + 3} fontSize={9} fill='#334155'>
        TC
      </text>
      <circle cx={pad + 96} cy={pad - 1} r={4} fill='#5938e0' />
      <text x={pad + 104} y={pad + 3} fontSize={9} fill='#334155'>
        Q*
      </text>
      <circle cx={pad + 130} cy={pad - 1} r={4} fill='#ffb400' />
      <text x={pad + 138} y={pad + 3} fontSize={9} fill='#334155'>
        Q จริง
      </text>
    </svg>
  )
}

export default ProgramReportDialog
