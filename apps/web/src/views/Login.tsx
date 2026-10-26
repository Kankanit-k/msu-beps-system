'use client';

// React Imports
import { useState } from 'react';
import type { FormEvent } from 'react';

// Next Imports
import { useRouter } from 'next/navigation';

// MUI Imports
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';

// Third-party Imports
import classnames from 'classnames';
import { getSession, signIn } from 'next-auth/react';

// Type Imports
import type { Mode } from '@core/types';
import type { AppRole } from '@configs/accessControl';

// Component Imports
import Link from '@components/Link';
import Logo from '@components/layout/shared/Logo';
import Illustrations from '@components/Illustrations';

// Config Imports
import themeConfig from '@configs/themeConfig';
import { homeFor, roleDisplay } from '@configs/accessControl';
import { MOCK_PASSWORD, MOCK_USERS } from '@configs/mockUsers';
import { clearViewRole } from '@/hooks/useRole';

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant';
import { useSettings } from '@core/hooks/useSettings';

/**
 * บทบาทผู้ใช้ 5 ระดับของระบบนี้ (ตรงกับ AppRole ใน src/configs/accessControl.ts)
 * และสิ่งที่แต่ละบทบาทเห็น — ใช้ label เดียวกับ roleDisplay (ตัวสลับบทบาทใน UserDropdown)
 */
const ROLE_INFO: { role: AppRole; label: string; scope: string; sees: string }[] = [
  {
    role: 'universityExec',
    label: 'ผู้บริหารมหาวิทยาลัย',
    scope: 'ทุกคณะ (ดูอย่างเดียว)',
    sees: 'ภาพรวมมหาวิทยาลัย ภาพรวมคณะ และเจาะลึกจุดคุ้มทุน ของทุกคณะ',
  },
  {
    role: 'universityAdmin',
    label: 'เจ้าหน้าที่ระดับมหาวิทยาลัย',
    scope: 'ทุกคณะ',
    sees: 'ทุกเมนู — รวมวิเคราะห์จุดคุ้มทุน ตั้งค่าการคำนวณ และทะเบียนข้อมูล',
  },
  {
    role: 'facultyExec',
    label: 'ผู้บริหารคณะ',
    scope: 'เฉพาะคณะของตน (ดูอย่างเดียว)',
    sees: 'ภาพรวมมหาวิทยาลัย และภาพรวมคณะ/เจาะลึกเฉพาะคณะตน',
  },
  {
    role: 'deptAdmin',
    label: 'เจ้าหน้าที่ระดับคณะ',
    scope: 'เฉพาะคณะของตน',
    sees: 'ทุกอย่างของผู้บริหารคณะ และวิเคราะห์จุดคุ้มทุน + ตั้งค่าวิธีปันส่วนของคณะ',
  },
  {
    role: 'lecturer',
    label: 'อาจารย์ประจำหลักสูตร',
    scope: 'คณะของตน · คำนวณเฉพาะหลักสูตรตน',
    sees: 'ภาพรวมคณะ และวิเคราะห์จุดคุ้มทุนเฉพาะหลักสูตรที่รับผิดชอบ',
  },
];

