'use client';

// ขั้นที่ 1 — วัตถุประสงค์ คณะ ระดับ หลักสูตร และอัตราค่าธรรมเนียมของหลักสูตรที่เลือก

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';
import NumberTextField from '@components/NumberTextField';
import { feesForProgram, feeVariant, fmtFee } from '@views/tuition/feeData';
import type { ProgRow } from '@/data/mockup';

import { EDUCATION_LEVELS, progOptionLabel } from '../programData';

export type Purpose = 'improve' | 'new';

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

/** อัตราค่าธรรมเนียมการศึกษาของหลักสูตรที่เลือก (แท็บ ค่าธรรมเนียม68 — ข้อมูลเดียวกับหน้า W8) */
const ProgramFeeRates = ({ p }: { p: ProgRow }) => {
  const fees = feesForProgram(p.fac, p.deg);

  return (
    <Box
      sx={{
        mt: 3,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: 'block', px: 3, pt: 2, fontWeight: 700, color: 'primary.main' }}
      >
        💵 อัตราค่าธรรมเนียมการศึกษา (บาท/ภาคการศึกษา)
      </Typography>
      {fees.length === 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 3, pb: 2 }}
        >
          จับคู่อัตราค่าธรรมเนียมไม่ได้ — ชื่อหลักสูตรในแท็บค่าธรรมเนียมสะกดต่างจากทะเบียนหลักสูตร
          ค้นหาเองได้ที่หน้าค่าธรรมเนียม
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ภาค · แผน</TableCell>
                <TableCell align="right">นิสิตไทย</TableCell>
                <TableCell align="right">นิสิตต่างชาติ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fees.map((f) => (
                <TableRow key={feeVariant(f)}>
                  <TableCell>{feeVariant(f)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtFee(f)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {f.rateIntl === null ? '—' : fmtB(f.rateIntl)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

interface Props {
  purpose: Purpose;
  onPurposeChange: (p: Purpose) => void;
  refLabel: string;
  newName: string;
  onNewNameChange: (v: string) => void;
  nameTouched: boolean;
  onNameBlur: () => void;
  nameError: boolean;
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
  /** เปิดหลักสูตรใหม่โดยไม่มีหลักสูตรอ้างอิง — ไปกรอกต้นทุนเอง (undefined = ไม่แสดงทางเลือกนี้) */
  onManual?: () => void;
  onClear: () => void;
}

const ProgramStep = (props: Props) => {
  const { purpose, fac, level, refOptions, refProg } = props;

  return (
    <Card>
      <CardHeader
        title={<DotTitle color="primary.main">ข้อมูลหลักสูตร</DotTitle>}
        subheader={
          purpose === 'improve'
            ? 'เลือกหลักสูตรที่จะปรับปรุงเพื่อดึงตัวเลขปัจจุบัน แล้วปรับตัวเลขหลังปรับปรุงกรณีรวม/ไม่รวมเงินแผ่นดินได้แยกกัน'
            : 'ตั้งชื่อหลักสูตรที่จะเปิด · เลือกหลักสูตรอ้างอิงเพื่อดึงต้นทุนมาเป็นฐาน หรือกรอกต้นทุนเองทั้งหมด'
        }
        action={
          <Button size="small" color="secondary" onClick={props.onClear} sx={{ mr: 2 }}>
            ล้างฟอร์ม
          </Button>
        }
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 1, fontWeight: 700, color: 'primary.main' }}
          >
            วัตถุประสงค์
          </Typography>
          <ToggleButtonGroup
            exclusive
            color="primary"
            value={purpose}
            onChange={(_, v: Purpose | null) => v && props.onPurposeChange(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="improve">ปรับปรุงหลักสูตรเดิม</ToggleButton>
            <ToggleButton value="new">เปิดหลักสูตรใหม่</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {purpose === 'new' && (
            <Grid size={12}>
              <TextField
                fullWidth
                required
                label="ชื่อหลักสูตรที่จะเปิด"
                placeholder="เช่น วท.บ. วิทยาการปัญญาประดิษฐ์"
                value={props.newName}
                onChange={(e) => props.onNewNameChange(e.target.value)}
                onBlur={props.onNameBlur}
                error={props.nameTouched && props.nameError}
                helperText={
                  props.nameTouched && props.nameError
                    ? 'ต้องระบุชื่อหลักสูตรก่อนบันทึก'
                    : undefined
                }
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 5 }}>
            <Autocomplete
              options={props.facultyOptions}
              value={fac}
              onChange={(_, v) => props.onFacChange(v)}
              renderInput={(params) => <TextField {...params} label="คณะ / วิทยาลัย" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <Autocomplete
              disableClearable
              options={EDUCATION_LEVELS}
              value={level}
              onChange={(_, v) => props.onLevelChange(v)}
              renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <NumberTextField
              fullWidth
              label="จำนวนเทอมต่อปี"
              value={props.semesters}
              onChange={props.onSemestersChange}
              error={props.semesters < 1}
              helperText={props.semesters < 1 ? 'อย่างน้อย 1 เทอม' : undefined}
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              options={refOptions}
              getOptionLabel={progOptionLabel}
              isOptionEqualToValue={(a, b) => a === b}
              value={refProg}
              disabled={!fac}
              onChange={(_, v) => props.onRefChange(v)}
              noOptionsText={`ไม่มีหลักสูตร${level}ในคณะนี้`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={props.refLabel}
                  required={purpose === 'improve'}
                  helperText={
                    !fac
                      ? 'เลือกคณะก่อน'
                      : `${refOptions.length} หลักสูตร${level}ในคณะ — ${
                          purpose === 'improve'
                            ? 'ดึงต้นทุน งบประมาณ และจำนวนนิสิตปัจจุบันของหลักสูตรนี้'
                            : 'ใช้ต้นทุน งบประมาณ และจำนวนนิสิตจริงของหลักสูตรนี้เป็นฐาน · เว้นว่างได้ถ้ากรอกต้นทุนเอง'
                        }`
                  }
                />
              )}
            />
          </Grid>
        </Grid>

        {refProg && <ProgramFeeRates p={refProg} />}

        {props.onManual && (
          <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
            <AlertTitle>ไม่มีหลักสูตรอ้างอิง? ทำตามนี้</AlertTitle>
            <Box component="ol" sx={{ m: 0, pl: 5 }}>
              <li>เว้นช่อง &quot;หลักสูตรอ้างอิง&quot; ไว้ว่าง</li>
              <li>กดปุ่ม &quot;กรอกต้นทุนเอง&quot; ด้านล่าง — ระบบจะพาไปขั้นที่ 2 &quot;ปันส่วนต้นทุนคงที่&quot; ให้เลือกวิธีปันส่วน แล้วกด &quot;ถัดไป&quot;</li>
              <li>ขั้นที่ 3 &quot;ต้นทุนและรายได้&quot; — กรอกตัวเลขต้นทุนรายหมวดของหลักสูตรใหม่ในตาราง แล้วกด &quot;ถัดไป&quot; ตามปกติ</li>
            </Box>
            <Button variant="contained" size="small" onClick={props.onManual} sx={{ mt: 2 }}>
              กรอกต้นทุนเอง
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgramStep;
