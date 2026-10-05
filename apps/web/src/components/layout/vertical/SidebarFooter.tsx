'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav';
import { useRole, useIsAdmin } from '@/hooks/useRole';
import { roleDisplay, roleOrder } from '@/configs/accessControl';
import type { AppRole } from '@/configs/accessControl';

// Developer credits shown at the bottom of the sidebar.
type Developer = { avatar: string; name: string; role: string; phone?: string };

const developers: Developer[] = [
  {
    avatar: '/images/developers/msu-emblem.png',
    name: 'กองแผนงาน',
    role: 'กระบวนการ',
    phone: '1254',
  },
  {
    avatar: '/images/developers/kankanit.jpg',
    name: 'นางสาวกันต์กนิษฐ์ กองทอง',
    role: 'พัฒนาระบบ',
  },
];

// Show/hide the "มุมมองสิทธิ์" role switcher. Flip to true to bring it back.
const SHOW_ROLE_SWITCHER: boolean = false;

const sectionLabelSx = {
  fontSize: '0.625rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'primary.main',
  marginBlockEnd: '8px',
} as const;

const SidebarFooter = () => {
  // Hooks
  const { isCollapsed, isHovered, isBreakpointReached } = useVerticalNav();
  const { role, setRole } = useRole();
  const isAdmin = useIsAdmin();

  // Hide footer when the rail is collapsed (icon-only)
  const collapsedNotHovered = isCollapsed && !isHovered && !isBreakpointReached;

  if (collapsedNotHovered) {
    return null;
  }

  return (
    <Box
      sx={{
        marginBlockStart: 'auto',
        flexShrink: 0,
        paddingInline: '16px',
        paddingBlock: '12px',
      }}
    >
      {/* Role switcher — only for accounts that may switch (see useIsAdmin) */}
      {SHOW_ROLE_SWITCHER && isAdmin && (
        <Box sx={{ marginBlockEnd: '14px' }}>
          <Typography sx={sectionLabelSx}>มุมมองสิทธิ์</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            orientation="vertical"
            value={role}
            onChange={(_, next: AppRole | null) => next && setRole(next)}
            sx={{
              '& .MuiToggleButton-root': {
                justifyContent: 'flex-start',
                gap: '8px',
                paddingBlock: '6px',
                paddingInline: '10px',
                fontSize: '0.75rem',
                textTransform: 'none',
              },
            }}
          >
            {roleOrder.map((value) => (
              <ToggleButton key={value} value={value}>
                <i className={roleDisplay[value].icon} style={{ fontSize: '1rem' }} />
                {roleDisplay[value].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Developer credits */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBlockEnd: '12px' }}>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
          ผู้พัฒนาระบบ
        </Typography>
        <Box sx={{ flex: 1, borderBlockStart: '1px solid var(--mui-palette-divider)' }} />
      </Box>
      {developers.map((dev) => (
        <Box
          key={dev.name}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBlockEnd: '12px',
            '&:last-of-type': { marginBlockEnd: 0 },
          }}
        >
          <Box
            component="img"
            src={`${process.env.NEXT_PUBLIC_BASEPATH ?? ''}${dev.avatar}`}
            alt=""
            sx={{
              inlineSize: 40,
              blockSize: 40,
              flexShrink: 0,
              borderRadius: '8px',
              objectFit: 'cover',
              backgroundColor: '#fff',
              boxShadow: 'var(--mui-customShadows-xs)',
            }}
          />
          <Box sx={{ minInlineSize: 0 }}>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                lineHeight: 1.4,
                color: 'text.primary',
              }}
            >
              {dev.name}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'text.secondary' }}>
              {dev.role}
              {dev.phone && ` ☎️ ${dev.phone}`}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default SidebarFooter;
