'use client';

/**
 * เทียบแผนการรับนิสิตหลายแผนข้างกัน + ส่งออก CSV
 *
 * เหตุผลที่ต้องมี: งานจริงของกองแผนงานคือ "จำลองหลายแผนแล้วเลือก" (แผนอนุรักษ์นิยม vs
 * แผนเน้นนิสิตต่างชาติ) การดูทีละแผนแล้วจดใส่กระดาษทำให้เทียบผิดได้ง่าย
 *
 * แต่ละคอลัมน์ใช้ Q* ของแผนนั้นตามที่บันทึกไว้ ไม่ได้บังคับให้ทุกแผนใช้ Q* ปัจจุบัน
 * เพราะแผนที่บันทึกคนละเวลาอาจอิงโครงสร้างต้นทุนคนละชุด
 */

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';

import { distributeHeads } from '@beps/calc-engine';

import { downloadCsv } from '@/utils/csv';

import type { AdmissionPlan, SegmentKey } from './admissionPlanStore';
import { CATEGORY_KEYS, SEGMENT_KEYS, SEGMENT_LABELS } from './admissionPlanStore';
import type { AdmissionPlanState } from './useAdmissionPlan';

/** จำนวนคอลัมน์ที่ยังอ่านรู้เรื่องบนจอเดียว — มากกว่านี้ต้องเลื่อนแนวนอนจนเทียบไม่ไหว */
const MAX_COMPARE = 4;

/** สัดส่วนรายกลุ่มของแผนหนึ่ง รวมนิสิตไทยภาคปกติที่เป็นส่วนที่เหลือ */
const planShares = (plan: AdmissionPlan): Record<SegmentKey, number> => {
  const others = CATEGORY_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: plan.enabled[k] ? plan.pct[k] || 0 : 0 }),
    {} as Record<SegmentKey, number>,
  );
  const otherTotal = CATEGORY_KEYS.reduce((sum, k) => sum + (others[k] || 0), 0);

  return { ...others, thaiRegular: Math.max(0, 100 - otherTotal) };
};

