'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';

type Props = {
  /** รายชื่อคณะทั้งหมดที่เลือกได้ */
  options: readonly string[];
  /** คณะที่ถูกเลือกอยู่ — ว่าง = ทุกคณะ */
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  /** ความกว้างขั้นต่ำของกล่อง (px) */
  minWidth?: number;
};

/**
 * ตัวกรองคณะแบบเลือกได้หลายคณะ — ใช้ร่วมกันได้ทุกหน้าที่แสดงข้อมูลรายคณะ
 * ไม่เลือกอะไรเลย = ไม่กรอง (แสดงทุกคณะ) เพื่อให้หน้าจอมีค่าเริ่มต้นเหมือนเดิม
 */
const FacultyFilter = ({
  options,
  value,
  onChange,
  label = 'กรองคณะ',
  placeholder = 'ทุกคณะ',
  minWidth = 320,
}: Props) => (
  <Autocomplete
    multiple
    disableCloseOnSelect
    size="small"
    options={options}
    value={value}
    onChange={(_, v) => onChange(v)}
    limitTags={2}
    sx={{ minWidth }}
    noOptionsText="ไม่พบคณะที่ค้นหา"
    renderOption={(props, option, { selected }) => {
      const { key, ...rest } = props;

      return (
        <li key={key} {...rest}>
          <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
          {option}
        </li>
      );
    }}
    renderTags={(selected, getTagProps) =>
      selected.map((option, index) => {
        const { key, ...rest } = getTagProps({ index });

        return (
          <Chip key={key} {...rest} size="small" variant="tonal" color="primary" label={option} />
        );
      })
    }
    renderInput={(params) => (
      <TextField {...params} label={label} placeholder={value.length ? '' : placeholder} />
    )}
  />
);

export default FacultyFilter;
