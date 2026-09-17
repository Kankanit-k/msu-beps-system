'use client';

// React Imports
import { useState } from 'react';

// Next Imports
import { useRouter } from 'next/navigation';

// MUI Imports
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
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

// Type Imports
import type { Mode } from '@core/types';
import type { AppRole } from '@configs/accessControl';

// Component Imports
import Link from '@components/Link';
import Logo from '@components/layout/shared/Logo';
import Illustrations from '@components/Illustrations';

// Config Imports
import themeConfig from '@configs/themeConfig';

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant';
import { useSettings } from '@core/hooks/useSettings';

/**
 * บทบาทผู้ใช้ 3 ระดับของระบบนี้ (ตรงกับ AppRole ใน src/configs/accessControl.ts)
 * และสิ่งที่แต่ละบทบาทเห็น — ใช้ label เดียวกับตัวสลับบทบาทใน SidebarFooter
 */
const ROLE_INFO: { role: AppRole; label: string; scope: string; sees: string }[] = [
  {
    role: 'user',
    label: 'ผู้ใช้ทั่วไป',
    scope: 'ทุกหน่วยงาน (อ่านอย่างเดียว)',
    sees: 'ภาพรวมมหาวิทยาลัย จุดคุ้มทุน และกราฟวิเคราะห์ ของทุกคณะ/วิทยาลัย',
  },
  {
    role: 'deptAdmin',
    label: 'ผู้ดูแลหน่วยงาน',
    scope: 'เฉพาะหน่วยงานที่ผูกกับบัญชี',
    sees: 'ทุกอย่างของผู้ใช้ทั่วไป และเมนูจัดการข้อมูลระดับหน่วยงาน (/admin/**)',
  },
  {
    role: 'universityAdmin',
    label: 'ผู้ดูแลมหาวิทยาลัย',
    scope: 'ทุกหน่วยงาน',
    sees: 'ทุกอย่างของผู้ดูแลหน่วยงาน และเมนูตั้งค่าระดับมหาวิทยาลัย (/admin/university/**)',
  },
];

const LoginV2 = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false);

  // Vars
  const darkImg = '/images/pages/auth-v2-mask-dark.png';
  const lightImg = '/images/pages/auth-v2-mask-light.png';

  // Hooks
  const router = useRouter();
  const { settings } = useSettings();
  const authBackground = useImageVariant(mode, lightImg, darkImg);

  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

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
            ระบบนี้แสดงต้นทุนและจุดคุ้มทุนรายหลักสูตรของทั้งมหาวิทยาลัย ซึ่งเป็นข้อมูลที่กระทบการตัดสินใจ
            เรื่องงบประมาณและการเปิด/ปิดหลักสูตรโดยตรง จึงต้องระบุตัวตนก่อนเข้าใช้เสมอ และ
            <b className="!text-white"> สิ่งที่แต่ละคนเห็นขึ้นอยู่กับสิทธิ์</b>
          </Typography>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <i className="ri-lock-2-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                เข้าสู่ระบบด้วยบัญชี <b className="!text-white">MSU Account</b> เดียวกับระบบอื่นของมหาวิทยาลัย
                (SSO) — ระบบไม่เก็บรหัสผ่านของตัวเอง
              </Typography>
            </div>
            <div className="flex gap-3 items-start">
              <i className="ri-eye-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                ผู้รับผิดชอบหลักสูตรเห็นเฉพาะคณะที่สังกัด · ผู้บริหารเห็นทุกคณะ · เมนูจัดการข้อมูลและตั้งค่าระบบ
                <b className="!text-white"> ไม่ปรากฏเลย</b>สำหรับผู้ที่ไม่มีสิทธิ์
              </Typography>
            </div>
            <div className="flex gap-3 items-start">
              <i className="ri-file-list-3-line text-xl" />
              <Typography className="!text-white/90" variant="body2">
                ทุกการแก้ข้อมูลหลัก การอนุมัติ และการสั่งคำนวณใหม่ ถูกบันทึกพร้อมชื่อผู้ทำและเวลา เพื่อให้ตอบได้ว่า
                ตัวเลขแต่ละชุดมาจากใครและกติกาปีไหน
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
              ใช้บัญชี MSU Account ของท่าน — {themeConfig.templateName}
            </Typography>
          </div>

          <Button fullWidth variant="contained" startIcon={<i className="ri-graduation-cap-line" />}>
            เข้าสู่ระบบด้วย MSU Account (SSO)
          </Button>

          <Divider className="gap-3">หรือเข้าด้วยบัญชีภายในระบบ</Divider>

          <form
            noValidate
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              router.push('/');
            }}
            className="flex flex-col gap-5"
          >
            <TextField autoFocus fullWidth label="ชื่อผู้ใช้ / อีเมล" placeholder="name@msu.ac.th" />
            <TextField
              fullWidth
              label="รหัสผ่าน"
              type={isPasswordShown ? 'text' : 'password'}
              helperText="ลืมรหัสผ่าน ติดต่อสำนักคอมพิวเตอร์ · ระบบไม่รับสมัครสมาชิกเอง"
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
            <div className="flex justify-between items-center flex-wrap gap-x-3 gap-y-1">
              <FormControlLabel control={<Checkbox />} label="จดจำการเข้าสู่ระบบ" />
              <Typography className="text-end" color="primary.main" component={Link}>
                ลืมรหัสผ่าน?
              </Typography>
            </div>
            <Button fullWidth variant="contained" type="submit">
              เข้าสู่ระบบ
            </Button>
          </form>

          {/* ตารางสิทธิ์: บทบาท → สิ่งที่เห็น (3 บทบาทตาม AppRole) */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                สิทธิ์แต่ละบทบาทเห็นอะไรบ้าง
              </Typography>
              <Typography variant="caption" color="text.secondary">
                3 บทบาทตรงกับ <code>AppRole</code> ของระบบ — ขอบเขตข้อมูลกำหนดจากหน่วยงานที่ผูกไว้กับบัญชี
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