const PlanComparison = ({ state }: { state: AdmissionPlanState }) => {
  const { plans, loadingPlans } = state;
  const [picked, setPicked] = useState<AdmissionPlan[]>([]);

  // แผนที่เลือกไว้อาจถูกลบไปจากการ์ดด้านบน — กันคอลัมน์ค้าง
  const selected = useMemo(
    () => picked.filter((p) => plans.some((x) => x.id === p.id)).slice(0, MAX_COMPARE),
    [picked, plans],
  );

  const columns = useMemo(
    () =>
      selected.map((plan) => {
        const shares = planShares(plan);
        const heads = distributeHeads(
          plan.qStar,
          SEGMENT_KEYS.map((k) => shares[k]),
        );

        return {
          plan,
          shares,
          heads: Object.fromEntries(SEGMENT_KEYS.map((k, i) => [k, heads[i] ?? 0])) as Record<
            SegmentKey,
            number
          >,
        };
      }),
    [selected],
  );

  /** แสดงเฉพาะกลุ่มที่มีอย่างน้อยหนึ่งแผนใช้ — ไม่งั้นตารางเต็มไปด้วยแถว 0% */
  const visibleKeys = useMemo(
    () => SEGMENT_KEYS.filter((k) => columns.some((c) => c.shares[k] > 0)),
    [columns],
  );

  const exportCsv = () => {
    downloadCsv('เทียบแผนการรับนิสิต', [
      ['เทียบแผนการรับนิสิต'],
      ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
      [],
      ['', ...columns.map((c) => c.plan.name)],
      ['หลักสูตร', ...columns.map((c) => c.plan.programName)],
      ['บันทึกเมื่อ', ...columns.map((c) => c.plan.savedAt)],
      ['จุดคุ้มทุนรวม (คน)', ...columns.map((c) => c.plan.qStar)],
      [
        'จุดคุ้มทุนแยกรายกลุ่ม (คน)',
        ...columns.map((c) => c.plan.segmentedQStar ?? 'ยังไม่ได้คำนวณ'),
      ],
      [],
      ['กลุ่มนิสิต (สัดส่วน %)', ...columns.map((c) => c.plan.name)],
      ...visibleKeys.map((k) => [SEGMENT_LABELS[k], ...columns.map((c) => c.shares[k])]),
      [],
      ['กลุ่มนิสิต (จำนวนคน)', ...columns.map((c) => c.plan.name)],
      ...visibleKeys.map((k) => [SEGMENT_LABELS[k], ...columns.map((c) => c.heads[k])]),
      ['รวม', ...columns.map((c) => c.plan.qStar)],
    ]);
    state.setToast('ส่งออก CSV แล้ว');
  };

  return (
    <Card>
      <CardHeader
        title="เทียบแผนการรับนิสิต"
        subheader={`เลือกได้สูงสุด ${MAX_COMPARE} แผน เพื่อดูสัดส่วนและจำนวนที่ต้องรับข้างกัน`}
        action={
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            disabled={columns.length === 0}
            onClick={exportCsv}
          >
            ส่งออก CSV
          </Button>
        }
      />
      <CardContent>
        {loadingPlans ? (
          <Skeleton variant="rounded" height={80} />
        ) : plans.length === 0 ? (
          <Alert severity="info" variant="outlined">
            ยังไม่มีแผนที่บันทึกไว้ — ปรับสัดส่วนในการ์ดด้านบนแล้วกด &quot;บันทึกแผน&quot;
            อย่างน้อยสองแผนจึงจะเทียบกันได้
          </Alert>
        ) : (
          <>
            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              sx={{ mb: 3 }}
              options={plans}
              value={selected}
              getOptionLabel={(p) => p.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionDisabled={() => selected.length >= MAX_COMPARE}
              onChange={(_, v) => setPicked(v.slice(0, MAX_COMPARE))}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => (
                  <Chip
                    size="small"
                    variant="tonal"
                    color="primary"
                    label={option.name}
                    {...getItemProps({ index })}
                    key={option.id}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="📊 เลือกแผนที่จะเทียบ"
                  placeholder={selected.length >= MAX_COMPARE ? 'ครบจำนวนแล้ว' : 'เลือกแผน...'}
                />
              )}
            />

            {columns.length === 0 ? (
              <Alert severity="info" variant="outlined">
                ยังไม่ได้เลือกแผน — เลือกอย่างน้อยหนึ่งแผนจากช่องด้านบน
              </Alert>
            ) : (
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 220 }}>รายการ</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.plan.id} align="right" sx={{ minWidth: 160 }}>
                          <Box sx={{ fontWeight: 700 }}>{c.plan.name}</Box>
                          <Typography variant="caption" color="text.secondary">
                            {c.plan.programName} · {c.plan.savedAt}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow hover>
                      <TableCell sx={{ fontWeight: 700 }}>จุดคุ้มทุนรวม (คน)</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.plan.id} align="right" sx={{ fontWeight: 700 }}>
                          {c.plan.qStar.toLocaleString('th-TH')}
                        </TableCell>
                      ))}
                    </TableRow>
                    {columns.some((c) => c.plan.segmentedQStar) && (
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          จุดคุ้มทุนแยกรายกลุ่ม (คน)
                          <Typography variant="caption" color="text.secondary" display="block">
                            คำนวณจากอัตราค่าธรรมเนียมรายกลุ่ม
                          </Typography>
                        </TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.plan.id} align="right" sx={{ fontWeight: 700 }}>
                            {c.plan.segmentedQStar ? (
                              c.plan.segmentedQStar.toLocaleString('th-TH')
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                ยังไม่ได้คำนวณ
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                    {visibleKeys.map((k) => (
                      <TableRow key={k} hover>
                        <TableCell>{SEGMENT_LABELS[k]}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.plan.id} align="right">
                            {c.shares[k].toLocaleString('th-TH')}%
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({c.heads[k].toLocaleString('th-TH')} คน)
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanComparison;
