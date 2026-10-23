'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

// Component Imports
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';
import InfoTip from '@components/InfoTip';
import { shortFacName } from '@views/breakeven/calc';

import { FAC_NAMES, useFaculty } from './FacultyContext';
import LevelSwitch from './LevelSwitch';

/** ข้อมูลนิสิตและค่าธรรมเนียมประมวลผลเป็นรอบปีการศึกษา ไม่ใช่ปีงบประมาณ */
const YEAR_INFO =
  'ปีการศึกษา (Academic Year) — จำนวนนิสิตตัดยอด ณ วันปิดลงทะเบียนภาคเรียนที่ 2 · ค่าธรรมเนียมการศึกษาคิดตามรอบปีการศึกษาเดียวกัน (ไม่ใช่ปีงบประมาณ ต.ค.–ก.ย.)';

/**
 * แถบติดด้านบนของภาพรวมคณะและหน้าย่อย — บอกคณะ · ปีการศึกษา · รวม/ไม่รวมเงินแผ่นดิน เสมอ
 * ระดับมหาวิทยาลัยเลือกคณะได้ · ระดับคณะ/อาจารย์ไม่เห็นตัวเลือกคณะ (คณะมาจากสังกัด)
 */
const FacultyStatusBar = ({
  section,
  showRevenue,
  showLevel,
}: {
  section?: string;
  showRevenue?: boolean;
  showLevel?: boolean;
}) => {
  const { fac, canPick, setFac, year, setYear, mode, setMode, facRes } = useFaculty();

  return (
    <PageHeaderBar
      title={`ภาพรวมคณะ${section ? ` › ${section}` : ''} — ${shortFacName(fac.name)}`}
      mode={mode}
      onModeChange={setMode}
      q={facRes.q}
      profit={facRes.profit}
      revenue={showRevenue ? facRes.tr : undefined}
      extra={
        <>
          {showLevel && <LevelSwitch />}
          {canPick && (
            <Autocomplete
              size="small"
              disableClearable
              options={FAC_NAMES}
              value={fac.name}
              onChange={(_, v) => setFac(v)}
              sx={{ width: 260 }}
              noOptionsText="ไม่พบคณะที่ค้นหา"
              renderInput={(params) => <TextField {...params} label="คณะ" />}
            />
          )}
          <Autocomplete
            size="small"
            disableClearable
            options={[...MOCK_RUN.budgetYears].reverse()}
            getOptionDisabled={(y) => y !== MOCK_RUN.budgetYear}
            getOptionLabel={(y) => (y === MOCK_RUN.budgetYear ? y : `${y} (ยังไม่มีข้อมูล)`)}
            value={year}
            onChange={(_, v) => setYear(v)}
            sx={{ width: 130 }}
            renderInput={(params) => <TextField {...params} label="ปีการศึกษา" />}
          />
          <InfoTip text={YEAR_INFO} />
        </>
      }
    />
  );
};

export default FacultyStatusBar;
