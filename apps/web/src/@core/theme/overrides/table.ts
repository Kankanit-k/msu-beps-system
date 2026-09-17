// MUI Imports
import type { Theme } from '@mui/material/styles';

/**
 * ความหนาแน่นของตาราง (header uppercase + เส้นใต้หนา, cell padding แคบ) มาจาก
 * mockup/assets/beps.css .tbl — ทำเป็น default ระดับธีมแทนการเซ็ตทีละหน้า
 */
const table: Theme['components'] = {
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: `${theme.spacing(2)} ${theme.spacing(2.5)}`,
        borderBottom: `1px solid var(--mui-palette-divider)`,
        fontSize: '0.75rem',
      }),
      head: () => ({
        fontSize: '0.625rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--mui-palette-text-secondary)',
        borderBottom: `2px solid rgb(var(--mui-mainColorChannels-light) / 0.22)`,
        backgroundColor: 'var(--mui-palette-background-paper)',
      }),
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-child td': {
          borderBottom: 0,
        },
      },
    },
  },
};

export default table;
