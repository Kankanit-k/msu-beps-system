'use client';

// ตัวแก้ไขรายการต้นทุน (TFC/TVC) แบบเพิ่ม/ลบแถวได้ — ใช้ร่วมกันระหว่างการ์ด TFC และ TVC
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { newCostRow, sumCostRows, type CostRow } from './costPresets';

interface Props {
  rows: CostRow[];
  presets: string[];
  onChange: (rows: CostRow[]) => void;
  /** ชื่อหัวรายการ เช่น "รายการต้นทุนคงที่" */
  heading: string;
  /** ป้ายกำกับผลรวม เช่น "รวม TFC" */
  totalLabel: string;
  addLabel: string;
  /** สีประจำการ์ด — TFC ใช้ primary, TVC ใช้ success (ตาม mockup) */
  color: 'primary' | 'success';
}

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

const CostRowsEditor = ({
  rows,
  presets,
  onChange,
  heading,
  totalLabel,
  addLabel,
  color,
}: Props) => {
  const update = (id: string, patch: Partial<CostRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const add = () => onChange([...rows, newCostRow()]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }} color={`${color}.main`}>
          {heading}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalLabel}:{' '}
          <Box component="span" sx={{ fontWeight: 700, color: `${color}.main` }}>
            {fmtB(sumCostRows(rows))}
          </Box>{' '}
          บาท
        </Typography>
      </Box>

      {rows.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {rows.map((row) => (
            <Box key={row.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Autocomplete
                freeSolo
                size="small"
                options={presets}
                value={row.label}
                onInputChange={(_, v) => update(row.id, { label: v })}
                sx={{ flex: 1.4 }}
                renderInput={(params) => (
                  <TextField {...params} label="รายการ" placeholder="เลือกหรือกรอกชื่อรายการ" />
                )}
              />
              <TextField
                size="small"
                type="number"
                label="จำนวนเงิน (บาท)"
                value={row.amount || ''}
                onChange={(e) => update(row.id, { amount: Number(e.target.value) || 0 })}
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(row.id)}
                title="ลบรายการ"
              >
                <i className="ri-close-line" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Button
        fullWidth
        variant="outlined"
        color={color}
        onClick={add}
        sx={{ borderStyle: 'dashed', fontWeight: 600 }}
      >
        {addLabel}
      </Button>
    </Box>
  );
};

export default CostRowsEditor;
