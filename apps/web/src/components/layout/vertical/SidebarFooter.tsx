'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useRole, useIsAdmin } from '@/hooks/useRole'
import type { AppRole } from '@/configs/accessControl'

const roleOptions: { value: AppRole; label: string; icon: string }[] = [
  { value: 'user', label: 'ผู้ใช้ทั่วไป', icon: 'ri-user-line' },
  { value: 'deptAdmin', label: 'ผู้ดูแลหน่วยงาน', icon: 'ri-shield-user-line' },
  { value: 'universityAdmin', label: 'ผู้ดูแลมหาวิทยาลัย', icon: 'ri-government-line' }
]

const sectionLabelSx = {
  fontSize: '0.625rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'primary.main',
  marginBlockEnd: '8px'
} as const

const SidebarFooter = () => {
  // Hooks
  const { isCollapsed, isHovered, isBreakpointReached } = useVerticalNav()
  const { role, setRole } = useRole()
  const isAdmin = useIsAdmin()

  // Hide footer when the rail is collapsed (icon-only)
  const collapsedNotHovered = isCollapsed && !isHovered && !isBreakpointReached

  if (collapsedNotHovered) {
    return null
  }

  return (
    <Box
      sx={{
        marginBlockStart: 'auto',
        paddingInline: '16px',
        paddingBlock: '12px',
        borderBlockStart: '1px solid var(--mui-palette-divider)'
      }}
    >
      {/* Role switcher — only for accounts that may switch (see useIsAdmin) */}
      {isAdmin && (
        <Box sx={{ marginBlockEnd: '14px' }}>
          <Typography sx={sectionLabelSx}>มุมมองสิทธิ์</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size='small'
            color='primary'
            orientation='vertical'
            value={role}
            onChange={(_, next: AppRole | null) => next && setRole(next)}
            sx={{
              '& .MuiToggleButton-root': {
                justifyContent: 'flex-start',
                gap: '8px',
                paddingBlock: '6px',
                paddingInline: '10px',
                fontSize: '0.75rem',
                textTransform: 'none'
              }
            }}
          >
            {roleOptions.map(opt => (
              <ToggleButton key={opt.value} value={opt.value}>
                <i className={opt.icon} style={{ fontSize: '1rem' }} />
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
    </Box>
  )
}

export default SidebarFooter
