'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';

// Data Imports
import { RAW } from '@/data/mockup';

// อ้างอิง mockup/W17-master-data.html — ทะเบียนหน่วยงาน · งวดปีงบประมาณ · ประเภทนิสิต
// สามชุดนี้ถูกอ้างโดยทุกตารางที่เก็บตัวเลขในระบบ (org_unit_id · period_id · student_type)

type TabKey = 'org' | 'period' | 'stype';

// ---------- งวดปีงบประมาณ (dim_period) ----------
// ยังไม่มีตารางงวดจริงในชุดข้อมูล — งวดล่าสุดอ้างอิงปีการศึกษาของ RAW (ปีการศึกษา 2568) ส่วนที่เหลือ
// เป็นข้อมูลอ้างอิงตัวอย่างสำหรับสาธิตหน้าจอ (ยังไม่ผูกฐานข้อมูลจริง)
const PERIODS = [
  {
    fy: 2569,
    ay: 2569,
    start: '1 ต.ค. 2568',
    end: '30 ก.ย. 2569',
    snap: null as string | null,
    rule: 'ยังไม่กำหนด',
    state: 'เปิดอยู่' as const,
  },
  {
    fy: 2568,
    ay: 2568,
    start: '1 ต.ค. 2567',
    end: '30 ก.ย. 2568',
    snap: '30 มิ.ย. 2569',
    rule: 'สถานะกำลังศึกษา · ลาพักไม่นับ',
    state: 'ปิดงวดแล้ว' as const,
  },
  {
    fy: 2567,
    ay: 2567,
    start: '1 ต.ค. 2566',
    end: '30 ก.ย. 2567',
    snap: '30 มิ.ย. 2568',
    rule: 'สถานะกำลังศึกษา · ลาพักไม่นับ',
    state: 'ปิดงวดแล้ว' as const,
  },
];

// ---------- ประเภทนิสิต (student_type) ----------
// เก็บ "สัดส่วน" แล้วกระจายจากจำนวนนิสิตจริง RAW.UNI.Q ด้วยวิธี largest-remainder
// เพื่อให้ยอดรวมตรงกับจำนวนนิสิตของงวดเสมอ ไม่ว่าจะโหลดชุดข้อมูลใด (ดูตรรกะเดียวกันใน mockup/assets/master-data.js)
const STUDENT_TYPE_DEFS = [
  { code: 'REG-TH', grp: 'ภาคปกติ', nat: 'ไทย' as const, share: 0.9078, note: 'ประเภทหลัก' },
  { code: 'REG-INT', grp: 'ภาคปกติ', nat: 'ต่างชาติ' as const, share: 0.0126, note: 'ค่าธรรมเนียมคนละอัตรากับนิสิตไทย' },
  { code: 'SPC-TH', grp: 'ภาคพิเศษ', nat: 'ไทย' as const, share: 0.078, note: 'ส่วนใหญ่เป็นบัณฑิตศึกษา' },
  { code: 'SPC-INT', grp: 'ภาคพิเศษ', nat: 'ต่างชาติ' as const, share: 0.0016, note: '' },
];

const buildStudentTypes = (total: number) => {
  const raw = STUDENT_TYPE_DEFS.map((d) => ({ ...d, exact: total * d.share, n: 0 }));

  raw.forEach((d) => {
    d.n = Math.floor(d.exact);
  });
  let left = total - raw.reduce((a, d) => a + d.n, 0);

  [...raw]
    .sort((a, b) => b.exact - b.n - (a.exact - a.n))
    .forEach((d) => {
      if (left-- > 0) d.n += 1;
    });

  return raw;
};

const fmtN = (n: number) => Math.round(n).toLocaleString('th-TH');

