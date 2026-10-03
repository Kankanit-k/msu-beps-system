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
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import NextLink from 'next/link';

// Data Imports
import { ERP_ACCOUNTS, keyOf, inYear } from './data';
import { ACCOUNTS, BEH, METHOD, ruleAt } from '../account-rules/data';

// ไฟล์ต้นทางมีข้อมูลปีงบ 2568 ปีเดียว
const YEARS = [2568];
type RuleFilter = 'all' | 'has' | 'none';
const RULE_FILTER_LABEL: Record<RuleFilter, string> = {
  all: 'ทั้งหมด',
  has: 'จำแนกแล้ว',
  none: 'ยังไม่จำแนก',
};

/** ยอดเล็กกว่า 0.05 ลบ. แสดง "<0.1" แทน 0 จะได้ไม่ดูเหมือนไม่มียอด */
const fmtM = (n: number) =>
  n !== 0 && Math.abs(n) < 50_000
    ? '<0.1'
    : (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 });
const fmtN = (n: number) => n.toLocaleString('th-TH');

const ruleOf = (a: (typeof ERP_ACCOUNTS)[number]) => ACCOUNTS.find((x) => x.key === a.ruleKey);

/** มีกติกาที่ระบุประเภทแล้ว (ไม่ใช่ "ยังไม่จำแนก") ในปีที่ดู */
const classified = (a: (typeof ERP_ACCOUNTS)[number], y: number) => {
  const r = ruleOf(a);
  const cur = r ? ruleAt(r, y) : null;

  return !!cur && cur.beh !== 'UNCLASSIFIED';
};

/** หมวดย่อย 80001 เงินอุดหนุนทั่วไป — รหัสเดียวกันแต่คนละแผนงาน ประเภทต้นทุนต่างกัน */
const SUBSIDY = ERP_ACCOUNTS.filter((a) => a.sub === '80001');

