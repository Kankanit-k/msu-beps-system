'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

// Component Imports
import InfoTip from '@components/InfoTip';
import { MOCK_RUN } from '@components/PageHeaderBar';

/** ข้อมูลนิสิตและค่าธรรมเนียมประมวลผลเป็นรอบปีการศึกษา — ต้นทุนเป็นรอบปีงบ (มติ 26 ต.ค. 2569: ใช้ป้าย "ปีการศึกษา" ทุกหน้า) */
const YEAR_INFO =
  'ปีการศึกษา (Academic Year) — จำนวนนิสิตตัดยอด ณ วันปิดลงทะเบียนภาคเรียนที่ 2 · ค่าธรรมเนียมการศึกษาคิดตามรอบปีการศึกษาเดียวกัน · ต้นทุนมาจากชีตค่าใช้จ่าย (กองคลัง) รอบปีงบประมาณ ต.ค.–ก.ย. ของปีเดียวกัน';

/** ช่องเลือกปีบนแถบหัว Dashboard — ชุดข้อมูลมีเฉพาะปีล่าสุด ปีอื่นแสดงไว้แต่เลือกไม่ได้จนกว่าจะนำเข้าข้อมูล */
const YearFilter = ({ value, onChange }: { value: string; onChange: (y: string) => void }) => (
  <>
    <Autocomplete
      size="small"
      disableClearable
      options={[...MOCK_RUN.budgetYears].reverse()}
      getOptionDisabled={(y) => y !== MOCK_RUN.budgetYear}
      getOptionLabel={(y) => (y === MOCK_RUN.budgetYear ? y : `${y} (ยังไม่มีข้อมูล)`)}
      value={value}
      onChange={(_, v) => onChange(v)}
      sx={{ width: 130 }}
      renderInput={(params) => <TextField {...params} label="ปีการศึกษา" />}
    />
    <InfoTip text={YEAR_INFO} />
  </>
);

export default YearFilter;
