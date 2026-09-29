'use client';

// MUI Imports
import TextField, { type TextFieldProps } from '@mui/material/TextField';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
};

/** ช่องกรอกจำนวนเต็มที่แสดงคั่นหลักพันด้วย , (เช่น 1,000,000) — ค่า 0 แสดงเป็นช่องว่าง */
const NumberTextField = ({ value, onChange, slotProps, ...rest }: Props) => (
  <TextField
    {...rest}
    value={value ? value.toLocaleString('en-US') : ''}
    onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
    slotProps={{ ...slotProps, htmlInput: { inputMode: 'numeric', ...slotProps?.htmlInput } }}
  />
);

export default NumberTextField;
