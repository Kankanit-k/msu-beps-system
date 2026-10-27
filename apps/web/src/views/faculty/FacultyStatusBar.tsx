'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';

// Component Imports
import PageHeaderBar from '@components/PageHeaderBar';
import InfoTip from '@components/InfoTip';
import YearFilter from '@components/YearFilter';
import { shortFacName } from '@views/breakeven/calc';

import { FAC_NAMES, useFaculty } from './FacultyContext';
import LevelSwitch from './LevelSwitch';

/** ต้นทุนในชีตเป็นรอบปีงบประมาณ ต่างจากนิสิต/ค่าธรรมเนียมที่เป็นปีการศึกษา — ค่าเสื่อมยังเป็นปีงบก่อนหน้า */
const COST_YEAR_INFO =
  'ต้นทุนมาจากชีตค่าใช้จ่าย (กองคลัง) ซึ่งเป็นรอบปีงบประมาณ ต.ค.–ก.ย. · ค่าเสื่อมราคาใช้ปีงบก่อนหน้า เพราะกองคลังยังไม่ได้กระจายค่าเสื่อมปีล่าสุดลงรายหลักสูตร';

/**
 * แถบติดด้านบนของภาพรวมคณะและหน้าผลการดำเนินงาน — บอกคณะ · ปีการศึกษา · รวม/ไม่รวมเงินแผ่นดิน เสมอ
 * ระดับมหาวิทยาลัยเลือกคณะได้ · ระดับคณะ/อาจารย์ไม่เห็นตัวเลือกคณะ (คณะมาจากสังกัด)
 * section = ชื่อหน้าในหมวดผลการดำเนินงาน (ไม่ส่ง = ภาพรวมคณะ)
 */
const FacultyStatusBar = ({
  section,
  showRevenue,
  showCost,
  showLevel,
  levelTabs,
}: {
  section?: string;
  showRevenue?: boolean;
  /** หน้าต้นทุน: ชิปต้นทุนรวม + ป้ายปีงบของข้อมูลต้นทุน */
  showCost?: boolean;
  showLevel?: boolean;
  /** ระดับเป็นแถบปุ่มทีละระดับ ไม่มีทุกระดับ */
  levelTabs?: boolean;
}) => {
  const { fac, canPick, setFac, year, setYear, mode, setMode, facRes } = useFaculty();

  return (
    <>
      <PageHeaderBar
        title={section ? `ผลการดำเนินงาน › ${section}` : 'ภาพรวมคณะ'}
        crumb={`› ${shortFacName(fac.name)}`}
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
            {/* เรียง ฐานรายได้ → คณะ → ระดับ → ปี (ระดับขึ้นกับคณะที่เลือก) */}
            {showLevel && <LevelSwitch tabs={levelTabs} />}
            <YearFilter value={year} onChange={setYear} />
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
