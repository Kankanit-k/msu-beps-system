'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

// Type Imports
import type { RoleName } from '@beps/shared-types';
import type { ThemeColor } from '@core/types';

// Data Imports
import { RAW } from '@/data/mockup';

// อ้างอิง mockup/W18-users.html — ผู้ใช้หนึ่งคนมีหนึ่งบทบาท (app_role_id) และหนึ่งขอบเขต (org_unit_id, NULL = ทุกหน่วยงาน)
// บทบาทมาจาก RoleName ของ @beps/shared-types (schema จริงที่ SA.md กำหนดไว้) — ยังไม่มี backend/ตาราง app_user จริง
// รายชื่อผู้ใช้ ประวัติการเปลี่ยนสิทธิ์ และการแก้ไขในหน้านี้จึงเป็นข้อมูลตัวอย่าง/สาธิตเท่านั้น

const ROLES: { key: RoleName; label: string; desc: string; scoped: boolean; color: ThemeColor }[] = [
  {
    key: 'viewer',
    label: 'ผู้ดูข้อมูล',
    desc: 'อธิการบดี · รองอธิการบดี · คณบดี · กรรมการ — ดูอย่างเดียว ไม่แก้อะไรได้',
    scoped: false,
    color: 'secondary',
  },
  {
    key: 'faculty_officer',
    label: 'เจ้าหน้าที่คณะ',
    desc: 'เห็นเฉพาะหน่วยงานที่ผูกไว้ · เสนอข้อมูลของคณะตัวเองได้',
    scoped: true,
    color: 'success',
  },
  {
    key: 'budget_office',
    label: 'กองแผนงาน',
    desc: 'แก้ข้อมูลหลักและเสนออนุมัติได้ทั้งมหาวิทยาลัย · สั่งสร้างรอบคำนวณได้',
    scoped: false,
    color: 'primary',
  },
  {
    key: 'admin',
    label: 'ผู้ดูแลระบบ',
    desc: 'อนุมัติทุกอย่าง · ตั้งค่าระบบ · จัดการผู้ใช้และสิทธิ์ · ดู audit log ทั้งหมด',
    scoped: false,
    color: 'error',
  },
];

const ROLE_META = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<RoleName, (typeof ROLES)[number]>;

type Access = 'y' | 'p' | 'n';

type RbacRow = { screen: string; action?: string; label: string; access: Record<RoleName, Access> };

// y = ทำได้ · p = ได้เฉพาะขอบเขตที่ผูกไว้ · n = ไม่เห็นเมนูเลย
const RBAC: RbacRow[] = [
  { screen: 'W1–W5', label: 'หน้าวิเคราะห์ทั้งหมด', access: { viewer: 'y', faculty_officer: 'p', budget_office: 'y', admin: 'y' } },
  { screen: 'W6–W7', label: 'จำลองแผน (Scenario)', access: { viewer: 'y', faculty_officer: 'p', budget_office: 'y', admin: 'y' } },
  { screen: 'W10', label: 'สูตร & หลักวิชาการ', access: { viewer: 'y', faculty_officer: 'y', budget_office: 'y', admin: 'y' } },
  {
    screen: 'W12–W13',
    label: 'ผลตรวจยอด · รายการค้างตรวจ',
    access: { viewer: 'y', faculty_officer: 'p', budget_office: 'y', admin: 'y' },
  },
  {
    screen: 'W8',
    action: 'แก้/เสนอ',
    label: 'ค่าธรรมเนียม — แก้ / เสนอ',
    access: { viewer: 'n', faculty_officer: 'p', budget_office: 'y', admin: 'y' },
  },
  {
    screen: 'W8',
    action: 'อนุมัติ',
    label: 'ค่าธรรมเนียม — อนุมัติ',
    access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' },
  },
  { screen: 'W9', label: 'นำเข้าข้อมูลต้นทาง', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'y', admin: 'y' } },
  { screen: 'W11', action: 'สร้าง', label: 'สร้างรอบคำนวณ', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'y', admin: 'y' } },
  {
    screen: 'W11',
    action: 'อนุมัติ',
    label: 'อนุมัติรอบคำนวณ',
    access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' },
  },
  {
    screen: 'W16',
    action: 'แก้/เสนอ',
    label: 'ทะเบียนหลักสูตร — แก้ / เสนอ',
    access: { viewer: 'n', faculty_officer: 'p', budget_office: 'y', admin: 'y' },
  },
  {
    screen: 'W16',
    action: 'อนุมัติ',
    label: 'อนุมัติเปิด / ปิดหลักสูตร',
    access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' },
  },
  {
    screen: 'W17',
    label: 'ทะเบียนหน่วยงาน · งวด · ประเภทนิสิต',
    access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' },
  },
  { screen: 'W19', label: 'ผังบัญชี 4 ระดับ', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'y', admin: 'y' } },
  { screen: 'W14', label: 'กติกาผังบัญชี TFC/TVC', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'y', admin: 'y' } },
  { screen: 'W15', label: 'นโยบายการคำนวณ', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' } },
  { screen: 'W18', label: 'ผู้ใช้และสิทธิ์', access: { viewer: 'n', faculty_officer: 'n', budget_office: 'n', admin: 'y' } },
];

