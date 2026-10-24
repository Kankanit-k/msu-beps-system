'use client';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

// Component Imports
import PageHeaderBar from '@components/PageHeaderBar';
import InfoTip from '@components/InfoTip';
import { shortFacName } from '@views/breakeven/calc';

import { ALL_FACS, FAC_NAMES, STATUS_FILTER_LABEL, useDeepDive } from './DeepDiveContext';
import type { StatusFilter } from './DeepDiveContext';
import { COST_YEARS, DD_LAST, DD_YEARS, lastValue, sumSeries } from './deepDiveData';

const YEAR_INFO = `ปีงบประมาณ N จับคู่กับปีการศึกษา N แบบเดียวกับชีตจุดคุ้มทุน · ค่าเทอมย้อนหลังมาจากระบบทะเบียน (ยอดเรียกเก็บจริง) · ต้นทุน/เงินแผ่นดินมีเฉพาะปีงบ ${COST_YEARS.join(', ')} — ปีอื่นรอข้อมูลงบประมาณจากกองแผน`;

const FILTERS = Object.keys(STATUS_FILTER_LABEL) as Exclude<StatusFilter, 'nodata'>[];

/**
 * แถบกรองกลางของหมวดเจาะลึก (ใช้ซ้ำทุกหน้า) — คณะ · ระดับ · ฐานรายได้ ติดหัวจอ
 * แถวล่าง: ชิปสถานะ + ค้นหาหลักสูตร · ค่าทั้งหมดอยู่ใน URL และไม่หายเมื่อสลับหน้า
 */
const HistoryFilterBar = ({ section, hideStatus }: { section: string; hideStatus?: boolean }) => {
  const dd = useDeepDive();
  const latestIdx = DD_YEARS.length - 1;
  const q = dd.scope.reduce((a, x) => a + (x.students[latestIdx] ?? x.p.Q), 0);
  const profit = lastValue(sumSeries(dd.scope.map((x) => x.profit[dd.mode]))) ?? 0;
  const facLabel = dd.fac ? shortFacName(dd.fac) : dd.canPick ? 'ทุกคณะ' : 'ยังไม่ได้เลือกคณะ';

  return (
    <>
      <PageHeaderBar
        title={`เจาะลึกจุดคุ้มทุน › ${section} — ${facLabel}`}
        mode={dd.mode}
        onModeChange={dd.setMode}
        q={q}
        profit={profit}
        extra={
          <>
            {dd.canPick && (
              <Autocomplete
                size="small"
                disableClearable
                options={[ALL_FACS, ...FAC_NAMES]}
                getOptionLabel={(f) => f || 'ทุกคณะ (ทั้งมหาวิทยาลัย)'}
                value={dd.fac}
                onChange={(_, v) => dd.setFac(v)}
                sx={{ width: 260 }}
                noOptionsText="ไม่พบคณะที่ค้นหา"
                renderInput={(params) => <TextField {...params} label="คณะ" />}
              />
            )}
            {dd.levels.length > 0 && (
              <Autocomplete
                size="small"
                disableClearable
                options={dd.levels.map((l) => l.lvl)}
                getOptionLabel={(l) => `${l} (${dd.levels.find((x) => x.lvl === l)?.n ?? 0})`}
                value={dd.level}
                onChange={(_, v) => dd.setLevel(v)}
                sx={{ width: 190 }}
                renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
              />
            )}
            <Chip
              size="small"
              variant="outlined"
              icon={<i className="ri-calendar-line" />}
              label={`ย้อนหลัง ${DD_YEARS[0]}–${DD_LAST}`}
            />
            <InfoTip text={YEAR_INFO} />
          </>
        }
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 4 }}>
        {!hideStatus &&
          FILTERS.map((s) => (
            <Chip
              key={s}
              label={STATUS_FILTER_LABEL[s]}
              color={dd.status === s ? 'primary' : 'default'}
              variant={dd.status === s ? 'filled' : 'outlined'}
              onClick={() => dd.setStatus(s)}
            />
          ))}
        <TextField
          size="small"
          placeholder="ค้นหาหลักสูตร"
          value={dd.search}
          onChange={(e) => dd.setSearch(e.target.value)}
          sx={{ ml: { md: 'auto' }, width: { xs: '100%', md: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <i className="ri-search-line" />
                </InputAdornment>
              ),
              endAdornment: dd.search ? (
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => dd.setSearch('')}
                >
                  <i className="ri-close-line" />
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
      </Box>
    </>
  );
};

export default HistoryFilterBar;
