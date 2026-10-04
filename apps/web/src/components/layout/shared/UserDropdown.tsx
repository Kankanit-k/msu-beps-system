'use client';

// React Imports
import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';

// Next Imports
import { useRouter } from 'next/navigation';

// MUI Imports
import { styled } from '@mui/material/styles';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuList from '@mui/material/MenuList';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

// Hook Imports
import { useSettings } from '@core/hooks/useSettings';
import { useAuthUser, useAuthMethod } from '@/hooks/AuthHooks';
import { useRole, useIsAdmin } from '@/hooks/useRole';

// Config Imports
import { roleDisplay, roleOrder } from '@/configs/accessControl';

/** ซ่อนเมนู My Profile / Settings / Pricing / FAQ ชั่วคราว — ตั้งเป็น true เพื่อแสดงกลับ */
const SHOW_PROFILE_MENU_ITEMS = false;

const profileMenuItems = [
  { label: 'My Profile', icon: 'ri-user-3-line' },
  { label: 'Settings', icon: 'ri-settings-4-line' },
  { label: 'Pricing', icon: 'ri-money-dollar-circle-line' },
  { label: 'FAQ', icon: 'ri-question-line' },
];

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)',
});

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false);

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null);

  // Hooks
  const router = useRouter();
  const { user } = useAuthUser();
  const { logout } = useAuthMethod();
  const { role, setRole } = useRole();
  const isAdmin = useIsAdmin();

  // Accounts that may switch views show the role picked in the sidebar footer, so the
  // navbar and the sidebar never disagree about "which permission am I viewing as".
  const roleLabel = isAdmin
    ? roleDisplay[role].label
    : user?.SCOPES?.groupname || roleDisplay.user.label;

  // Signed-in staff get their own HR photo; with no STAFFID (login bypassed for the demo)
  // fall back to the developer photo instead of a broken /undefined.jpg request.
  const avatarSrc = user?.STAFFID
    ? `https://pd.msu.ac.th/staff/picture/${user.STAFFID}.jpg`
    : '/images/developers/kankanit.jpg';

  const { settings } = useSettings();

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false);
  };

  const handleDropdownClose = (
    event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent),
    url?: string,
  ) => {
    if (url) {
      router.push(url);
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  const handleUserLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* ชื่อ + สิทธิ์ ข้าง avatar — ซ่อนบนจอเล็กเพื่อไม่ให้ navbar ล้น */}
      <Box
        onClick={handleDropdownOpen}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          alignItems: 'flex-end',
          lineHeight: 1.25,
          cursor: 'pointer',
          minInlineSize: 0,
        }}
      >
        <Typography variant="body2" fontWeight={600} noWrap>
          {user?.STAFFNAME || 'ผู้ใช้งาน'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {roleLabel}
        </Typography>
      </Box>
      <Badge
        ref={anchorRef}
        overlap="circular"
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className="mis-2"
      >
        <Avatar
          ref={anchorRef}
          alt={user?.STAFFNAME || 'User'}
          src={avatarSrc}
          onClick={handleDropdownOpen}
          className="cursor-pointer bs-[38px] is-[38px]"
        />
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement="bottom-end"
        anchorEl={anchorRef.current}
        className="min-is-[240px] !mbs-4 z-[1]"
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top',
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener
                onClickAway={(e) => handleDropdownClose(e as MouseEvent | TouchEvent)}
              >
                <MenuList>
                  <div className="flex items-center plb-2 pli-4 gap-2" tabIndex={-1}>
                    <Avatar alt={user?.STAFFNAME || 'User'} src={avatarSrc} />
                    <div className="flex items-start flex-col">
                      <Typography className="font-medium" color="text.primary">
                        {user?.STAFFNAME} {user?.STAFFSURNAME}
                      </Typography>
                      <Typography variant="caption" className="flex items-center gap-1">
                        <i className={roleDisplay[role].icon} style={{ fontSize: '0.9rem' }} />
                        {roleLabel}
                      </Typography>
                    </div>
                  </div>
                  <Divider className="mlb-1" />
                  {/* Role switcher — mirrors the sidebar footer toggle (same useRole state) */}
                  {isAdmin && (
                    <div>
                      <Typography
                        variant="caption"
                        color="primary"
                        className="block pli-4 plb-1 font-bold uppercase"
                      >
                        มุมมองสิทธิ์
                      </Typography>
                      {roleOrder.map((value) => (
                        <MenuItem
                          key={value}
                          className="gap-3"
                          selected={role === value}
                          onClick={(e) => {
                            setRole(value);
                            handleDropdownClose(e);
                          }}
                        >
                          <i className={roleDisplay[value].icon} />
                          <Typography color="text.primary" className="flex-1">
                            {roleDisplay[value].label}
                          </Typography>
                          {role === value && <i className="ri-check-line text-primary" />}
                        </MenuItem>
                      ))}
                      <Divider className="mlb-1" />
                    </div>
                  )}
                  {SHOW_PROFILE_MENU_ITEMS &&
                    profileMenuItems.map((item) => (
                      <MenuItem
                        key={item.label}
                        className="gap-3"
                        onClick={(e) => handleDropdownClose(e)}
                      >
                        <i className={item.icon} />
                        <Typography color="text.primary">{item.label}</Typography>
                      </MenuItem>
                    ))}
                  <div className="flex items-center plb-2 pli-4">
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      size="small"
                      endIcon={<i className="ri-logout-box-r-line" />}
                      onClick={() => void handleUserLogout()}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Logout
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default UserDropdown;