const ACCESS_LABEL: Record<Access, string> = { y: '✓', p: '◑', n: '−' };
const ACCESS_COLOR: Record<Access, string> = {
  y: 'var(--mui-palette-success-main)',
  p: 'var(--mui-palette-warning-main)',
  n: 'var(--mui-palette-text-disabled)',
};

type AppUser = {
  name: string;
  email: string;
  role: RoleName;
  org: string | null;
  last: string;
  active: boolean;
  invited?: boolean;
};

// app_user — ตัวอย่างผู้ใช้ในระบบ (ยังไม่มี backend จริง จึงเป็นข้อมูลสาธิต)
const INITIAL_USERS: AppUser[] = [
  { name: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', email: 'piyapat.b@msu.ac.th', role: 'admin', org: null, last: '06 ก.ย. 2569 08:41', active: true },
  {
    name: 'นางสาวสิริมา ศรีสุภาพ',
    email: 'sirima.s@msu.ac.th',
    role: 'budget_office',
    org: null,
    last: '05 ก.ย. 2569 16:20',
    active: true,
  },
  {
    name: 'นายอัครินทร์ บุพผา',
    email: 'akkarin.b@msu.ac.th',
    role: 'budget_office',
    org: null,
    last: '05 ก.ย. 2569 14:02',
    active: true,
  },
  {
    name: 'นางวราภรณ์ ทองใบ',
    email: 'waraporn.t@msu.ac.th',
    role: 'faculty_officer',
    org: 'คณะการบัญชีและการจัดการ',
    last: '04 ก.ย. 2569 11:15',
    active: true,
  },
  {
    name: 'นายชนะชัย โพธิ์ศรี',
    email: 'chanachai.p@msu.ac.th',
    role: 'faculty_officer',
    org: 'คณะวิศวกรรมศาสตร์',
    last: '02 ก.ย. 2569 09:48',
    active: true,
  },
  {
    name: 'นางสาวกัญญา แสงทอง',
    email: 'kanya.s@msu.ac.th',
    role: 'faculty_officer',
    org: 'คณะวิทยาศาสตร์',
    last: '28 ส.ค. 2569 13:30',
    active: true,
  },
  { name: 'รศ.ดร.สมชาย ใจดี', email: 'somchai.j@msu.ac.th', role: 'viewer', org: null, last: '05 ก.ย. 2569 07:55', active: true },
  {
    name: 'นายวิทยา คงเจริญ',
    email: 'wittaya.k@msu.ac.th',
    role: 'faculty_officer',
    org: 'คณะแพทยศาสตร์',
    last: '14 ก.พ. 2569 10:02',
    active: false,
  },
  {
    name: 'นางสาวปาริชาต ดวงแก้ว',
    email: 'parichat.d@msu.ac.th',
    role: 'admin',
    org: null,
    last: 'ยังไม่เคยเข้าใช้',
    active: true,
    invited: true,
  },
];

const INITIAL_LOG = [
  {
    time: '06 ก.ย. 2569 08:30',
    text: '<b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b> เชิญ นางสาวปาริชาต ดวงแก้ว เข้าใช้ระบบ สิทธิ์ admin',
  },
  {
    time: '01 ก.ย. 2569 15:12',
    text: 'เปลี่ยนสิทธิ์ นายอัครินทร์ บุพผา จาก faculty_officer เป็น budget_office',
  },
  { time: '20 ส.ค. 2569 09:00', text: 'ระงับบัญชี นายวิทยา คงเจริญ — ไม่เข้าใช้เกิน 180 วัน' },
];

type LogEntry = { time: string; text: string };

const UsersView = () => {
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [log, setLog] = useState<LogEntry[]>(INITIAL_LOG);
  const [filterRole, setFilterRole] = useState<'all' | RoleName>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [hiCol, setHiCol] = useState<RoleName | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => filterRole === 'all' || u.role === filterRole)
      .filter(({ u }) => !q || `${u.name}${u.email}${u.org ?? ''}`.toLowerCase().includes(q));
  }, [users, filterRole, query]);

  // users มีข้อมูลเริ่มต้นเสมอ (ไม่มีทางว่างเปล่า) — selected อยู่ในช่วง [0, users.length) เสมอ
  const selectedUser = users[selected] ?? users[0]!;

  const logChange = (text: string) => {
    setLog((prev) => [{ time: new Date().toLocaleString('th-TH'), text }, ...prev].slice(0, 20));
  };

  const setRole = (index: number, role: RoleName) => {
    const u = users[index];

    if (!u) return;

    setUsers((prev) => prev.map((x, i) => (i === index ? { ...x, role, org: ROLE_META[role].scoped ? x.org : null } : x)));
    logChange(`เปลี่ยนสิทธิ์ <b>${u.name}</b> จาก ${ROLE_META[u.role].label} เป็น ${ROLE_META[role].label}`);
    setToast(`บันทึกการเปลี่ยนสิทธิ์ของ ${u.name} แล้ว (ตัวอย่าง — ยังไม่เชื่อมต่อระบบจริง)`);
  };

  const toggleActive = (index: number) => {
    const u = users[index];

    if (!u) return;

    setUsers((prev) => prev.map((x, i) => (i === index ? { ...x, active: !x.active } : x)));
    logChange(`${u.active ? 'ระงับ' : 'ปลดระงับ'}บัญชี <b>${u.name}</b>`);
    setToast(`${u.active ? 'ระงับ' : 'ปลดระงับ'}บัญชี ${u.name} แล้ว (ตัวอย่าง — ยังไม่เชื่อมต่อระบบจริง)`);
  };

  return (
    <Grid container spacing={6}>
      {ROLES.map((r) => (
        <Grid key={r.key} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {r.label}
              </Typography>
              <Typography variant="h4" color={`${r.color}.main`}>
                {users.filter((u) => u.role === r.key).length}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                <code>{r.key}</code> · {r.scoped ? 'จำกัดขอบเขต' : 'เห็นทุกหน่วยงาน'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Grid size={{ xs: 12 }}>
        <Alert severity="warning">
          <b>ต้องตัดสินใจก่อนเริ่มเขียนโค้ด</b> — บทบาทตอนนี้มี 4 ค่าตายตัว (
          <code>admin</code> · <code>budget_office</code> · <code>faculty_officer</code> · <code>viewer</code>) และ
          <b>ไม่มีบทบาท &quot;ผู้อนุมัติ&quot; แยก</b> ทั้งที่ผู้เสนอไม่ควรกดอนุมัติเรื่องของตัวเองได้ — ตอนนี้จึงตกเป็นภาระของ{' '}
          <code>admin</code> ซึ่งมีอำนาจอนุมัติเชิงนโยบายด้วย ถ้าไม่ต้องการแบบนี้ต้องเพิ่ม role <code>approver</code> ใน schema ก่อน
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader
            title="รายชื่อผู้ใช้"
            subheader={`คลิกแถวเพื่อดูสิทธิ์ที่ได้จริง · ${filtered.length} จาก ${users.length} คน`}
            action={
              <Stack direction="row" spacing={2}>
                <Button size="small" variant="outlined" onClick={() => setToast('การซิงก์บัญชียังไม่เชื่อมต่อ MSU Account (SSO)')}>
                  ซิงก์จาก MSU Account
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setToast('การเชิญผู้ใช้ยังไม่เชื่อมต่อระบบจริง — ต้องต่อกับ MSU Account (SSO) ก่อน')}
                >
                  + เชิญผู้ใช้
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Box display="flex" flexWrap="wrap" gap={2} mb={4}>
              <Chip
                label="ทั้งหมด"
                size="small"
                color={filterRole === 'all' ? 'primary' : 'default'}
                variant={filterRole === 'all' ? 'filled' : 'outlined'}
                onClick={() => setFilterRole('all')}
              />
              {ROLES.map((r) => (
                <Chip
                  key={r.key}
                  label={r.label}
                  size="small"
                  color={filterRole === r.key ? 'primary' : 'default'}
                  variant={filterRole === r.key ? 'filled' : 'outlined'}
                  onClick={() => setFilterRole(r.key)}
                />
              ))}
              <TextField
                size="small"
                placeholder="ค้นหาชื่อ / อีเมล / หน่วยงาน..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 240, ml: 'auto' }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ชื่อ / อีเมล</TableCell>
                    <TableCell>บทบาท</TableCell>
                    <TableCell>ขอบเขตที่เห็น</TableCell>
                    <TableCell>เข้าใช้ล่าสุด</TableCell>
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.disabled', py: 6 }}>
                        — ไม่พบผู้ใช้ที่ตรงกับตัวกรอง —
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(({ u, i }) => (
                    <TableRow
                      key={u.email}
                      hover
                      selected={i === selected}
                      onClick={() => setSelected(i)}
                      sx={{ cursor: 'pointer', opacity: u.active ? 1 : 0.6 }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {u.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={ROLE_META[u.role].label} size="small" color={ROLE_META[u.role].color} variant="tonal" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {u.org ? `◑ ${u.org}` : 'ทุกหน่วยงาน'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {u.last}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {u.invited ? (
                          <Chip label="รอตอบรับ" size="small" color="info" variant="tonal" />
                        ) : u.active ? (
                          <Chip label="ใช้งาน" size="small" color="success" variant="tonal" />
                        ) : (
                          <Chip label="ระงับ" size="small" color="error" variant="tonal" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader
              title={selectedUser.name}
              subheader={selectedUser.email}
              action={<Chip label={ROLE_META[selectedUser.role].label} color={ROLE_META[selectedUser.role].color} size="small" />}
            />
            <CardContent>
              <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                <InputLabel id="role-select-label">บทบาท (app_role_id)</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="บทบาท (app_role_id)"
                  value={selectedUser.role}
                  onChange={(e) => setRole(selected, e.target.value)}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.key} value={r.key}>
                      {r.label} — {r.key}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {ROLE_META[selectedUser.role].desc}
                </Typography>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 4 }} disabled={!ROLE_META[selectedUser.role].scoped}>
                <InputLabel id="org-select-label">ขอบเขตหน่วยงาน (org_unit_id)</InputLabel>
                <Select
                  labelId="org-select-label"
                  label="ขอบเขตหน่วยงาน (org_unit_id)"
                  value={selectedUser.org ?? ''}
                  onChange={(e) =>
                    setUsers((prev) => prev.map((x, i) => (i === selected ? { ...x, org: e.target.value || null } : x)))
                  }
                >
                  <MenuItem value="">— ทุกหน่วยงาน (NULL) —</MenuItem>
                  {RAW.FACS.map((f) => (
                    <MenuItem key={f.name} value={f.name}>
                      {f.name}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {ROLE_META[selectedUser.role].scoped
                    ? 'บทบาทนี้ต้องผูกหน่วยงาน — ระบบกรองข้อมูลที่ระดับ query ทุกครั้ง'
                    : 'บทบาทนี้เห็นทุกหน่วยงานเสมอ จึงตั้งขอบเขตไม่ได้'}
                </Typography>
              </FormControl>

              <Divider sx={{ mb: 4 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2">อนุมัติได้หรือไม่</Typography>
                <Chip
                  label={selectedUser.role === 'admin' ? 'ได้ (ยกเว้นเรื่องที่ตัวเองเสนอ)' : 'ไม่ได้'}
                  color={selectedUser.role === 'admin' ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color={selectedUser.active ? 'error' : 'success'}
                  onClick={() => toggleActive(selected)}
                >
                  {selectedUser.active ? 'ระงับบัญชี' : 'ปลดระงับ'}
                </Button>
                <Button size="small" variant="outlined" disabled title="ลบไม่ได้ — ยังถูกอ้างในประวัติการอนุมัติ">
                  ลบผู้ใช้
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="บันทึกการเปลี่ยนสิทธิ์" subheader="การให้และเพิกถอนสิทธิ์ต้องตรวจย้อนหลังได้เสมอ" />
            <CardContent>
              <Stack divider={<Divider />} spacing={2}>
                {log.map((l, i) => (
                  <Box key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {l.time}
                    </Typography>
                    <Typography variant="body2" dangerouslySetInnerHTML={{ __html: l.text }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title="ตารางสิทธิ์เต็ม"
            subheader='✓ = ทำได้ · ◑ = ได้เฉพาะหน่วยงานที่ผูกไว้ · − = ไม่เห็นเมนูเลย · คลิกหัวคอลัมน์เพื่อเน้นบทบาทนั้น'
          />
          <CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>หน้าจอ / การกระทำ</TableCell>
                    {ROLES.map((r) => (
                      <TableCell
                        key={r.key}
                        align="center"
                        onClick={() => setHiCol(hiCol === r.key ? null : r.key)}
                        sx={{ cursor: 'pointer', bgcolor: hiCol === r.key ? 'action.selected' : undefined }}
                      >
                        {r.label}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {r.key}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RBAC.map((row) => (
                    <TableRow key={`${row.screen}-${row.action ?? ''}`}>
                      <TableCell>
                        <Typography component="span" fontWeight={700} color="primary">
                          {row.screen}
                        </Typography>{' '}
                        {row.action && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({row.action})
                          </Typography>
                        )}{' '}
                        {row.label}
                      </TableCell>
                      {ROLES.map((r) => (
                        <TableCell
                          key={r.key}
                          align="center"
                          sx={{ bgcolor: hiCol === r.key ? 'action.hover' : undefined, color: ACCESS_COLOR[row.access[r.key]] }}
                        >
                          {ACCESS_LABEL[row.access[r.key]]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Grid>
  );
};

export default UsersView;
