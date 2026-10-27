'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { ALL_LEVELS, useFaculty } from './FacultyContext';

/**
 * ตัวเลือกระดับการศึกษา — คุมกราฟและตารางทั้งหมดของหน้า · ตัวเลข = จำนวนหลักสูตร
 * ค่าเริ่ม = dropdown ทุกระดับ + ระดับที่คณะมี · tabs = แถบปุ่มทีละระดับ ไม่มีทุกระดับ (คู่กับ setRequireLevel)
 */
const LevelSwitch = ({ tabs }: { tabs?: boolean }) => {
  const { levels, level, setLevel, allProgs } = useFaculty();

  if (levels.length === 0) return null;

  if (tabs)
    return (
      <ToggleButtonGroup
        size="small"
        exclusive
        color="primary"
        value={level}
        onChange={(_, v: string | null) => v && setLevel(v)}
        aria-label="ระดับการศึกษา"
      >
        {levels.map((l) => (
          <ToggleButton key={l.lvl} value={l.lvl}>
            {l.lvl} ({l.n})
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );

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
