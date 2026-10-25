'use client';

// ขั้นที่ 1 — วัตถุประสงค์ ชื่อหลักสูตรใหม่ แล้วเลือกคณะ/ระดับ/หลักสูตรผ่าน ProgramPicker

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DotTitle } from '@components/ChartBits';
import type { ProgRow } from '@/data/mockup';

import ProgramPicker from './ProgramPicker';

export type Purpose = 'improve' | 'new';

interface Props {
  purpose: Purpose;
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
  /** ไม่ส่ง = ซ่อนปุ่มล้างฟอร์ม (ยืนยันแล้ว) */
  onClear?: () => void;
  /** ปรับปรุงหลักสูตร: ยืนยันขั้นที่ 1 (รวมเทอม/ปี) ก่อนขึ้นตาราง ② */
  confirmed?: boolean;
  /** เหตุที่ยังยืนยันไม่ได้ — null = ยืนยันได้ */
  confirmBlocker?: string | null;
  onConfirm?: () => void;
  onEdit?: () => void;
  /** อาจารย์: ระบบเลือกหลักสูตรของตนให้แล้ว เปลี่ยนไม่ได้ */
  lockProgram?: boolean;
}

const ProgramStep = (props: Props) => {
  const { purpose } = props;

  return (
    <Card>
      <CardHeader
        title={
          <DotTitle color="primary.main">
            {purpose === 'improve' ? '① เลือกหลักสูตรที่จะปรับปรุง' : '① ข้อมูลหลักสูตร'}
          </DotTitle>
        }
        subheader={
          purpose === 'improve'
            ? undefined
            : 'ตั้งชื่อหลักสูตร → เลือก "คณะ" → "ระดับ" → "หลักสูตรอ้างอิง" (หรือกรอกต้นทุนเอง)'
        }
        action={
          <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
            {props.onConfirm && props.confirmed && (
              <Button
                size="small"
                variant="outlined"
                onClick={props.onEdit}
                startIcon={<i className="ri-edit-line" />}
              >
                แก้ไขข้อมูลหลักสูตร
              </Button>
            )}
            {props.onClear && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={props.onClear}
                startIcon={<i className="ri-eraser-line" />}
              >
                ล้างฟอร์ม
              </Button>
            )}
          </Box>
        }
      />
      <CardContent>
        {purpose === 'new' && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={12}>
              <TextField
                size="small"
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
          </Grid>
        )}
        <ProgramPicker
          facultyOptions={props.facultyOptions}
          fac={props.fac}
          onFacChange={props.onFacChange}
          level={props.level}
          onLevelChange={props.onLevelChange}
          semesters={props.semesters}
          onSemestersChange={props.onSemestersChange}
          refOptions={props.refOptions}
          refProg={props.refProg}
          onRefChange={props.onRefChange}
          refLabel={props.refLabel}
          refRequired={purpose === 'improve'}
          disabled={props.confirmed}
          lockProgram={props.lockProgram}
          refHint={
            purpose === 'improve'
              ? 'ดึงต้นทุน งบประมาณ และจำนวนนิสิตปัจจุบันของหลักสูตรนี้'
              : 'ใช้ต้นทุน งบประมาณ และจำนวนนิสิตจริงของหลักสูตรนี้เป็นฐาน · เว้นว่างได้ถ้ากรอกต้นทุนเอง'
          }
        />

        {props.onConfirm && !props.confirmed && (
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 2,
            }}
          >
            {props.confirmBlocker && (
              <Typography variant="caption" color="text.secondary">
                {props.confirmBlocker}
              </Typography>
            )}
            <Button
              variant="contained"
              size="small"
              disabled={!!props.confirmBlocker}
              onClick={props.onConfirm}
            >
              ยืนยันข้อมูลหลักสูตร
            </Button>
          </Box>
        )}

        {props.onManual && (
          <Alert
            severity="info"
            variant="outlined"
            sx={{ mt: 3, py: 0, alignItems: 'center' }}
            action={
              <Button variant="contained" size="small" onClick={props.onManual}>
                กรอกต้นทุนเอง
              </Button>
            }
          >
            ไม่มีหลักสูตรอ้างอิง? เว้นช่องว่างไว้ แล้วกด &quot;กรอกต้นทุนเอง&quot; —
            กรอกต้นทุนรายหมวดในตารางด้านล่าง
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgramStep;
