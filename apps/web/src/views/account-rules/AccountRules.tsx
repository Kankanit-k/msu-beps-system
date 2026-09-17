'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

// Data Imports
import { RAW } from '@/data/mockup';
import { ACCOUNTS, BEH, METHOD, ruleAt, type Behavior } from './data';

const YEARS = [2568, 2569, 2570, 2571, 2572];
const BEH_FILTERS: Array<'all' | Behavior> = ['all', 'MIXED', 'UNCLASSIFIED'];
const BEH_FILTER_LABEL: Record<'all' | Behavior, string> = {
  all: 'ทั้งหมด',
  TFC: 'คงที่',
  TVC: 'ผันแปร',
  MIXED: 'แบ่งสัดส่วน',
  UNCLASSIFIED: 'ยังไม่จำแนก',
};

const fmtM = (n: number) => (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 });
const fmtN = (n: number) => n.toLocaleString('th-TH');

const AccountRules = () => {
  const [year, setYear] = useState(2568);
  const [fBeh, setFBeh] = useState<'all' | Behavior>('all');
  const [sel, setSel] = useState(0);

  const rows = useMemo(
    () =>
      ACCOUNTS.map((a, i) => ({ a, i, r: ruleAt(a, year) }))
        .filter(x => x.r)
        .filter(x => fBeh === 'all' || x.r?.beh === fBeh),
    [year, fBeh]
  );

  const withRule = useMemo(() => ACCOUNTS.filter(a => ruleAt(a, year)), [year]);
  const unclassified = useMemo(() => withRule.filter(a => ruleAt(a, year)?.beh === 'UNCLASSIFIED'), [withRule, year]);

  const account = ACCOUNTS[sel] ?? ACCOUNTS[0]!;
  const rule = ruleAt(account, year);

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          กติกาผูกกับ <b>คีย์ผสม 4 ระดับ</b> (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) ไม่ใช่รหัสหมวดรายจ่ายอย่างเดียว
          เพราะรหัสเดียวกันเป็นคนละประเภทได้เมื่ออยู่คนละแผนงาน — ดู <code>800:เงินอุดหนุน</code> สองแถวในตาราง ·
          ทุกกติกามี<b>ช่วงปีที่มีผล</b> เปลี่ยนปีใหม่แล้วตัวเลขปีเก่าไม่เปลี่ยนตาม
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนคงที่ (TFC)
            </Typography>
            <Typography variant="h4" color="info.main">
              {fmtM(RAW.UNI.TFC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {((RAW.UNI.TFC / RAW.UNI.TC) * 100).toFixed(1)}% ของต้นทุนรวม
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนผันแปร (TVC)
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtM(RAW.UNI.TVC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {((RAW.UNI.TVC / RAW.UNI.TC) * 100).toFixed(1)}% ของต้นทุนรวม
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              กติกาที่มีผลในปีที่เลือก
            </Typography>
            <Typography variant="h4" color="success.main">
              {fmtN(withRule.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              คีย์ผสม · จากผังบัญชี 412 รายการ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ยังไม่จำแนก
            </Typography>
            <Typography variant="h4" color="error.main">
              {fmtN(unclassified.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              รายการ · {fmtM(unclassified.reduce((s, a) => s + a.amount, 0))} ลบ. พักไว้ที่หน่วยงาน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={4}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="year-label">ปีการศึกษาที่ดู</InputLabel>
            <Select
              labelId="year-label"
              label="ปีการศึกษาที่ดู"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {YEARS.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={fBeh}
            onChange={(_, v) => v && setFBeh(v)}
          >
            {BEH_FILTERS.map(f => (
              <ToggleButton key={f} value={f}>
                {BEH_FILTER_LABEL[f]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Box flexGrow={1} />
          <Button variant="outlined">+ เพิ่มกติกา</Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader
            title={`กติกาที่มีผลในปีการศึกษา ${year}`}
            subheader={`คลิกแถวเพื่อดูไทม์ไลน์รายปีของบัญชีเดียวกัน · แสดง ${rows.length} จาก ${ACCOUNTS.length} คีย์`}
          />
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>คีย์ผสม 4 ระดับ</TableCell>
                  <TableCell>ชื่อบัญชี</TableCell>
                  <TableCell align="right">ยอด (ลบ.)</TableCell>
                  <TableCell>ประเภท</TableCell>
                  <TableCell align="right">F : V</TableCell>
                  <TableCell>วิธีปันส่วน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      — ไม่มีกติกาที่ตรงกับตัวกรอง —
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(({ a, i, r }) => {
                  if (!r) return null;
                  const b = BEH[r.beh];
                  return (
                    <TableRow
                      key={`${a.key}-${a.org ?? ''}`}
                      hover
                      selected={i === sel}
                      onClick={() => setSel(i)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <code>{a.key}</code>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{a.name}</Typography>
                        {a.org && (
                          <Typography variant="caption" color="text.secondary">
                            ตั้งเจาะจง: {a.org}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{fmtM(a.amount)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={b.color} label={b.label} />
                      </TableCell>
                      <TableCell align="right">
                        {r.beh === 'MIXED' ? `${(r.f * 100).toFixed(0)}:${(r.v * 100).toFixed(0)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {METHOD[r.m]}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={account.name}
                subheader={
                  <>
                    <code>{account.key}</code>
                    {account.org ? ` · ตั้งเจาะจง ${account.org}` : ' · กติกากลางทั้งมหาวิทยาลัย'}
                  </>
                }
                action={rule && <Chip size="small" color={BEH[rule.beh].color} label={BEH[rule.beh].label} />}
              />
              <CardContent>
                {!rule ? (
                  <Typography color="text.secondary">ไม่มีกติกาที่มีผลในปีนี้</Typography>
                ) : (
                  <>
                    <Typography variant="body2" gutterBottom>
                      ประเภทต้นทุนในปีการศึกษา {year}
                    </Typography>
                    <ToggleButtonGroup size="small" exclusive value={rule.beh} fullWidth sx={{ mb: 4 }}>
                      {(['TFC', 'TVC', 'MIXED', 'UNCLASSIFIED'] as Behavior[]).map(v => (
                        <ToggleButton key={v} value={v} disabled>
                          {BEH[v].label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>

                    {rule.beh === 'MIXED' && (
                      <Box mb={4}>
                        <Typography variant="body2" gutterBottom>
                          สัดส่วนคงที่ : ผันแปร
                        </Typography>
                        <Box display="flex" height={22} borderRadius={1} overflow="hidden">
                          <Box
                            flex={rule.f}
                            bgcolor="info.main"
                            color="info.contrastText"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize={11}
                            fontWeight={700}
                          >
                            คงที่ {(rule.f * 100).toFixed(0)}%
                          </Box>
                          <Box
                            flex={rule.v}
                            bgcolor="warning.main"
                            color="warning.contrastText"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize={11}
                            fontWeight={700}
                          >
                            ผันแปร {(rule.v * 100).toFixed(0)}%
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          ยอด {fmtM(account.amount)} ลบ. → TFC {fmtM(account.amount * rule.f)} ลบ. · TVC{' '}
                          {fmtM(account.amount * rule.v)} ลบ.
                        </Typography>
                      </Box>
                    )}

                    <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                      <InputLabel id="method-label">วิธีปันส่วนลงหลักสูตร</InputLabel>
                      <Select labelId="method-label" label="วิธีปันส่วนลงหลักสูตร" value={rule.m} disabled>
                        {Object.entries(METHOD).map(([k, v]) => (
                          <MenuItem key={k} value={k}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {rule.note && (
                      <Alert severity="info" sx={{ mb: 4 }}>
                        <b>เหตุผล:</b> {rule.note}
                      </Alert>
                    )}

                    <Divider sx={{ my: 3 }} />
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Button variant="outlined" size="small">
                        ✎ แก้ไข
                      </Button>
                      <Button variant="outlined" size="small">
                        📅 เพิ่มช่วงปีใหม่
                      </Button>
                      <Button variant="contained" size="small">
                        📤 เสนออนุมัติ
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title="ไทม์ไลน์รายปีของบัญชีนี้"
                subheader="บัญชีเดียวกันเปลี่ยนประเภทตามปีได้ · ปีที่คำนวณไปแล้วไม่เปลี่ยนตาม"
              />
              <CardContent sx={{ pt: 0 }}>
                <Timeline sx={{ p: 0, m: 0 }}>
                  {account.rules.map((r, idx) => {
                    const b = BEH[r.beh];
                    const on = year >= r.from && (r.to === null || year <= r.to);
                    const span = `${r.from <= 2500 ? 'ตั้งแต่เริ่มระบบ' : r.from} – ${r.to === null ? 'ปัจจุบัน' : r.to}`;
                    return (
                      <TimelineItem key={idx} sx={{ opacity: on ? 1 : 0.55, '&::before': { display: 'none' } }}>
                        <TimelineOppositeContent sx={{ flex: 0.001, p: 0 }} />
                        <TimelineSeparator>
                          <TimelineDot color={on ? 'primary' : 'grey'} />
                          {idx < account.rules.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
                            <Typography fontWeight={700} fontSize={12}>
                              {span}
                            </Typography>
                            <Chip size="small" color={b.color} label={b.label} />
                            {r.beh === 'MIXED' && (
                              <Chip size="small" variant="outlined" label={`${(r.f * 100).toFixed(0)}:${(r.v * 100).toFixed(0)}`} />
                            )}
                            {on && <Chip size="small" color="success" variant="outlined" label="มีผลอยู่" />}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {r.note || 'ไม่มีหมายเหตุ'} · ปันส่วน{METHOD[r.m]}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
                {account.rules.length === 1 && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    บัญชีนี้ใช้กติกาเดียวมาตลอด — ยังไม่เคยมีมติให้เปลี่ยนประเภท
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="จุดที่ถ้าตั้งผิดจะทำให้ตัวเลขทั้งระบบผิด" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="error">
                <b>คีย์ผสม 4 ระดับ ไม่ใช่รหัสหมวดเดียว</b> — <code>80001 เงินอุดหนุน</code> ในแผนงานจัดการศึกษาเป็นคนละประเภทกับในแผนงานวิจัย
                ถ้าตั้งด้วยรหัสหมวดอย่างเดียวจะจำแนกผิดทั้งก้อน
              </Alert>
              <Alert severity="warning">
                <b>กติกาเจาะจงหน่วยงานมาก่อนกติกากลางเสมอ</b> — ค่าวัสดุการศึกษาของคณะแพทยศาสตร์ตั้ง 15:85 ทับกติกากลาง 35:65
              </Alert>
              <Alert severity="warning">
                <b>UNCLASSIFIED ไม่ใช่ค่าว่าง</b> — เป็นสถานะที่ตั้งใจ ระบบจะพักเงินไว้ที่หน่วยงานและติดธงไปที่รายการค้างตรวจ ไม่เดาแทน
              </Alert>
              <Alert severity="info">
                <b>ค่าเสื่อมราคาไม่มีรหัสผังบัญชี</b> จึงหากติกาปกติไม่เจอ — กำหนดผ่านค่าตั้ง <code>depreciation_behavior</code> ที่หน้านโยบายการคำนวณแทน
              </Alert>
              <Alert severity="success">
                การแก้กติกาต้องผ่านการอนุมัติ และ run ที่คำนวณไปแล้วจะ<b>ล็อกเวอร์ชันกติกาไว้</b> คำนวณซ้ำได้ตัวเลขเดิมเป๊ะ
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AccountRules;
