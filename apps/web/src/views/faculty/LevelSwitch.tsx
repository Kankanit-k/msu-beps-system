'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { ALL_LEVELS, useFaculty } from './FacultyContext';

/** ตัวเลือกระดับการศึกษา — คุมกราฟและตารางทั้งหมดของหน้า · ตัวเลือก = ทุกระดับ + ระดับที่คณะมี (ตัวเลข = จำนวนหลักสูตร) */
const LevelSwitch = () => {
  const { levels, level, setLevel, allProgs } = useFaculty();

  if (levels.length === 0) return null;

  const count = (lvl: string) =>
    lvl === ALL_LEVELS ? allProgs.length : (levels.find((l) => l.lvl === lvl)?.n ?? 0);

  return (
    <Autocomplete
      size="small"
      disableClearable
      options={[ALL_LEVELS, ...levels.map((l) => l.lvl)]}
      getOptionLabel={(lvl) => `${lvl} (${count(lvl)})`}
      value={level}
      onChange={(_, v) => setLevel(v)}
      sx={{ width: 190 }}
      renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
    />
  );
};

export default LevelSwitch;
