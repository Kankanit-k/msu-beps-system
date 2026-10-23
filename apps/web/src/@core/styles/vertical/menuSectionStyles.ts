// MUI Imports
import type { Theme } from '@mui/material/styles';

// Type Imports
import type { VerticalNavState } from '@menu/contexts/verticalNavContext';
import type { MenuProps } from '@menu/vertical-menu';

// Util Imports
import { menuClasses } from '@menu/utils/menuClasses';

const menuSectionStyles = (
  verticalNavOptions: VerticalNavState,
  theme: Theme,
): MenuProps['menuSectionStyles'] => {
  // Vars
  const { isCollapsed, isHovered, collapsedWidth } = verticalNavOptions;

  const collapsedNotHovered = isCollapsed && !isHovered;

  return {
    root: {
      marginBlockStart: theme.spacing(5),
      [`& .${menuClasses.menuSectionContent}`]: {
        // ป้ายหมวดเยื้องเท่ากับไอคอนของรายการเมนู
        paddingInline: `${theme.spacing(5.5)} 0 !important`,
        paddingBlock: `${theme.spacing(collapsedNotHovered ? 3.875 : 1.5)} !important`,
        gap: theme.spacing(2.5),
        ...(collapsedNotHovered && {
          paddingInlineStart: `${theme.spacing(((collapsedWidth as number) - 22) / 8)} !important`,
          paddingInlineEnd: `${theme.spacing((((collapsedWidth as number) - 22) / 2 - 5) / 4)} !important`,
        }),

        // Show only a short divider tick when collapsed; full divider line otherwise.
        ...(collapsedNotHovered && {
          '&:before': {
            content: '""',
            blockSize: 1,
            inlineSize: '1.3125rem',
            backgroundColor: 'rgb(var(--mui-palette-text-primaryChannel) / 0.06)',
          },
        }),
        ...(!collapsedNotHovered && {
          '&:after': {
            content: '""',
            blockSize: 1,
            flexGrow: 1,
            backgroundColor: 'rgb(var(--mui-palette-text-primaryChannel) / 0.06)',
          },
        }),
      },

      // ชื่อกลุ่มสีเทาเล็ก + เส้นคั่น (แบบ Materio "Apps & Pages")
      [`& .${menuClasses.menuSectionLabel}`]: {
        flexGrow: 0,
        fontSize: '0.8125rem',
        fontWeight: 400,
        lineHeight: 1.4,
        color: 'var(--mui-palette-text-disabled)',
        ...(collapsedNotHovered && {
          display: 'none',
        }),
      },
    },
  };
};

export default menuSectionStyles;
