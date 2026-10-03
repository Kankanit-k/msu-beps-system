import type { ReactNode } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

// Data Imports
import { RAW } from '@/data/mockup';

// Calc Engine Imports — สูตร 1–5, 7 ผ่าน calc-engine แทนการคำนวณเองซ้ำ
import { calcBreakEvenBothModes } from '@beps/calc-engine';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  (v / 1_000_000).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;

interface FormulaCardProps {
  title: string;
  eq: string;
  eqColor?: 'default' | 'gold';
  children: ReactNode;
}

const FormulaCard = ({ title, eq, eqColor = 'default', children }: FormulaCardProps) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Box
        sx={{
          fontFamily: 'monospace',
          fontSize: 15,
          fontWeight: 700,
          textAlign: 'center',
          py: 3,
          my: 2,
          borderRadius: 2,
          bgcolor: eqColor === 'gold' ? 'warning.lightOpacity' : 'primary.lightOpacity',
          color: eqColor === 'gold' ? 'warning.main' : 'primary.main',
        }}
      >
        {eq}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </CardContent>
  </Card>
);

const VAR_DEFS = (bothModes: ReturnType<typeof calcBreakEvenBothModes>) => [
  {
    sym: 'Q / Q*',
    name: 'จำนวนนิสิตจริง / จำนวนนิสิต ณ จุดคุ้มทุน · จำนวนนิสิต (Q) = ลงทะเบียนจริง, จุดคุ้มทุน (Q*) = ต้นทุนคงที่ ÷ (รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว)',
    unit: 'คน',
    value: `รวม ${fmtN(RAW.UNI.Q)} คน`,
  },
  {
    sym: 'TR',
    name: 'รายได้รวม = รายได้ต่อหัว × จำนวนนิสิต (Total Revenue) · งบแผ่นดิน + งบเงินรายได้ (ค่าธรรมเนียม)',
    unit: 'บาท',
    value: `${fmtM(bothModes.with_government.tr)} ล้านบาท`,
  },
  {
    sym: 'TC',
    name: 'ต้นทุนรวม = ต้นทุนคงที่ + ต้นทุนผันแปร (Total Cost) · ต้นทุนทางตรงและทางอ้อมที่ปันส่วนมา',
    unit: 'บาท',
    value: `${fmtM(RAW.UNI.TC)} ล้านบาท`,
  },
  {
    sym: 'TFC',
    name: 'ต้นทุนคงที่รวม · เงินเดือน ค่าเสื่อมราคา ปันส่วนสำนักงานเลขานุการ',
    unit: 'บาท',
    value: `${fmtM(RAW.UNI.TFC)} ล้าน (${pct(RAW.UNI.TFC, RAW.UNI.TC)})`,
  },
  {
    sym: 'TVC / AVC',
    name: 'ต้นทุนผันแปรรวม / ต้นทุนผันแปรต่อหัว · ต่อหัว = ต้นทุนผันแปรรวม ÷ จำนวนนิสิต',
    unit: 'บาท / บาท/คน',
    value: `${fmtM(RAW.UNI.TVC)} ล้าน (${pct(RAW.UNI.TVC, RAW.UNI.TC)})`,
  },
  {
    sym: 'R',
    name: 'รายได้ต่อหัว = รายได้รวม ÷ จำนวนนิสิต (Revenue per Student)',
    unit: 'บาท/คน',
    value: `${fmtN(bothModes.with_government.r ?? 0)} บ. (เฉลี่ย)`,
  },
  {
    sym: 'π',
    name: 'กำไร/ขาดทุน · มากกว่า 0 = ส่วนเกิน, เท่ากับ 0 = จุดคุ้มทุน (BEP), น้อยกว่า 0 = ขาดทุน',
    unit: 'บาท',
    value: `${bothModes.with_government.profit >= 0 ? '+' : '−'}${fmtM(Math.abs(bothModes.with_government.profit))} ล้านบาท`,
  },
];