const ErpAccounts = () => {
  const [year, setYear] = useState(2568);
  const [fRule, setFRule] = useState<RuleFilter>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const rows = useMemo(
    () =>
      ERP_ACCOUNTS.map((a, i) => ({ a, i }))
        .filter((x) => inYear(x.a, year))
        .filter((x) => fRule === 'all' || (fRule === 'has') === classified(x.a, year))
        .filter(
          (x) => !q || (keyOf(x.a) + x.a.name).toLowerCase().includes(q.trim().toLowerCase()),
        ),
    [year, fRule, q],
  );

  const live = useMemo(() => ERP_ACCOUNTS.filter((a) => inYear(a, year)), [year]);
  const withRule = live.filter((a) => classified(a, year));
  const without = live.filter((a) => !classified(a, year));

  const account = ERP_ACCOUNTS[sel] ?? ERP_ACCOUNTS[0]!;
  const rule = ruleOf(account);
  const curRule = rule ? ruleAt(rule, year) : null;
  const retired = account.to !== null;

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          หน้านี้เก็บ<b>ตัวบัญชี ERP</b> ส่วนการกำหนดว่าบัญชีนั้นเป็นต้นทุนคงที่ (TFC)
          หรือต้นทุนผันแปร (TVC) อยู่ที่{' '}
          <Link component={NextLink} href="/admin/university/account-rules">
            หน้ากติกาผังบัญชี
          </Link>{' '}
          — แยกกันเพราะ<b>บัญชีหนึ่งใบมีกติกาได้หลายช่วงปี</b> และกติกาต้องผ่านการอนุมัติ
          ส่วนตัวบัญชีมาจาก ERP
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              บัญชีที่มีผลในปีที่เลือก
            </Typography>
            <Typography variant="h4" color="info.main">
              {fmtN(live.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              คีย์ผสม 4 ระดับ · มีผลปีงบ {year}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ผูกกติกาต้นทุนคงที่/ผันแปร (TFC/TVC) แล้ว
            </Typography>
            <Typography variant="h4" color="success.main">
              {fmtN(withRule.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บัญชี · พร้อมเข้าการคำนวณ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ยังไม่จำแนกคงที่/ผันแปร
            </Typography>
            <Typography variant="h4" color="error.main">
              {fmtN(without.length)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บัญชี · {fmtN(without.reduce((s, a) => s + a.amount, 0))} บาท จะถูกพักไว้
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              วงเงินอนุมัติที่ครอบคลุม
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtM(live.reduce((s, a) => s + a.amount, 0))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · ปีงบประมาณ {year}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'background.default' }}>
          <CardHeader title="ทำไมคีย์ต้องเป็น 4 ระดับ" subheader="พิสูจน์จากข้อมูลจริงในผังบัญชี" />
          <CardContent>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={3}>
              {[
                'แผนงาน\nระดับ 1',
                'หมวดงบประมาณ\nระดับ 2',
                'หมวดรายจ่าย\nระดับ 3',
                'หมวดย่อย\nระดับ 4',
              ].map((step, i, arr) => (
                <Box key={step} display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={
                      <Box textAlign="center">
                        <Typography variant="caption" display="block">
                          {step.split('\n')[0]}
                        </Typography>
                        <Typography variant="caption" component="code" display="block">
                          {step.split('\n')[1]}
                        </Typography>
                      </Box>
                    }
                    variant="outlined"
                  />
                  <Typography>{i < arr.length - 1 ? '+' : '='}</Typography>
                </Box>
              ))}
              <Chip label="1 บัญชี" color="primary" />
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              หมวดย่อยเดียวกันเป็นคนละบัญชีได้เมื่ออยู่คนละแผนงาน —{' '}
              <code>80001 เงินอุดหนุนทั่วไป</code> มี {SUBSIDY.length} แผนงานในไฟล์
              และตีประเภทต้นทุนต่างกัน · <b>ถ้าตั้งคีย์ด้วยรหัสหมวดอย่างเดียวจะจำแนกผิดทั้งก้อน</b>
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {SUBSIDY.map((a) => {
                const r = ruleOf(a);
                const cur = r ? ruleAt(r, year) : null;

                return (
                  <Chip
                    key={keyOf(a)}
                    variant="outlined"
                    color={cur ? BEH[cur.beh].color : 'default'}
                    label={`${a.plan}:${a.planName} → ${cur ? BEH[cur.beh].label : '—'} · ${fmtM(a.amount)} ลบ.`}
                  />
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={4}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="erp-year-label">ปีงบประมาณที่ดู</InputLabel>
            <Select
              labelId="erp-year-label"
              label="ปีงบประมาณที่ดู"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(0);
              }}
            >
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={fRule}
            onChange={(_, v: RuleFilter | null) => {
              if (v) {
                setFRule(v);
                setPage(0);
              }
            }}
          >
            {(Object.keys(RULE_FILTER_LABEL) as RuleFilter[]).map((f) => (
              <ToggleButton key={f} value={f}>
                {RULE_FILTER_LABEL[f]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="ค้นหารหัส / ชื่อบัญชี..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">🔍</InputAdornment> },
            }}
            sx={{ minWidth: 220 }}
          />
          <Box flexGrow={1} />
          <Chip label={`${rows.length} จาก ${ERP_ACCOUNTS.length} บัญชี`} />
          <Button variant="outlined">⬆ นำเข้าผังบัญชีจาก Excel</Button>
          <Button variant="contained">+ เพิ่มบัญชี</Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader
            title="ผังบัญชี"
            subheader="คลิกแถวเพื่อดูรายละเอียดและกติกาที่ผูกอยู่ · ยอด = วงเงินอนุมัติ ปีงบ 2568 (แท็บ งบประมาณ68)"
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">แผน</TableCell>
                  <TableCell align="right">งบ</TableCell>
                  <TableCell align="right">รายจ่าย</TableCell>
                  <TableCell align="right">ย่อย</TableCell>
                  <TableCell>ชื่อบัญชี</TableCell>
                  <TableCell align="right">ยอด (ลบ.)</TableCell>
                  <TableCell>ช่วงปี</TableCell>
                  <TableCell>กติกาคงที่/ผันแปร (TFC/TVC)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      — ไม่พบบัญชีที่ตรงกับตัวกรอง —
                    </TableCell>
                  </TableRow>
                )}
                {rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(({ a, i }) => {
                  const r = ruleOf(a);
                  const cur = r ? ruleAt(r, year) : null;
                  const b = cur ? BEH[cur.beh] : null;
                  return (
                    <TableRow
                      key={keyOf(a)}
                      hover
                      selected={i === sel}
                      onClick={() => setSel(i)}
                      sx={{ cursor: 'pointer', opacity: a.to ? 0.6 : 1 }}
                    >
                      <TableCell align="right">
                        <code>{a.plan}</code>
                      </TableCell>
                      <TableCell align="right">
                        <code>{a.bud}</code>
                      </TableCell>
                      <TableCell align="right">
                        <code>{a.exp}</code>
                      </TableCell>
                      <TableCell align="right">
                        <code>{a.sub}</code>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{a.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.planName} · {a.expName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{a.amount ? fmtM(a.amount) : '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {a.from} – {a.to === null ? 'ปัจจุบัน' : a.to}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {b ? (
                          <Chip size="small" color={b.color} label={b.label} />
                        ) : (
                          <Chip
                            size="small"
                            color="error"
                            variant="outlined"
                            label="ยังไม่มีกติกา"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="แถวต่อหน้า"
          />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={account.name}
                subheader={<code>{keyOf(account)}</code>}
                action={
                  retired ? (
                    <Chip size="small" color="error" label="ยกเลิกแล้ว" />
                  ) : (
                    <Chip size="small" color="success" label="ใช้งาน" />
                  )
                }
              />
              <CardContent>
                <Grid container spacing={3} mb={4}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="แผนงาน"
                      size="small"
                      fullWidth
                      value={`${account.plan} : ${account.planName}`}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="หมวดงบประมาณ"
                      size="small"
                      fullWidth
                      value={`${account.bud} : ${account.budName}`}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="หมวดรายจ่าย"
                      size="small"
                      fullWidth
                      value={`${account.exp} : ${account.expName}`}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="หมวดรายจ่ายย่อย"
                      size="small"
                      fullWidth
                      value={account.sub}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="ชื่อบัญชี"
                  size="small"
                  fullWidth
                  value={account.name}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="ทั้ง 4 รหัสรวมกับปีเริ่มมีผลต้องไม่ซ้ำกับบัญชีอื่น — แก้รหัสของบัญชีที่คำนวณไปแล้วไม่ได้"
                  sx={{ mb: 4 }}
                />

                <Box mb={4}>
                  <Typography variant="caption" color="text.secondary">
                    วงเงินอนุมัติ ปีงบ 2568 · {fmtN(account.lines)} รายการงบประมาณ
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {fmtN(account.amount)} บาท
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    เงินแผ่นดิน {fmtN(account.gov)} · เงินรายได้ {fmtN(account.own)}
                  </Typography>
                </Box>

                <Grid container spacing={3} mb={4}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="เริ่มมีผล (ปีงบ)"
                      size="small"
                      fullWidth
                      value={account.from}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="สิ้นสุด (เว้นว่าง = ยังใช้อยู่)"
                      size="small"
                      fullWidth
                      value={account.to ?? ''}
                      placeholder="—"
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" py={2}>
                  <Box>
                    <Typography fontWeight={600} fontSize={13}>
                      กติกาต้นทุนคงที่/ผันแปร (TFC/TVC) ในปีงบ {year}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {curRule
                        ? `${curRule.note || 'ไม่มีหมายเหตุ'} · ปันส่วน${METHOD[curRule.m]}`
                        : 'ยังไม่มีกติกา — เงินจะถูกพักไว้ที่หน่วยงานและติดธง “ยังไม่จำแนก”'}
                    </Typography>
                  </Box>
                  {curRule ? (
                    <Chip
                      size="small"
                      color={BEH[curRule.beh].color}
                      label={BEH[curRule.beh].label}
                    />
                  ) : (
                    <Chip size="small" color="error" variant="outlined" label="ไม่มี" />
                  )}
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" py={2}>
                  <Box>
                    <Typography fontWeight={600} fontSize={13}>
                      จำนวนช่วงปีของกติกา
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rule
                        ? `บัญชีนี้มีกติกา ${rule.rules.length} ช่วงปี — เปลี่ยนประเภทตามปีได้`
                        : 'ยังไม่เคยตั้งกติกาให้บัญชีนี้'}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={rule ? 'info' : 'error'}
                    label={rule ? rule.rules.length : 0}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button variant="outlined" size="small">
                    💾 บันทึก
                  </Button>
                  <Button
                    component={NextLink}
                    href="/admin/university/account-rules"
                    variant={account.ruleKey ? 'outlined' : 'contained'}
                    size="small"
                  >
                    {account.ruleKey
                      ? '⚖ ดูกติกาที่หน้ากติกาผังบัญชี'
                      : '+ ตั้งกติกาต้นทุนคงที่/ผันแปร'}
                  </Button>
                  {retired ? (
                    <Button variant="outlined" color="success" size="small">
                      ▶ เปิดใช้อีกครั้ง
                    </Button>
                  ) : (
                    <Button variant="outlined" color="error" size="small">
                      ⏹ ยกเลิกบัญชี
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title="เกิดอะไรขึ้นถ้าบัญชีไม่มีกติกา" />
              <CardContent>
                <Box display="flex" flexDirection="column" gap={3}>
                  {[
                    {
                      ic: '1️⃣',
                      t: 'ระบบไม่เดาแทน',
                      d: 'รายการถูกจัดเป็น “ยังไม่จำแนก” ไม่ใช่เดาว่าเป็นต้นทุนคงที่',
                    },
                    {
                      ic: '2️⃣',
                      t: 'เงินถูกพักไว้ที่หน่วยงาน',
                      d: 'ไม่ปันลงหลักสูตร — ยอดรวมไม่หาย แต่ไม่เข้าไปในต้นทุนรายหลักสูตร',
                    },
                    {
                      ic: '3️⃣',
                      t: 'ติดธงไปที่รายการค้างตรวจ',
                      d: 'ปรากฏที่หน้ารายการค้างตรวจ พร้อมมูลค่าและผู้รับผิดชอบ',
                    },
                    {
                      ic: '4️⃣',
                      t: 'ตรวจยอดยังผ่าน',
                      d: 'เพราะเงินไม่หาย — นี่คือเหตุผลที่ต้องดูรายการค้างตรวจคู่กับผลตรวจยอดเสมอ',
                    },
                  ].map((item) => (
                    <Box key={item.t} display="flex" gap={3}>
                      <Typography fontSize={14}>{item.ic}</Typography>
                      <Box>
                        <Typography fontWeight={600} fontSize={12}>
                          {item.t}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.d}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="จุดที่ต้องระวังในหน้านี้" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="error">
                <b>ห้ามแก้รหัสของบัญชีที่คำนวณไปแล้ว</b> — ต้นทุนในรอบคำนวณเก่าอ้างบัญชีนี้อยู่
                ถ้าเปลี่ยนรหัสจะตามกลับไม่ได้ว่าเงินก้อนนั้นมาจากไหน
              </Alert>
              <Alert severity="warning">
                <b>บัญชียกเลิกให้ตั้งวันที่สิ้นสุด ไม่ใช่ลบทิ้ง</b> —
                รายงานปีเก่ายังต้องอ่านชื่อบัญชีได้
              </Alert>
              <Alert severity="warning">
                <b>บัญชีใหม่ต้องผูกกติกาที่หน้ากติกาผังบัญชีก่อนรอบคำนวณถัดไป</b>{' '}
                ไม่งั้นเงินก้อนนั้นจะไม่เข้าต้นทุนรายหลักสูตรทั้งปี
              </Alert>
              <Alert severity="info">
                <b>ค่าเสื่อมราคาไม่มีรหัสผังบัญชี</b> จึงไม่อยู่ในตารางนี้ — กำหนดประเภทผ่านค่าตั้ง
                &ldquo;ประเภทต้นทุนของค่าเสื่อมราคา&rdquo; ที่หน้านโยบายการคำนวณ
              </Alert>
              <Alert severity="success">
                ผังบัญชีปกติมาจาก ERP ผ่านการนำเข้า หน้านี้ใช้แก้รายกรณีและเพิ่มบัญชีที่ ERP
                ยังไม่ส่งมา
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ErpAccounts;
