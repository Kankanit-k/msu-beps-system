'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
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

/** ต้นทุนในชีตเป็นรอบปีงบประมาณ ต่างจากนิสิต/ค่าธรรมเนียมที่เป็นปีการศึกษา — ค่าเสื่อมยังเป็นปีงบก่อนหน้า */
const COST_YEAR_INFO =
  'ต้นทุนมาจากชีตค่าใช้จ่าย (กองคลัง) ซึ่งเป็นรอบปีงบประมาณ ต.ค.–ก.ย. · ค่าเสื่อมราคาใช้ปีงบก่อนหน้า เพราะกองคลังยังไม่ได้กระจายค่าเสื่อมปีล่าสุดลงรายหลักสูตร';

/**
 * แถบติดด้านบนของภาพรวมคณะและหน้าย่อย — บอกคณะ · ปีการศึกษา · รวม/ไม่รวมเงินแผ่นดิน เสมอ
 * ระดับมหาวิทยาลัยเลือกคณะได้ · ระดับคณะ/อาจารย์ไม่เห็นตัวเลือกคณะ (คณะมาจากสังกัด)
 */
const FacultyStatusBar = ({
  section,
  showRevenue,
  showCost,
  showLevel,
}: {
  section?: string;
  showRevenue?: boolean;
  /** หน้าต้นทุน: ชิปต้นทุนรวม + ป้ายปีงบของข้อมูลต้นทุน */
  showCost?: boolean;
  showLevel?: boolean;
}) => {
  const { fac, canPick, setFac, year, setYear, mode, setMode, facRes } = useFaculty();

  return (
    <>
      <PageHeaderBar
        title={`ภาพรวมคณะ${section ? ` › ${section}` : ''} — ${shortFacName(fac.name)}`}
        mode={mode}
        onModeChange={setMode}
        q={facRes.q}
        profit={facRes.profit}
        revenue={showRevenue ? facRes.tr : undefined}
        cost={showCost ? facRes.tc : undefined}
        extra={
          <>
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
            {showLevel && <LevelSwitch />}
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
            {showCost && (
              <Chip
                size="small"
                variant="outlined"
                label={`ต้นทุน: ปีงบ ${year} · ค่าเสื่อม ปีงบ ${Number(year) - 1}`}
                icon={<i className="ri-calendar-line" />}
              />
            )}
            {showCost && <InfoTip text={COST_YEAR_INFO} />}
          </>
        }
      />
    </>
  );
};

export default FacultyStatusBar;
