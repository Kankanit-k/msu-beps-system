'use client';

// ฟอร์มเลือกหลักสูตร: คณะ · ระดับ · เทอม/ปี · หลักสูตร + ตารางอัตราค่าธรรมเนียม — ใช้ร่วมกันใน W7 และหน้าปรับปรุงหลักสูตร

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import NumberTextField from '@components/NumberTextField';
import { feesForProgram, feeVariant, fmtFee } from '@views/tuition/feeData';
import type { ProgRow } from '@/data/mockup';

import { EDUCATION_LEVELS, progOptionLabel } from '../programData';

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

/** อัตราค่าธรรมเนียมการศึกษาของหลักสูตรที่เลือก (แท็บ ค่าธรรมเนียม68 — ข้อมูลเดียวกับหน้า W8) — บรรทัดเดียว ไม่กินพื้นที่ */
const ProgramFeeRates = ({ p }: { p: ProgRow }) => {
  const fees = feesForProgram(p.fac, p.deg);

  return (
    <Box
      sx={{
        mt: 2,
        px: 3,
        py: 1.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: 3,
        rowGap: 0.5,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
        💵 ค่าธรรมเนียม บาท/ภาค (ไทย · ต่างชาติ)
      </Typography>
      {fees.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          จับคู่อัตราไม่ได้ — ชื่อหลักสูตรในแท็บค่าธรรมเนียมสะกดต่างจากทะเบียนหลักสูตร ดูได้ที่หน้าค่าธรรมเนียม
        </Typography>
      ) : (
        fees.map((f) => (
          <Typography key={feeVariant(f)} variant="caption" sx={{ whiteSpace: 'nowrap' }}>
            {feeVariant(f)}: <b>{fmtFee(f)}</b>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {' · '}
              {f.rateIntl === null ? '—' : fmtB(f.rateIntl)}
            </Box>
          </Typography>
        ))
      )}
    </Box>
  );
};

export interface ProgramPickerProps {
  facultyOptions: string[];
  fac: string | null;
  onFacChange: (v: string | null) => void;
  level: string;
  onLevelChange: (v: string) => void;
  semesters: number;
  onSemestersChange: (v: number) => void;
  refOptions: ProgRow[];
  refProg: ProgRow | null;
  onRefChange: (p: ProgRow | null) => void;
  refLabel: string;
  refRequired: boolean;
  /** คำอธิบายช่องหลักสูตร (tooltip) */
  refHint: string;
  /** วางในช่องแคบ — แบ่ง 2 บรรทัดแทนเรียงบรรทัดเดียว */
  compact?: boolean;
  /** ยืนยันขั้นที่ 1 แล้ว — ล็อกทุกช่อง */
  disabled?: boolean;
}

const ProgramPicker = (props: ProgramPickerProps) => {
  const { fac, level, refOptions, refProg, compact, disabled } = props;
  // ฟอร์มเต็มความกว้าง: เรียงบรรทัดเดียวตามลำดับที่ต้องเลือก คณะ → ระดับ → หลักสูตร · ช่องแคบ (compact) แบ่ง 2 บรรทัด
  const size = compact
    ? { fac: { xs: 12, sm: 5 }, level: { xs: 8, sm: 4 }, prog: 12, sem: { xs: 4, sm: 3 } }
    : { fac: { xs: 12, md: 4 }, level: { xs: 8, md: 2 }, prog: { xs: 12, md: 5 }, sem: { xs: 4, md: 1 } };

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={size.fac}>
          <Autocomplete
            size="small"
            options={props.facultyOptions}
            value={fac}
            disabled={disabled}
            onChange={(_, v) => props.onFacChange(v)}
            renderInput={(params) => <TextField {...params} label="คณะ / วิทยาลัย" required />}
          />
        </Grid>
        <Grid size={size.level}>
          <Autocomplete
            size="small"
            disableClearable
            options={EDUCATION_LEVELS}
            value={level}
            disabled={disabled}
            onChange={(_, v) => props.onLevelChange(v)}
            renderInput={(params) => <TextField {...params} label="ระดับ" required />}
          />
        </Grid>
        {/* จอกว้างย้ายไปท้ายบรรทัด · จอแคบ/ช่องแคบอยู่คู่กับช่องระดับ */}
        <Grid size={size.sem} sx={compact ? undefined : { order: { md: 1 } }}>
          <NumberTextField
            size="small"
            fullWidth
            label="เทอม/ปี"
            value={props.semesters}
            disabled={disabled}
            onChange={props.onSemestersChange}
            error={props.semesters < 1}
            helperText={props.semesters < 1 ? 'อย่างน้อย 1' : undefined}
          />
        </Grid>
        <Grid size={size.prog}>
          <Autocomplete
            size="small"
            options={refOptions}
            getOptionLabel={progOptionLabel}
            isOptionEqualToValue={(a, b) => a === b}
            value={refProg}
            disabled={disabled || !fac}
            onChange={(_, v) => props.onRefChange(v)}
            noOptionsText={`ไม่มีหลักสูตร${level}ในคณะนี้`}
            renderInput={(params) => (
              <TextField
                {...params}
                label={props.refLabel}
                required={props.refRequired}
                placeholder={
                  fac ? `${refOptions.length} หลักสูตร${level}ในคณะ` : 'เลือกคณะก่อน'
                }
                InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                title={props.refHint}
              />
            )}
          />
        </Grid>
      </Grid>

      {refProg && <ProgramFeeRates p={refProg} />}
    </>
  );
};

export default ProgramPicker;
