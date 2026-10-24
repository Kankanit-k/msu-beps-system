'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { useFaculty } from './FacultyContext';

/** ตัวเลือกระดับการศึกษา — คุมกราฟและตารางทั้งหมดของหน้า (ไม่มี "ทุกระดับ" เพราะห้ามรวมระดับ) · ตัวเลือก = ทุกระดับที่คณะมี */
const LevelSwitch = () => {
  const { levels, level, setLevel } = useFaculty();

  if (levels.length === 0) return null;

  const count = (lvl: string) => levels.find((l) => l.lvl === lvl)?.n ?? 0;

  return (
    <Autocomplete
      size="small"
      disableClearable
      options={levels.map((l) => l.lvl)}
      getOptionLabel={(lvl) => `${lvl} (${count(lvl)})`}
      value={level}
      onChange={(_, v) => setLevel(v)}
      sx={{ width: 190 }}
      renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
    />
  );
};

export default LevelSwitch;
