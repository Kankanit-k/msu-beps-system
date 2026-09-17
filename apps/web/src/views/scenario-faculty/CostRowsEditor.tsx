'use client';

// ตัวแก้ไขรายการต้นทุน (TFC/TVC) แบบเพิ่ม/ลบแถวได้ — ใช้ร่วมกันระหว่างการ์ด TFC และ TVC
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';

import type { CostRow } from './costPresets';

interface Props {
  rows: CostRow[];
  presets: string[];
  onChange: (rows: CostRow[]) => void;
  addLabel: string;
}

const CostRowsEditor = ({ rows, presets, onChange, addLabel }: Props) => {
  const update = (id: string, patch: Partial<CostRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const add = () => onChange([...rows, { id: `c${Date.now()}-${Math.random()}`, label: '', amount: 0 }]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
        {rows.map((row) => (
          <Box key={row.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Autocomplete
              freeSolo
              size="small"
              options={presets}
              value={row.label}
              onInputChange={(_, v) => update(row.id, { label: v })}
              sx={{ flex: 1.4 }}
              renderInput={(params) => <TextField {...params} label="รายการ" placeholder="เลือกหรือกรอกชื่อรายการ" />}
            />
            <TextField
              size="small"
              type="number"
              label="จำนวนเงิน (บาท)"
              value={row.amount || ''}
              onChange={(e) => update(row.id, { amount: Number(e.target.value) || 0 })}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" color="error" onClick={() => remove(row.id)} title="ลบรายการ">
              <i className="ri-close-line" />
            </IconButton>
          </Box>
        ))}
        {rows.length === 0 && (
          <Box sx={{ color: 'text.disabled', fontSize: 13, textAlign: 'center', py: 2 }}>ยังไม่มีรายการ</Box>
        )}
      </Box>
      <Button size="small" variant="outlined" startIcon={<i className="ri-add-line" />} onClick={add} sx={{ alignSelf: 'flex-start' }}>
        {addLabel}
      </Button>
    </Box>
  );
};

export default CostRowsEditor;
