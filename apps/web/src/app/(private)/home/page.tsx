'use client';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// Config Imports
import themeConfig from '@configs/themeConfig';

type QuickLink = {
  title: string;
  desc: string;
  href: string;
  icon: string;
};

const quickLinks: QuickLink[] = [
  {
    title: 'CRM Dashboard',
    desc: 'ตัวอย่างแดชบอร์ดพร้อมกราฟ',
    href: '/dashboards/crm',
    icon: 'ri-line-chart-line',
  },
  {
    title: 'Analytics',
    desc: 'หน้าวิเคราะห์ข้อมูล',
    href: '/dashboards/analytics',
    icon: 'ri-bar-chart-box-line',
  },
  { title: 'ผู้ใช้งาน', desc: 'ดึงรายชื่อจาก backend API', href: '/users', icon: 'ri-user-line' },
  {
    title: 'เกี่ยวกับเรา',
    desc: 'หน้าตัวอย่างแบบว่างเปล่า',
    href: '/about',
    icon: 'ri-information-line',
  },
];

const features = [
  'ฟอนต์ Sarabun + Manrope / IBM Plex Sans Thai',
  'ธีมสีม่วง (primary) สลับ light/dark ได้',
  'Sidebar แบบจัดกลุ่ม แก้ที่ data/navigation',
  'Customizer มุมขวาบนสำหรับปรับธีมสด ๆ',
];

const HomePage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ยินดีต้อนรับสู่ {themeConfig.templateName}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        เทมเพลตเริ่มต้น Next.js + MUI พร้อมใช้งาน — แก้ไขหน้านี้ได้ที่{' '}
        <Typography component="code" variant="body2">
          src/app/(private)/home/page.tsx
        </Typography>
      </Typography>

      <Grid container spacing={6}>
        {quickLinks.map((link) => (
          <Grid key={link.href} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              component={Link}
              href={link.href}
              sx={{
                display: 'block',
                height: '100%',
                transition: 'box-shadow .2s, transform .2s',
                '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    inlineSize: 44,
                    blockSize: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: 'var(--mui-palette-primary-lightOpacity)',
                    mb: 3,
                  }}
                >
                  <i className={link.icon} />
                </Box>
                <Typography variant="h6">{link.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {link.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="h6">สิ่งที่ตั้งค่าไว้ให้แล้ว</Typography>
                <Chip label="Template" size="small" color="primary" variant="outlined" />
              </Box>
              <Grid container spacing={3}>
                {features.map((f) => (
                  <Grid key={f} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <i
                        className="ri-checkbox-circle-line"
                        style={{ color: 'var(--mui-palette-success-main)' }}
                      />
                      <Typography variant="body2">{f}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
