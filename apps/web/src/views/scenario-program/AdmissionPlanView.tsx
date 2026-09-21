'use client';

/**
 * หน้า "แผนการรับนิสิต" — ใช้การ์ดแยกจุดคุ้มทุนได้เดี่ยวๆ โดยไม่ต้องกรอกโครงสร้างต้นทุนใหม่
 *
 * รับ Q* เข้ามาสองทาง: เลือกจากผลคำนวณที่บันทึกไว้ (localStorage — ดู historyStore.ts)
 * หรือกรอกเอง สำหรับกรณีที่ผู้ใช้มีตัวเลขจุดคุ้มทุนจากเอกสารอื่นอยู่แล้ว
 */

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';

import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes from '@components/DataCaveatNotes';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { computeBreakEven } from '@views/breakeven/calc';

import AdmissionBreakdown from './AdmissionBreakdown';
import PlanComparison from './PlanComparison';
import SegmentedBreakEven from './SegmentedBreakEven';
import { loadHistory } from './historyStore';
import type { ProgramHistoryEntry } from './types';
import { useAdmissionPlan } from './useAdmissionPlan';

type Source = 'saved' | 'manual';

const entryLabel = (e: ProgramHistoryEntry) =>
  `${e.name} (${e.level}) · ${e.fac || 'ไม่ระบุคณะ'} · ${e.time}`;

const AdmissionPlanView = () => {
  const [source, setSource] = useState<Source>('saved');
  const [history, setHistory] = useState<ProgramHistoryEntry[] | null>(null);
  const [selected, setSelected] = useState<ProgramHistoryEntry | null>(null);
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const [manualName, setManualName] = useState('');
  const [manualQStar, setManualQStar] = useState(0);

  // localStorage อ่านได้หลัง mount เท่านั้น — null = ยังไม่รู้ว่ามีประวัติไหม
  useEffect(() => {
    const loaded = loadHistory();

    setHistory(loaded);
    setSelected(loaded[0] ?? null);

    if (loaded.length === 0) setSource('manual');
  }, []);

  const uni = computeBreakEven(RAW.UNI, mode);

  const qStar = useMemo(() => {
    if (source === 'manual') return manualQStar > 0 ? manualQStar : null;

    if (!selected) return null;

    return (mode === 'with_government' ? selected.withGov : selected.withoutGov).qStar;
  }, [source, manualQStar, selected, mode]);

  const programName =
    source === 'manual' ? manualName || 'ไม่ระบุหลักสูตร' : (selected?.name ?? '—');

  // สถานะร่วมของทั้งสามการ์ด — สัดส่วน อัตรารายกลุ่ม และรายการแผนที่บันทึกไว้
  const planState = useAdmissionPlan(programName, qStar, mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* หัวหน้าจอชุดเดียวกับหน้าอื่น — ตัด mb ของแถบสุดท้ายออก เพราะคอนเทนเนอร์นี้เว้นระยะด้วย gap แล้ว */}
      <Box sx={{ '& > :last-child': { mb: 0 } }}>
        {/* หน้านี้ไม่มีรหัสจอใน SA.md (เป็นส่วนต่อขยายของ W7) จึงไม่ส่ง code */}
        <PageHeaderBar
          title="แยกจุดคุ้มทุนตามแผนการรับนิสิต"
          mode={mode}
          onModeChange={setMode}
          q={uni.q}
          profit={uni.profit}
        />

        {/* Q* มาจากผลคำนวณที่ผู้ใช้บันทึกเอง จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง */}
        <DataCaveatNotes profit={uni.profit} limitations={false} />
      </Box>

      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">จุดคุ้มทุนรวม (Q*)</DotTitle>}
          subheader="เลือกผลคำนวณที่บันทึกไว้จากหน้าจุดคุ้มทุนรายหลักสูตร หรือกรอกตัวเลขเอง"
        />
        <CardContent>
          <ToggleButtonGroup
            size="small"
            exclusive
            color="primary"
            value={source}
            onChange={(_, v: Source | null) => v && setSource(v)}
            sx={{ mb: 3 }}
          >
            <ToggleButton value="saved">เลือกจากผลคำนวณที่บันทึกไว้</ToggleButton>
            <ToggleButton value="manual">กรอก Q* เอง</ToggleButton>
          </ToggleButtonGroup>

          {history === null ? (
            <Skeleton variant="rounded" height={56} />
          ) : source === 'saved' ? (
            history.length === 0 ? (
              <Alert
                severity="info"
                variant="outlined"
                action={
                  <Button size="small" href="/scenario/program">
                    ไปคำนวณ
                  </Button>
                }
              >
                ยังไม่มีผลคำนวณที่บันทึกไว้ในเครื่องนี้ — คำนวณที่หน้า
                &quot;จุดคุ้มทุนรายหลักสูตร&quot; ก่อน หรือสลับไปโหมดกรอก Q* เอง
              </Alert>
            ) : (
              <Autocomplete
                options={history}
                getOptionLabel={entryLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={selected}
                onChange={(_, v) => setSelected(v)}
                renderInput={(params) => <TextField {...params} label="📚 ผลคำนวณที่บันทึกไว้" />}
              />
            )
          ) : (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  fullWidth
                  label="✎ ชื่อหลักสูตร"
                  placeholder="เช่น วิทยาการปัญญาประดิษฐ์"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="จุดคุ้มทุนรวม (Q*)"
                  value={manualQStar || ''}
                  onChange={(e) => setManualQStar(Math.max(0, Number(e.target.value) || 0))}
                  error={manualQStar < 0}
                  helperText={manualQStar > 0 ? ' ' : 'กรอกจำนวนนิสิต ณ จุดคุ้มทุนมากกว่า 0'}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">คน</InputAdornment> },
                  }}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {qStar && qStar > 0 ? (
        <>
          <AdmissionBreakdown qStar={qStar} programName={programName} state={planState} />
          <SegmentedBreakEven programName={programName} revenueMode={mode} state={planState} />
        </>
      ) : (
        history !== null && (
          <Alert severity="info" variant="outlined">
            {source === 'saved' && selected
              ? 'ผลคำนวณรายการนี้หาจุดคุ้มทุนไม่ได้ในโหมดที่เลือก (CM ≤ 0) — ลองสลับโหมดรายได้'
              : 'เลือกหรือกรอกจุดคุ้มทุนรวม (Q*) ก่อน เพื่อแตกยอดตามแผนการรับนิสิต'}
          </Alert>
        )
      )}

      <PlanComparison state={planState} />

      <Snackbar
        open={!!planState.toast}
        autoHideDuration={4000}
        onClose={() => planState.setToast(null)}
        message={planState.toast}
      />
    </Box>
  );
};

export default AdmissionPlanView;
