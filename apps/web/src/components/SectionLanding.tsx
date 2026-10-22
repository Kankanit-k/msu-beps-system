'use client';

// Next Imports
import NextLink from 'next/link';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes';

// Config Imports
import { roleDisplay } from '@/configs/accessControl';

// Data Imports
import verticalMenuData from '@/data/navigation/verticalMenuData';
import { pageInfo, sectionLandings } from '@/data/navigation/sectionLandings';

// Hook Imports
import { useRole } from '@/hooks/useRole';

type Link = { label: string; href: string; icon?: string };

/** ลิงก์ทุกหน้าในหมวด (คลี่เมนูย่อยออก) */
const leafLinks = (items: VerticalMenuDataType[]): Link[] =>
  items.flatMap((item) =>
    'children' in item && item.children
      ? leafLinks(item.children)
      : 'href' in item && item.href
        ? [{ label: String(item.label), href: item.href, icon: item.icon }]
        : [],
  );

/**
 * หน้าแรกของหมวดเมนู — การ์ดของทุกหน้าในหมวด ดึงจากเมนูซ้ายมือที่กรองตามบทบาทแล้ว
 * จึงเห็นเฉพาะหน้าที่มีสิทธิ์ เหมือนเมนูทุกประการ (คำอธิบายการ์ดอยู่ใน sectionLandings.ts)
 */
const SectionLanding = ({ href }: { href: string }) => {
  const { role, scope } = useRole();
  const section = verticalMenuData(role).find(
    (s) => 'children' in s && s.children && leafLinks(s.children).some((l) => l.href === href),
  );
  const links =
    section && 'children' in section && section.children ? leafLinks(section.children) : [];
  const cards = links.filter((l) => l.href !== href);
  const info = sectionLandings[href];

  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardContent
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {info?.icon} {section ? String(section.label) : ''}
            </Typography>
            <Typography color="text.secondary">{info?.desc}</Typography>
          </Box>
          <Chip
            variant="tonal"
            color="primary"
            icon={<i className={roleDisplay[role].icon} />}
            label={`คุณดูในฐานะ: ${roleDisplay[role].label}${scope.faculty ? ` · ${scope.faculty}` : ''}`}
          />
        </CardContent>
      </Card>

      <Typography variant="overline" color="text.secondary">
        เลือกงานที่ต้องการ · {cards.length} หน้า
      </Typography>

      {cards.length === 0 ? (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6">ยังไม่มีหน้าที่บทบาทนี้ใช้ได้ในหมวดนี้</Typography>
            <Typography color="text.secondary">
              เปลี่ยนมุมมองสิทธิ์จากเมนูโปรไฟล์ หรือเลือกหมวดอื่นจากเมนูด้านซ้าย
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={4} sx={{ mt: 1 }}>
          {cards.map((c) => {
            const page = pageInfo[c.href];

            return (
              <Grid key={c.href} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea component={NextLink} href={c.href} sx={{ height: '100%' }}>
                    <CardContent
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            fontSize: '1.5rem',
                            inlineSize: 48,
                            blockSize: 48,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'var(--mui-palette-primary-lightOpacity)',
                            flexShrink: 0,
                          }}
                        >
                          {c.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {c.label}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{page?.desc}</Typography>
                      {page?.when && (
                        <Typography variant="body2" color="text.secondary">
                          ใช้เมื่อ: {page.when}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ mt: 'auto', fontWeight: 600 }}
                      >
                        เปิดหน้านี้ →
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default SectionLanding;