const TFC_TAGS = [
  '100 เงินเดือน',
  '210 ค่าจ้างประจำ',
  '220 ค่าจ้างชั่วคราว',
  '230 ค่าตอบแทน พรก.',
  '300 ค่าตอบแทน',
  '400 ค่าใช้สอย',
  '500 ค่าวัสดุ',
  '600 ค่าครุภัณฑ์',
  '800 เงินอุดหนุน',
  '900 รายจ่ายอื่น',
  '+ ค่าเสื่อมราคา',
];

const TVC_TAGS = [
  '300 ค่าตอบแทน',
  '400 ค่าใช้สอย',
  '410 ค่าสาธารณูปโภค',
  '500 ค่าวัสดุ',
  '800 เงินอุดหนุน',
  '900 รายจ่ายอื่น',
  '×Q ศึกษาทั่วไป',
  '×Q ค่าธรรมเนียมรายการหลัก',
  '×Q หักสมทบมหาวิทยาลัย',
];

const REFS = [
  'Horngren, C. T., Datar, S. M., & Rajan, M. V. (2015). Cost accounting: A managerial emphasis (15th ed.). Pearson Education.',
  'Drury, C. (2018). Management and cost accounting (10th ed.). Cengage Learning EMEA.',
  'Garrison, R. H., Noreen, E. W., & Brewer, P. C. (2021). Managerial accounting (17th ed.). McGraw-Hill Education.',
  'Johnes, G., & Johnes, J. (Eds.). (2004). International handbook on the economics of education. Edward Elgar Publishing.',
  'กรมบัญชีกลาง. (2566). หลักเกณฑ์การคำนวณต้นทุนต่อหน่วยผลผลิตของส่วนราชการ. กระทรวงการคลัง.',
  'สำนักงานคณะกรรมการการอุดมศึกษา. (2565). แนวทางการวิเคราะห์ต้นทุนและการจัดทำงบประมาณของสถาบันอุดมศึกษา. กระทรวง อว.',
  'มหาวิทยาลัยมหาสารคาม. (2568). รายงานต้นทุนต่อหน่วยผลผลิตและการวิเคราะห์จุดคุ้มทุน. กองแผนงาน มมส.',
  'Worthington, A. C., & Higgs, H. (2011). Economies of scale and scope in Australian higher education. Higher Education, 61(4), 387–414.',
  'Vanderbei, R. J. (2020). Linear programming: Foundations and extensions (5th ed.). Springer.',
];

