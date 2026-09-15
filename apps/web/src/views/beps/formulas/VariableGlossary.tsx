'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

// Type Imports
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

// Theme Imports
import { headingFontFamily } from '@core/theme/fonts'

// Context Imports
import { revenueModeNote, useBeps } from '@/contexts/BepsContext'

// Util Imports
import { fmtDec, fmtInt, fmtMillions, withSign } from '@/utils/beps-format'

/**
 * ตารางนิยามตัวแปร พร้อมค่าจริงระดับมหาวิทยาลัย
 *
 * mockup เติมค่าลงตารางด้วย document.querySelectorAll ท้ายไฟล์ W10-method.html และตรึงไว้ที่
 * ฐาน "รวมเงินแผ่นดิน" เพราะหน้านี้ซ่อนปุ่มสลับฐาน (buildShell ... bm:false) — ที่นี่ปุ่มอยู่บน
 * navbar ตลอดเวลา ตารางจึงต้องขยับตามฐานที่เลือก ไม่งั้นผู้ใช้จะเห็นเลขค้างที่ไม่ตรงกับปุ่ม
 */

type Props = {
  /** ผลคำนวณระดับมหาวิทยาลัยทั้ง 2 ฐานรายได้ — คำนวณฝั่ง server ด้วย calc-engine */
  byMode: Record<RevenueMode, BreakEvenResult>
  fixedCostShare: number
  variableCostShare: number
}

/** ช่องแรกของแถว — สัญลักษณ์ในสูตร ใช้ฟอนต์หัวเรื่องให้อ่านเป็นสูตรคณิตศาสตร์ */
const SymbolCell = ({ children }: { children: string }) => (
  <TableCell
    sx={{
      fontFamily: headingFontFamily,
      fontWeight: 700,
      color: 'primary.main',
      whiteSpace: 'nowrap',
      verticalAlign: 'top'
    }}
  >
    {children}
  </TableCell>
)

const VariableGlossary = ({ byMode, fixedCostShare, variableCostShare }: Props) => {
  const { revenueMode } = useBeps()
  const u = byMode[revenueMode]

  const rows: { symbol: string; meaning: string; unit: string; value: string }[] = [
    {
      symbol: 'Q / Q*',
      meaning: 'จำนวนนิสิตจริง / ณ จุดคุ้มทุน · Q = ลงทะเบียนจริง, Q* = TFC ÷ (R − AVC)',
      unit: 'คน',
      value: `รวม ${fmtInt(u.q)} คน · Q* ${u.qStar === null ? '—' : `${fmtInt(u.qStar)} คน`}`
    },
    {
      symbol: 'TR',
      meaning: 'รายได้รวม (Total Revenue = R × Q) · งบแผ่นดิน + งบเงินรายได้ (ค่าธรรมเนียม)',
      unit: 'บาท',
      value: `${fmtMillions(u.tr)} ล้านบาท`
    },
    {
      symbol: 'TC',
      meaning: 'ต้นทุนรวม (Total Cost = TFC + TVC) · ต้นทุนทางตรงและทางอ้อมที่ปันส่วนมา',
      unit: 'บาท',
      value: `${fmtMillions(u.tc)} ล้านบาท`
    },
    {
      symbol: 'TFC',
      meaning: 'ต้นทุนคงที่รวม · เงินเดือน ค่าเสื่อมราคา ปันส่วนสำนักงานเลขานุการ',
      unit: 'บาท',
      value: `${fmtMillions(u.tfc)} ล้าน (${fmtDec(fixedCostShare)}%)`
    },
    {
      symbol: 'TVC / AVC',
      meaning: 'ต้นทุนผันแปร / ต่อหน่วย · AVC = TVC ÷ Q',
      unit: 'บาท / บาท/คน',
      value: `${fmtMillions(u.tvc)} ล้าน (${fmtDec(variableCostShare)}%) · AVC ${
        u.avc === null ? '—' : `${fmtInt(u.avc)} บ./คน`
      }`
    },
    {
      symbol: 'R',
      meaning: 'รายได้ต่อหน่วย (Revenue per Student = TR ÷ Q)',
      unit: 'บาท/คน',
      value: u.r === null ? '—' : `${fmtInt(u.r)} บ. (เฉลี่ย)`
    },
    {
      symbol: 'π',
      meaning: 'กำไร/ขาดทุน · π > 0 = ส่วนเกิน, π = 0 = BEP, π < 0 = ขาดทุน',
      unit: 'บาท',
      value: `${withSign(u.profit, fmtMillions)} ล้านบาท`
    }
  ]

  return (
    <Card>
      <CardHeader avatar={<i className='ri-book-open-line' />} title='คำนิยามตัวแปรในสูตร' />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>สัญลักษณ์</TableCell>
                <TableCell>ชื่อและความหมาย</TableCell>
                <TableCell>หน่วย</TableCell>
                <TableCell>มมส. (ชุดข้อมูลที่โหลดอยู่)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.symbol}>
                  <SymbolCell>{row.symbol}</SymbolCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.meaning}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{row.unit}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box className='mbs-4'>
          <Typography variant='caption' color='text.disabled'>
            {revenueModeNote(revenueMode)} — สลับฐานได้ที่แถบเครื่องมือด้านบน (TFC · TVC · AVC เท่ากันทั้ง 2 ฐาน)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default VariableGlossary