const LoginV2 = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Vars
  const darkImg = '/images/pages/auth-v2-mask-dark.png';
  const lightImg = '/images/pages/auth-v2-mask-light.png';

  // Hooks
  const router = useRouter();
  const { settings } = useSettings();
  const authBackground = useImageVariant(mode, lightImg, darkImg);

  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError('กรอกอีเมลและรหัสผ่าน');

      return;
    }

    setLoading(true);
    const res = await signIn('mock', { email, password, redirect: false });

    if (!res?.ok) {
      setLoading(false);
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ยังไม่มีสิทธิ์ใช้ระบบ');

      return;
    }

    clearViewRole();
    // เข้าหน้าของตัวเองทันที (ระดับคณะ → ภาพรวมคณะของตน) · ถ้าถูกส่งมาจากหน้าอื่นให้กลับไปหน้านั้น
    const role = (await getSession())?.user?.role;
    const cb = new URLSearchParams(window.location.search).get('callbackUrl');

    router.replace(cb && cb.startsWith('/') && cb !== '/' ? cb : homeFor(role ?? 'facultyExec'));
    router.refresh();
  };

  return (
    <div className="flex bs-full justify-center">
      {/* ซ้าย: แบรนด์ + เหตุผลที่ต้องมี auth (W0) */}
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-10 max-md:hidden',
          'bg-[var(--mui-palette-primary-main)]',
          {
            'border-ie': settings.skin === 'bordered',
          },
        )}
      >
        <div className="flex flex-col gap-6 is-full max-is-[520px] text-white">
          <div className="flex items-center gap-4">
            <Logo />
          </div>
          <div>
            <Typography variant="overline" className="!text-white/75">
              Mahasarakham University
            </Typography>
            <Typography variant="h3" className="!text-white !font-bold">
              MSU-BEPS
            </Typography>
            <Typography className="!text-white/85 mbs-1">
              ระบบวิเคราะห์จุดคุ้มทุน · Break-Even Point System
            </Typography>
          </div>

          <Typography className="!text-white/90" style={{ lineHeight: 1.8 }}>
            ระบบนี้แสดงต้นทุนและจุดคุ้มทุนรายหลักสูตรของทั้งมหาวิทยาลัย
            ซึ่งเป็นข้อมูลที่กระทบการตัดสินใจ เรื่องงบประมาณและการเปิด/ปิดหลักสูตรโดยตรง
            จึงต้องระบุตัวตนก่อนเข้าใช้เสมอ และ
            <b className="!text-white"> สิ่งที่แต่ละคนเห็นขึ้นอยู่กับสิทธิ์</b>
          </Typography>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <i className="ri-lock-2-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                เข้าสู่ระบบด้วยบัญชี <b className="!text-white">MSU Account</b>{' '}
                เดียวกับระบบอื่นของมหาวิทยาลัย (SSO) — ระบบไม่เก็บรหัสผ่านของตัวเอง
              </Typography>
            </div>
            <div className="flex gap-3 items-start">
              <i className="ri-eye-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                ผู้รับผิดชอบหลักสูตรเห็นเฉพาะคณะที่สังกัด · ผู้บริหารเห็นทุกคณะ ·
                เมนูจัดการข้อมูลและตั้งค่าระบบ
                <b className="!text-white"> ไม่ปรากฏเลย</b>สำหรับผู้ที่ไม่มีสิทธิ์
              </Typography>
            </div>
            <div className="flex gap-3 items-start">
              <i className="ri-file-list-3-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                ทุกการแก้ข้อมูลหลัก การอนุมัติ และการสั่งคำนวณใหม่ ถูกบันทึกพร้อมชื่อผู้ทำและเวลา
                เพื่อให้ตอบได้ว่า ตัวเลขแต่ละชุดมาจากใครและกติกาปีไหน
              </Typography>
            </div>
          </div>
        </div>
        <Illustrations
          image1={{
            src: `${process.env.NEXT_PUBLIC_BASEPATH}/images/illustrations/objects/tree-2.png`,
          }}
          image2={null}
          maskImg={{ src: authBackground }}
        />
      </div>

      {/* ขวา: ฟอร์มเข้าสู่ระบบ + ตารางสิทธิ์ */}
      <div className="flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[560px] overflow-y-auto">
        <Link className="absolute block-start-5 sm:block-start-[38px] inline-start-6 sm:inline-start-[38px] max-md:block hidden">
          <Logo />
        </Link>
        <div className="flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[440px] md:max-is-[unset] plb-12 md:plb-0">
          <div>
            <Typography variant="h4">เข้าสู่ระบบ</Typography>
            <Typography className="mbs-1" color="text.secondary">
              ช่วงพัฒนาใช้บัญชีจำลอง — {themeConfig.templateName}
            </Typography>
          </div>

          <Button
            fullWidth
            variant="outlined"
            disabled
            startIcon={<i className="ri-graduation-cap-line" />}
          >
            เข้าสู่ระบบด้วย MSU Account (SSO) — รอเชื่อม ERP
          </Button>

          <Divider className="gap-3">ช่วงพัฒนา · ใช้บัญชีจำลอง</Divider>

          <form
            noValidate
            autoComplete="off"
            onSubmit={(e) => void handleSubmit(e)}
            className="flex flex-col gap-5"
          >
            <TextField
              autoFocus
              fullWidth
              label="อีเมล"
              placeholder="name@msu.ac.th"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            <TextField
              fullWidth
              label="รหัสผ่าน"
              type={isPasswordShown ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              helperText={`บัญชีจำลองทุกบัญชีใช้รหัสผ่าน ${MOCK_PASSWORD}`}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={handleClickShowPassword}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              เข้าสู่ระบบ
            </Button>
          </form>

          {/* บัญชีจำลอง — กดเพื่อกรอกอีเมล/รหัสผ่านให้ */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                บัญชีจำลองสำหรับทดสอบสิทธิ์
              </Typography>
              <Typography variant="caption" color="text.secondary">
                กดแถวเพื่อกรอกให้ แล้วกด “เข้าสู่ระบบ” · ออกจากระบบได้ที่เมนูโปรไฟล์มุมขวาบน
              </Typography>
              <TableContainer sx={{ mt: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>บทบาท</TableCell>
                      <TableCell>อีเมล · ขอบเขต</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_USERS.map((u) => (
                      <TableRow
                        key={u.email}
                        hover
                        selected={u.email === email}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setEmail(u.email);
                          setPassword(MOCK_PASSWORD);
                          setError(null);
                        }}
                      >
                        <TableCell>
                          <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={roleDisplay[u.role].label}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{u.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.scope.program?.split('|')[2]
                              ? `${u.scope.faculty} · ${u.scope.program.split('|')[2]}`
                              : (u.scope.faculty ?? 'ทุกคณะ')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* ตารางสิทธิ์: บทบาท → สิ่งที่เห็น (5 บทบาทตาม AppRole) */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                สิทธิ์แต่ละบทบาทเห็นอะไรบ้าง
              </Typography>
              <Typography variant="caption" color="text.secondary">
                5 บทบาทตรงกับ <code>AppRole</code> ของระบบ —
                ขอบเขตข้อมูลกำหนดจากหน่วยงานที่ผูกไว้กับบัญชี
              </Typography>
              <TableContainer sx={{ mt: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>บทบาท</TableCell>
                      <TableCell>ขอบเขตข้อมูล</TableCell>
                      <TableCell>สิ่งที่เห็น</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ROLE_INFO.map((r) => (
                      <TableRow key={r.role}>
                        <TableCell>
                          <Chip size="small" color="primary" variant="outlined" label={r.label} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.scope}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.sees}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginV2;
