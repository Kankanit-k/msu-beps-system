'use client';

// MUI Imports
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { useFaculty } from './FacultyContext';

/** ตัวสลับระดับการศึกษา — คุมกราฟและตารางทั้งหมดของหน้า (ไม่มี "ทุกระดับ" เพราะห้ามรวมระดับ) */
const LevelSwitch = () => {
  const { levels, level, setLevel } = useFaculty();

  if (levels.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }} color="text.secondary">
        ระดับ:
      </Typography>
      <ToggleButtonGroup
        size="small"
        color="primary"
        exclusive
        value={level}
        onChange={(_, v: string | null) => v && setLevel(v)}
        sx={{ flexWrap: 'wrap' }}
      >
        {levels.map((l) => (
          <ToggleButton key={l.lvl} value={l.lvl}>
            {l.lvl} ({l.n})
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default LevelSwitch;