const MasterDataView = () => {
  const [tab, setTab] = useState<TabKey>('org');
  const [toast, setToast] = useState<string | null>(null);

  const studentTypes = useMemo(() => buildStudentTypes(RAW.UNI.Q), []);
  const studentTypeSum = studentTypes.reduce((a, s) => a + s.n, 0);

  const facultyCount = RAW.FACS.length;

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          ข้อมูลหลักสามชุดนี้ถูกอ้างโดยทุกตารางที่เก็บตัวเลขในระบบ — ถ้าตั้งผิดหรือเปลี่ยนย้อนหลัง ตัวเลขทั้งระบบจะเปลี่ยนตาม ·
          ส่วนทะเบียนหลักสูตรอยู่ที่ <Link href="/programs">หน้าโปรแกรม</Link>
        </Alert>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ px: 4 }}>
            <Tab value="org" label="🏛 โครงสร้างหน่วยงาน" />
            <Tab value="period" label="📅 งวดปีงบประมาณ" />
            <Tab value="stype" label="👥 ประเภทนิสิต" />
          </Tabs>

          <CardContent>
            {tab === 'org' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="h6" gutterBottom>
                    ทะเบียนหน่วยงาน 3 ระดับ
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    มหาวิทยาลัย → คณะ/วิทยาลัย → ระดับการศึกษา — ใช้ระดับการศึกษาแทนภาควิชา เพราะชุดข้อมูลต้นฉบับไม่มีคอลัมน์ภาควิชา
                    และตรงกับวิธีที่ปันส่วนต้นทุนสำนักงานเลขานุการอยู่แล้ว
                  </Typography>

                  <Box display="flex" gap={4} flexWrap="wrap" mb={4}>
                    <Chip label={`${facultyCount} คณะ/วิทยาลัย ในทะเบียน`} color="primary" variant="tonal" />
                    <Chip label="จัดการทะเบียนหน่วยงานแบบเต็มที่หน้าจัดการหน่วยงาน" variant="outlined" />
                  </Box>

                  <Button component={Link} href="/admin/university/units" variant="contained">
                    ไปที่หน้าจัดการหน่วยงาน →
                  </Button>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Alert severity="warning">
                    <b>หลักสูตรผูกที่ระดับการศึกษา ไม่ใช่ระดับคณะ</b> — เพราะต้นทุนสำนักงานเลขานุการปันแยกตรี/บัณฑิตศึกษา
                    การแก้ไข/เพิ่มหน่วยงานทำได้ที่หน้า <code>/admin/university/units</code> เพื่อไม่ให้ทะเบียนซ้ำกันสองที่
                  </Alert>
                </Grid>
              </Grid>
            )}

            {tab === 'period' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
                    <Typography variant="h6">งวดปีงบประมาณ</Typography>
                    <Button size="small" variant="contained" onClick={() => setToast('ฟีเจอร์เพิ่มงวดใหม่ยังไม่เชื่อมต่อระบบจริง')}>
                      + เพิ่มงวด
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ปีงบ</TableCell>
                          <TableCell>ปีการศึกษา</TableCell>
                          <TableCell>ช่วงงวด</TableCell>
                          <TableCell>วันตัดยอดนิสิต</TableCell>
                          <TableCell>สถานะนิสิตที่นับ</TableCell>
                          <TableCell>สถานะ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {PERIODS.map((p) => (
                          <TableRow key={p.fy}>
                            <TableCell>
                              <Typography fontWeight={700} color="primary">
                                {p.fy}
                              </Typography>
                            </TableCell>
                            <TableCell>{p.ay}</TableCell>
                            <TableCell>
                              {p.start} – {p.end}
                            </TableCell>
                            <TableCell>
                              {p.snap ?? <Typography color="error.main">ยังไม่กำหนด</Typography>}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {p.rule}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={p.state}
                                size="small"
                                color={p.state === 'ปิดงวดแล้ว' ? 'success' : 'info'}
                                variant="tonal"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Alert severity="error" sx={{ mb: 3 }}>
                    <b>ปีงบประมาณ ≠ ปีการศึกษา</b> — ต้นทุนมาเป็นปีงบประมาณ (ต.ค.–ก.ย.) แต่จำนวนนิสิตและค่าธรรมเนียมเป็นปีการศึกษา
                    ทุกงวดต้องระบุทั้งสองค่า
                  </Alert>
                  <Alert severity="warning">
                    <b>วันตัดยอดนิสิตล็อกติดกับรอบคำนวณ</b> — Q เป็นตัวหารของทั้ง R และ AVC ตัดยอดคนละวันทำให้ Q* เปลี่ยนทั้งระบบ
                  </Alert>
                </Grid>
              </Grid>
            )}

            {tab === 'stype' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
                    <Typography variant="h6">ประเภทนิสิต</Typography>
                    <Button size="small" variant="contained" onClick={() => setToast('ฟีเจอร์เพิ่มประเภทนิสิตยังไม่เชื่อมต่อระบบจริง')}>
                      + เพิ่มประเภท
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>รหัส</TableCell>
                          <TableCell>ภาค</TableCell>
                          <TableCell>สัญชาติ</TableCell>
                          <TableCell align="right">นิสิต</TableCell>
                          <TableCell>หมายเหตุ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentTypes.map((s) => (
                          <TableRow key={s.code}>
                            <TableCell>
                              <code>{s.code}</code>
                            </TableCell>
                            <TableCell>{s.grp}</TableCell>
                            <TableCell>
                              <Chip label={s.nat} size="small" color={s.nat === 'ไทย' ? 'primary' : 'success'} variant="tonal" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700}>{fmtN(s.n)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {s.note || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3}>
                            <b>รวม</b>
                          </TableCell>
                          <TableCell align="right">
                            <b>{fmtN(studentTypeSum)}</b>
                          </TableCell>
                          <TableCell>
                            {studentTypeSum === RAW.UNI.Q ? (
                              <Typography variant="caption" color="success.main">
                                ✓ ตรงกับยอดนิสิตรวมของงวด ({fmtN(RAW.UNI.Q)} คน)
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="error.main">
                                ✕ ต่างจากยอดนิสิตรวม {fmtN(Math.abs(studentTypeSum - RAW.UNI.Q))} คน
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <b>อัตราค่าธรรมเนียม</b> — หลักสูตรเดียวกันมีได้หลายอัตราตามประเภทนิสิต เช่น หลักสูตรนานาชาติคิดนิสิตไทยและ
                    ต่างชาติคนละอัตรา
                  </Alert>
                  <Alert severity="warning">
                    <b>ห้ามเพิ่มประเภทนิสิตย้อนหลังในงวดที่ปิดแล้ว</b> — ยอดรวมนิสิตของงวดจะไม่ตรงกับที่เคยคำนวณ
                  </Alert>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Grid>
  );
};

export default MasterDataView;
