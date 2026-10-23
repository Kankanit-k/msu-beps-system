// MUI Imports
import type { Theme } from '@mui/material/styles';

// Type Imports
import type { VerticalNavState } from '@menu/contexts/verticalNavContext';
import type { MenuItemStyles } from '@menu/types';

// Util Imports
import { menuClasses } from '@menu/utils/menuClasses';

/** สีรายการที่เลือกในเมนูซ้าย — navy #022975 ไล่ไปโทนอ่อน แบบ Materio (Primary Color #022975) */
const MENU_NAVY = '#022975';
const MENU_NAVY_LIGHT = '#7387ae';
const MENU_NAVY_CHANNEL = '2 41 117';

const menuItemStyles = (verticalNavOptions: VerticalNavState, theme: Theme): MenuItemStyles => {
  // Vars
  const { isCollapsed, isHovered, collapsedWidth, isPopoutWhenCollapsed, transitionDuration } =
    verticalNavOptions;

  const popoutCollapsed = isPopoutWhenCollapsed && isCollapsed;
  const popoutExpanded = isPopoutWhenCollapsed && !isCollapsed;
  const collapsedNotHovered = isCollapsed && !isHovered;

  return {
    root: ({ level }) => ({
      ...(!isPopoutWhenCollapsed || popoutExpanded || (popoutCollapsed && level === 0)
        ? {
            marginBlockStart: theme.spacing(1.5),
          }
        : {
            marginBlockStart: 0,
          }),
      [`&.${menuClasses.subMenuRoot}.${menuClasses.open} > .${menuClasses.button}, &.${menuClasses.subMenuRoot} > .${menuClasses.button}.${menuClasses.active}`]:
        {
          backgroundColor: 'var(--mui-palette-action-selected) !important',
        },
      // เมนูหลักที่อยู่หน้าแรกของตัวเองพอดี — แถบไล่สีแบบรายการที่เลือก
      [`&.${menuClasses.subMenuRoot} > .${menuClasses.button}[data-landing-active]`]: {
        color: '#fff',
        backgroundColor: 'transparent !important',
        backgroundImage: `linear-gradient(270deg, ${MENU_NAVY}, ${MENU_NAVY_LIGHT} 94%)`,
        boxShadow: `0 2px 6px rgb(${MENU_NAVY_CHANNEL} / 0.35)`,
        fontWeight: 600,
      },
      [`&.${menuClasses.disabled} > .${menuClasses.button}`]: {
        color: 'var(--mui-palette-text-disabled)',
        '& *': {
          color: 'inherit',
        },
      },

      // Active item — แถบไล่สี navy ตัวอักษรขาว (แบบ Materio CRM)
      [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
        color: '#fff',
        // ขวา navy ทึบ → ซ้ายเทาอมฟ้า (#7387ae = สีที่วัดจากเมนู Materio) · ใช้สีทึบ ไม่ให้พื้นสีธีมใต้รายการโผล่
        backgroundColor: 'transparent',
        backgroundImage: `linear-gradient(270deg, ${MENU_NAVY}, ${MENU_NAVY_LIGHT} 94%)`,
        boxShadow: `0 2px 6px rgb(${MENU_NAVY_CHANNEL} / 0.35)`,
        fontWeight: 600,
        [`& .${menuClasses.icon}`]: {
          color: 'inherit',
        },
      },
    }),
    button: ({ level, active }) => ({
      paddingBlock: theme.spacing(2),
      ...(!(isCollapsed && !isHovered) && {
        '&:has(.MuiChip-root)': {
          paddingBlock: theme.spacing(1.75),
        },
      }),
      ...((!isPopoutWhenCollapsed || popoutExpanded || (popoutCollapsed && level === 0)) && {
        transition: `padding-inline-start ${transitionDuration}ms ease-in-out`,
        paddingInlineStart: theme.spacing(
          collapsedNotHovered ? ((collapsedWidth as number) - 25) / 8 : 5.5,
        ),
        paddingInlineEnd: theme.spacing(
          collapsedNotHovered ? ((collapsedWidth as number) - 25) / 8 - 1.25 : 3.5,
        ),
        // กางเมนู: แคปซูลโค้งเฉพาะขวา ชิดขอบซ้าย (แบบ MSU-KPI) · ยุบเมนู: มุมโค้งรอบด้าน
        ...(collapsedNotHovered
          ? { borderRadius: 8 }
          : { borderStartEndRadius: 50, borderEndEndRadius: 50 }),
      }),
      ...(!active && {
        '&:hover, &:focus-visible': {
          backgroundColor: 'var(--mui-palette-action-hover)',
        },
        '&[aria-expanded="true"]': {
          backgroundColor: 'var(--mui-palette-action-selected)',
        },
      }),
    }),
    icon: ({ level }) => ({
      transition: `margin-inline-end ${transitionDuration}ms ease-in-out`,
      ...(level === 0 && {
        fontSize: '1.375rem',
      }),
      ...(level > 0 && {
        fontSize: '0.75rem',
        color: 'var(--mui-palette-text-secondary)',
      }),
      ...(level === 0 && {
        marginInlineEnd: theme.spacing(2),
      }),
      ...(level > 0 && {
        marginInlineEnd: theme.spacing(3.5),
      }),
      ...(level === 1 &&
        !popoutCollapsed && {
          marginInlineStart: theme.spacing(1.5),
        }),
      ...(level > 1 && {
        marginInlineStart: theme.spacing((popoutCollapsed ? 0 : 1.5) + 2.5 * (level - 1)),
      }),
      ...(collapsedNotHovered && {
        marginInlineEnd: 0,
      }),
      ...(popoutCollapsed &&
        level > 0 && {
          marginInlineEnd: theme.spacing(2),
        }),
      '& > i, & > svg': {
        fontSize: 'inherit',
      },
    }),
    prefix: {
      marginInlineEnd: theme.spacing(2),
    },
    label: ({ level }) => ({
      ...((!isPopoutWhenCollapsed || popoutExpanded || (popoutCollapsed && level === 0)) && {
        transition: `opacity ${transitionDuration}ms ease-in-out`,
        ...(collapsedNotHovered && {
          opacity: 0,
        }),
      }),
    }),
    suffix: {
      marginInlineStart: theme.spacing(2),
    },
    subMenuExpandIcon: {
      fontSize: '1.375rem',
      marginInlineStart: theme.spacing(2),
      '& i, & svg': {
        fontSize: 'inherit',
      },
    },
    subMenuContent: ({ level }) => ({
      zIndex: 'calc(var(--drawer-z-index) + 1)',
      backgroundColor: popoutCollapsed ? 'var(--mui-palette-background-paper)' : 'transparent',
      ...(popoutCollapsed &&
        level === 0 && {
          paddingBlock: theme.spacing(2),
          boxShadow: 'var(--mui-customShadows-lg)',
          '[data-skin="bordered"] ~ [data-floating-ui-portal] &': {
            boxShadow: 'none',
            border: '1px solid var(--mui-palette-divider)',
          },
          [`& .${menuClasses.button}`]: {
            paddingInline: theme.spacing(4),
          },
        }),
    }),
  };
};

export default menuItemStyles;