const MethodView = () => {
  // สูตร 5a/5b — ฐานรายได้ 2 กรณี คำนวณจากยอดระดับมหาวิทยาลัยด้วย calc-engine จริง
  const bothModes = calcBreakEvenBothModes({
    q: RAW.UNI.Q,
    governmentBudget: RAW.UNI.st,
    incomeBudget: RAW.UNI.own,
    tfc: RAW.UNI.TFC,
    tvc: RAW.UNI.TVC,
  });
  const varDefs = VAR_DEFS(bothModes);

  return (
    <Grid container spacing={6}>
      <Grid size={12}>
        <Typography variant="h4" gutterBottom>
          📐 สูตรและหลักวิชาการจุดคุ้มทุน (Break-Even Analysis)
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormulaCard title="📌 สูตรที่ 1 — จุดคุ้มทุน" eq="Q* = TFC / ( R − AVC )">
          จุดคุ้มทุน (BEP) คือจำนวนนิสิตขั้นต่ำ (Q*) ที่ทำให้รายได้รวม (TR) เท่ากับต้นทุนรวม (TC)
          พอดี (กำไร/ขาดทุน = 0) ส่วนต่างระหว่างรายได้ต่อหัว (R) กับต้นทุนผันแปรต่อหัว (AVC) คือ{' '}
          <strong>กำไรส่วนเกินต่อหัว (CM)</strong> — รายได้ต่อหัวที่เหลือไว้ชดเชยต้นทุนคงที่ (TFC)
          ยิ่งส่วนเกินต่อหัวสูง จุดคุ้มทุนยิ่งต่ำ
        </FormulaCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormulaCard title="📌 สูตรที่ 2 — ต้นทุนรวม" eq="TC = TFC + ( AVC × Q )">
          ต้นทุนรวมมี 2 ส่วน คือ ต้นทุนคงที่ (TFC) ซึ่งไม่เปลี่ยนตามจำนวนนิสิต และต้นทุนผันแปร (TVC)
          = ต้นทุนผันแปรต่อหัว × จำนวนนิสิต (แปรผันตามจำนวนนิสิต) มมส. มีสัดส่วนต้นทุนคงที่สูงถึง{' '}
          <strong>{pct(RAW.UNI.TFC, RAW.UNI.TC)}</strong> ทำให้ต้นทุนรวมต่อหัว (ATC)
          ลดลงเมื่อนิสิตเพิ่ม (<strong>การประหยัดจากขนาด (Economies of Scale)</strong>)
        </FormulaCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormulaCard title="📌 สูตรที่ 3 — กำไร / ขาดทุน" eq="π = TR − TC = (R − AVC) × Q − TFC">
          กำไร/ขาดทุน (π): เมื่อนิสิตเกินจุดคุ้มทุน (Q &gt; Q*)
          กำไรเพิ่มขึ้นคนละเท่ากับกำไรส่วนเกินต่อหัว (CM) · เมื่อนิสิตไม่ถึงจุดคุ้มทุน (Q &lt; Q*)
          จะขาดทุน
        </FormulaCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormulaCard title="📌 สูตรที่ 4 — รายได้ ณ จุดคุ้มทุน" eq="BE Revenue = Q* × R">
          รายได้ขั้นต่ำเพื่อไม่ขาดทุน ใช้วางแผนงบประมาณและกำหนดเป้ารับนิสิต ·{' '}
          <strong>ส่วนเผื่อความปลอดภัย (Margin of Safety)</strong> = รายได้รวมจริง − รายได้ ณ
          จุดคุ้มทุน — ยิ่งกว้างยิ่งมั่นคง
        </FormulaCard>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              📌 สูตรที่ 5 — ฐานรายได้ 2 กรณี (ตามไฟล์ต้นฉบับ)
            </Typography>
            <Grid container spacing={4} sx={{ my: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textAlign: 'center',
                    py: 3,
                    borderRadius: 2,
                    bgcolor: 'primary.lightOpacity',
                    color: 'primary.main',
                  }}
                >
                  R รวมแผ่นดิน = (งบแผ่นดิน + งบเงินรายได้) / Q
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textAlign: 'center',
                    py: 3,
                    borderRadius: 2,
                    bgcolor: 'warning.lightOpacity',
                    color: 'warning.main',
                  }}
                >
                  R ไม่รวมแผ่นดิน = งบเงินรายได้ / Q
                </Box>
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              แยกวิเคราะห์ 2 กรณีเพราะงบประมาณเงินแผ่นดินเป็น<strong>เงินอุดหนุนจากรัฐ</strong>{' '}
              ไม่ใช่รายได้ที่มหาวิทยาลัย หามาเอง
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>รวมเงินแผ่นดิน</strong> — สะท้อนสถานะการเงินตามจริง (งบที่ได้รับทั้งหมด) ·{' '}
              <strong>ไม่รวมเงินแผ่นดิน</strong> — สะท้อนความสามารถพึ่งพาตนเอง
              หากถูกตัดงบอุดหนุนจะอยู่รอดหรือไม่ · รายได้ต่อหัวจริงของ มมส. ปีนี้: รวมแผ่นดิน{' '}
              {fmtN(bothModes.with_government.r ?? 0)} บ./คน · ไม่รวมแผ่นดิน{' '}
              {fmtN(bothModes.without_government.r ?? 0)} บ./คน
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ต้นทุน (ต้นทุนคงที่ ต้นทุนผันแปร และต้นทุนผันแปรต่อหัว) เท่ากันทั้ง 2 กรณี —
              เปลี่ยนเฉพาะฝั่งรายได้ ทำให้กำไรส่วนเกินต่อหัว (CM) และจุดคุ้มทุน (Q*) ต่างกัน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              📌 สูตรที่ 6 — จุดคุ้มทุนระดับคณะ (2 วิธี)
            </Typography>
            <Box
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                textAlign: 'center',
                py: 3,
                my: 2,
                borderRadius: 2,
                bgcolor: 'primary.lightOpacity',
                color: 'primary.main',
              }}
            >
              วิธีหลัก: Q*คณะ = Σ Q*หลักสูตร i
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>วิธีผลรวมรายหลักสูตร (ค่าหลัก)</strong> — หาจุดคุ้มทุน (Q*)
              ของแต่ละหลักสูตรก่อน แล้วนำมาบวกกัน แต่ละหลักสูตร ต้องคุ้มต้นทุนคงที่ของตัวเอง
              ชดเชยข้ามหลักสูตรไม่ได้ → เข้มงวดและตรงกับการบริหารจริง
            </Typography>
            <Typography variant="body2" color="text.disabled">
              <strong>วิธีเทียบ (คำนวณจากยอดรวม)</strong> Q* = TFCคณะ / (R − AVC) ใช้ยอดรวมทั้งคณะ
              ยอมให้หลักสูตรกำไรอุ้มหลักสูตรขาดทุน → ได้จุดคุ้มทุนต่ำกว่าจริง
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              📌 สูตรที่ 7 — กรณีรายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (CM ≤ 0)
            </Typography>
            <Box
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                textAlign: 'center',
                py: 3,
                my: 2,
                borderRadius: 2,
                bgcolor: 'warning.lightOpacity',
                color: 'warning.main',
              }}
            >
              ถ้า (R − AVC) ≤ 0 → Q* = TC / R
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              เมื่อต้นทุนผันแปรต่อหัวสูงกว่าค่าเทอมต่อหัว (AVC &gt; R) ตัวส่วนของสูตรมาตรฐานจะติดลบ
              ได้จุดคุ้มทุนติดลบซึ่งไม่มีความหมาย จึงใช้หลัก{' '}
              <strong>การคืนทุนเต็มจำนวน (Full-Cost Recovery)</strong> —
              หาว่าต้องรับนิสิตกี่คนค่าเทอมรวมจึงครอบคลุมต้นทุน ทั้งหมด
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>ตัวอย่าง</strong> — เคมี (คณะวิทยาศาสตร์): ต้นทุนรวม ≈ 2.16 ล้านบาท · ค่าเทอม
              ≈ 93,000 บ./คน → Q* = 2,163,604 / 93,311 ≈ <strong>23 คน</strong>
            </Typography>
            <Alert severity="warning" sx={{ mt: 1 }}>
              ค่าที่ได้เป็นเป้าหมายขั้นต่ำ ไม่ใช่จุดคุ้มทุนจริง —
              ทางแก้ที่ยั่งยืนคือลดต้นทุนผันแปรต่อหัว หรือขึ้นค่าธรรมเนียม
            </Alert>
            <Alert severity="info" sx={{ mt: 2 }}>
              ตัวเลขจริงปีงบ 2568 ในหน้ารายงาน<strong>ยึดตามไฟล์ Excel</strong> ซึ่งไม่ใช้สูตรนี้ —
              หลักสูตรที่ R ≤ AVC จึงแสดงจุดคุ้มทุนติดลบตามไฟล์ (ป้าย &ldquo;รายได้/หัว ≤
              ผันแปร/หัว&rdquo;) และถูกบวกรวมเข้าระดับคณะเหมือนไฟล์ · สูตรนี้ใช้ในหน้าจำลองสถานการณ์
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardHeader
            title="📖 คำนิยามตัวแปรในสูตร"
            subheader="ตัวเลขคอลัมน์ขวาสุดคำนวณสดจากข้อมูลระดับมหาวิทยาลัยที่โหลดอยู่"
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>สัญลักษณ์</TableCell>
                  <TableCell>ชื่อและความหมาย</TableCell>
                  <TableCell>หน่วย</TableCell>
                  <TableCell>มมส. (ข้อมูลอัพเดท)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {varDefs.map((row) => (
                  <TableRow key={row.sym}>
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={700}>
                        {row.sym}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{row.value}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardHeader title="🗂️ การจำแนกประเภทต้นทุน (Cost Classification)" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              ตามหมวดรายจ่ายในไฟล์ต้นฉบับ · สัดส่วนจริง ต้นทุนคงที่ : ต้นทุนผันแปร ={' '}
              <strong>
                {pct(RAW.UNI.TFC, RAW.UNI.TC)} : {pct(RAW.UNI.TVC, RAW.UNI.TC)}
              </strong>
            </Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" fontWeight={700} color="primary.main" gutterBottom>
                  ต้นทุนคงที่ (TFC) — ไม่แปรผันตามนิสิต
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {TFC_TAGS.map((t) => (
                    <Chip key={t} size="small" variant="outlined" label={t} />
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" fontWeight={700} color="warning.main" gutterBottom>
                  ต้นทุนผันแปร (TVC) — แปรผันตามนิสิต
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {TVC_TAGS.map((t) => (
                    <Chip key={t} size="small" variant="outlined" color="warning" label={t} />
                  ))}
                </Stack>
              </Grid>
            </Grid>
            <Alert severity="warning" sx={{ mt: 4 }}>
              ต้นทุนผันแปร (TVC) ในไฟล์ใหม่รวม <strong>ค่าธรรมเนียมรายการหลัก</strong> และ{' '}
              <strong>หักสมทบมหาวิทยาลัย (2,235 บ./คน/เทอม)</strong> ซึ่งคิดตามรายหัวนิสิต
              จึงทำให้สัดส่วนต้นทุนผันแปรสูงกว่าการคำนวณแบบเดิม
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardHeader title='📌 หมายเหตุ: ลำดับชั้นการวิเคราะห์ & "ภาควิชา"' />
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ระบบรวมข้อมูลจากล่างขึ้นบน: <strong>หลักสูตร (230)</strong> →{' '}
              <strong>ระดับการศึกษาในแต่ละคณะ (ปริญญาตรี / บัณฑิตศึกษา)</strong> →{' '}
              <strong>คณะ (20)</strong> → <strong>มหาวิทยาลัย</strong> ทุกตัวเลขระดับบนคือผลรวมของ
              หน่วยย่อย ส่วนรายได้ต่อหัว (R) และต้นทุนผันแปรต่อหัว (AVC)
              คำนวณใหม่จากยอดรวมของหน่วยนั้น ยกเว้นจุดคุ้มทุน (Q*) ที่เป็นผลบวก Q*
              ของหลักสูตรข้างใต้ตามวิธีหลัก (ตรงกับแถวผลรวมใน Excel)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ชุดข้อมูลนี้ไม่มีคอลัมน์ &ldquo;ภาควิชา&rdquo; โดยตรง ระบบจึงใช้{' '}
              <strong>ระดับการศึกษา</strong> เป็นชั้นกลาง แทน ซึ่งตรงกับวิธีที่ Excel
              ปันส่วนต้นทุนสำนักงานเลขานุการ (แยกระดับปริญญาตรี / บัณฑิตศึกษา) — หากมีตาราง
              จับคู่หลักสูตร→ภาควิชาจริง สามารถสลับชั้นกลางได้ทันที
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardHeader title="📚 เอกสารอ้างอิง (APA 7th Edition)" />
          <CardContent>
            <Stack spacing={2}>
              {REFS.map((r, i) => (
                <Typography key={r} variant="body2" color="text.secondary">
                  [{i + 1}] {r}
                </Typography>
              ))}
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 4 }}>
              แหล่งข้อมูล: ไฟล์ &ldquo;20260711_จุดคุ้มทุน update.xlsx&rdquo; — ชีต 1.รายได้ และ
              2.ค่าใช้จ่าย · ปรับปรุงจากแอปวิเคราะห์จุดคุ้มทุนรุ่นก่อน
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MethodView;
