'use client';

import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Type Imports
import type { BucketLevel, FixedCostSubMethod } from '@beps/calc-engine';

// Calc Imports
import { fmtInt } from '@views/breakeven/calc';

export interface Bucket {
  key: string;
  label: string;
  /** จำนวนหลักสูตรใน bucket นี้ — bucket ที่ว่างแต่ได้ % > 0 ทำให้เสนอไม่ได้ (V3) */
  programCount: number;
  q: number;
}

/** ผลรวมต้องเป็น 100 พอดี — ปัดที่ทศนิยม 4 ตำแหน่งเท่ากับ numeric(9,4) ของ DB */
export const PCT_DECIMALS = 4;
export const roundPct = (v: number) => Math.round(v * 10 ** PCT_DECIMALS) / 10 ** PCT_DECIMALS;

/** ข้อความที่พิมพ์ → ตัวเลข · ช่องว่างนับเป็น 0 แต่ต่างจาก "พิมพ์ผิด" ตรงที่ไม่ขึ้น error */
export const parsePct = (raw: string): number | null => {
  const t = raw.trim();

  if (t === '') return 0;

  const n = Number(t);

  return Number.isFinite(n) ? n : null;
};

/**
 * ผลรวมที่แสดงบนจอต้องเป็นผลรวมของ "ค่าที่จะถูกส่งไป API" ไม่ใช่ของค่าดิบที่พิมพ์
 * — API ปัดทีละบรรทัดแล้วเช็กว่ารวมได้ 100 พอดีโดยไม่มี tolerance ถ้าที่นี่ปัดทีเดียว
 * ตอนท้าย จะมีเคสที่จอเขียว 100% แต่ engine ตอบ PCT_SUM_NOT_100
 */
export const pctSum = (buckets: Bucket[], pct: Record<string, string>): number =>
  roundPct(buckets.reduce((s, b) => s + roundPct(parsePct(pct[b.key] ?? '') ?? 0), 0));

type Props = {
  buckets: Bucket[];
  pct: Record<string, string>;
  onPctChange: (key: string, value: string) => void;
  bucketLevel: BucketLevel;
  onBucketLevelChange: (level: BucketLevel) => void;
  subMethod: FixedCostSubMethod;
  onSubMethodChange: (sub: FixedCostSubMethod) => void;
  onFillRemainder: () => void;
  onClearDraft: () => void;
  /** เวลาที่บันทึกร่างล่าสุด — `null` = ยังไม่เคยบันทึก (หรือเบราว์เซอร์ไม่ให้เก็บ) */
  draftSavedAt: string | null;
};

const ROWS_PER_PAGE = [10, 25, 50];

/** ขั้นที่ 2 ของ Stepper — ตารางกำหนดสัดส่วน (เฉพาะวิธีกำหนดเปอร์เซ็นต์เอง) */
const PercentTable = ({
  buckets,
  pct,
  onPctChange,
  bucketLevel,
  onBucketLevelChange,
  subMethod,
  onSubMethodChange,
  onFillRemainder,
  onClearDraft,
  draftSavedAt,
}: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // เปลี่ยนระดับกลุ่มแล้วจำนวนแถวเปลี่ยนทั้งชุด — ค้างอยู่หน้าเดิมจะเห็นตารางว่าง
  useEffect(() => setPage(0), [bucketLevel, buckets.length]);

  const sum = useMemo(() => pctSum(buckets, pct), [buckets, pct]);
  const diff = roundPct(100 - sum);
  const exact = diff === 0;

  const rowError = (b: Bucket): string | null => {
    const v = parsePct(pct[b.key] ?? '');

    if (v === null) return 'กรอกเป็นตัวเลขเท่านั้น';
    if (v < 0) return 'ติดลบไม่ได้';
    if (v > 100) return 'เกิน 100% ไม่ได้';
    if (v > 0 && b.programCount === 0) return 'กลุ่มนี้ไม่มีหลักสูตร — เงินจะค้างไม่มีเจ้าภาพ';

    return null;
  };

  const rows = buckets.slice(page * perPage, page * perPage + perPage);

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={4}
        sx={{ alignItems: { md: 'flex-end' } }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            กำหนดสัดส่วนที่ระดับ
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={bucketLevel}
            onChange={(_, v: BucketLevel | null) => v && onBucketLevelChange(v)}
          >
            <ToggleButton value="EDUCATION_LEVEL">ระดับการศึกษา</ToggleButton>
            <ToggleButton value="PROGRAM">รายหลักสูตร</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {bucketLevel === 'EDUCATION_LEVEL' && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              ภายในกลุ่มเดียวกัน แบ่งต่อด้วยวิธี
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={subMethod}
              onChange={(_, v: FixedCostSubMethod | null) => v && onSubMethodChange(v)}
            >
              <ToggleButton value="PER_HEAD_FTES">ตามรายหัว</ToggleButton>
              <ToggleButton value="EQUAL_PROGRAM">หารเท่ากัน</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, marginInlineStart: { md: 'auto' } }}>
          <Tooltip title="เติมส่วนที่ยังขาดให้ครบ 100% โดยเฉลี่ยลงกลุ่มที่ยังไม่ได้กรอก (ถ้ากรอกครบทุกกลุ่มแล้ว จะเฉลี่ยใหม่ทั้งหมด)">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<i className="ri-scales-line" />}
                onClick={onFillRemainder}
              >
                เฉลี่ยส่วนที่เหลือ
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={<i className="ri-delete-bin-line" />}
            onClick={onClearDraft}
          >
            ล้างร่าง
          </Button>
        </Box>
      </Stack>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600}>
            ผลรวมสัดส่วน
          </Typography>
          <Chip
            size="small"
            variant="tonal"
            color={exact ? 'success' : 'error'}
            label={`${sum.toLocaleString('th-TH', { maximumFractionDigits: PCT_DECIMALS })}%`}
          />
          {!exact && (
            <Typography variant="caption" color="error.main">
              {diff > 0
                ? `ยังขาดอีก ${diff.toLocaleString('th-TH', { maximumFractionDigits: PCT_DECIMALS })}%`
                : `เกินมา ${Math.abs(diff).toLocaleString('th-TH', { maximumFractionDigits: PCT_DECIMALS })}%`}
              {' — ต้องเป็น 100% พอดีจึงเสนอได้'}
            </Typography>
          )}
          {draftSavedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ marginInlineStart: 'auto' }}>
              บันทึกร่างอัตโนมัติ {new Date(draftSavedAt).toLocaleTimeString('th-TH')}
            </Typography>
          )}
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(sum, 100)}
          color={exact ? 'success' : 'error'}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {buckets.length > 0 && buckets.every((b) => (pct[b.key] ?? '').trim() === '') && (
        <Alert severity="info">
          ยังไม่ได้กรอกสัดส่วน — กด <strong>เฉลี่ยส่วนที่เหลือ</strong>{' '}
          เพื่อเริ่มจากหารเท่ากันทุกกลุ่ม แล้วค่อยปรับตัวเลขตามมติ · ผลรวมต้องเป็น 100%
          พอดีจึงจะจำลองผลได้
        </Alert>
      )}

      {buckets.length === 0 ? (
        <Alert severity="warning">
          คณะนี้ไม่มีหลักสูตรในชุดข้อมูลของปีที่เลือก จึงยังกำหนดสัดส่วนไม่ได้
        </Alert>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    {bucketLevel === 'EDUCATION_LEVEL' ? 'ระดับการศึกษา' : 'หลักสูตร'}
                  </TableCell>
                  <TableCell align="right">หลักสูตร</TableCell>
                  <TableCell align="right">นิสิต</TableCell>
                  <TableCell align="right" sx={{ width: 180 }}>
                    สัดส่วน (%)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((b) => {
                  const err = touched[b.key] ? rowError(b) : null;

                  return (
                    <TableRow key={b.key} hover>
                      <TableCell>{b.label}</TableCell>
                      <TableCell align="right">{fmtInt(b.programCount)}</TableCell>
                      <TableCell align="right">{fmtInt(b.q)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={pct[b.key] ?? ''}
                          placeholder="0"
                          error={Boolean(err)}
                          helperText={err ?? ' '}
                          onChange={(e) => onPctChange(b.key, e.target.value)}
                          onBlur={() => setTouched((t) => ({ ...t, [b.key]: true }))}
                          inputProps={{
                            inputMode: 'decimal',
                            style: { textAlign: 'right' },
                            'aria-label': `สัดส่วนของ ${b.label}`,
                          }}
                          sx={{
                            width: 140,
                            '& .MuiFormHelperText-root': { textAlign: 'right', mx: 0 },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {buckets.length > ROWS_PER_PAGE[0]! && (
            <TablePagination
              component="div"
              count={buckets.length}
              page={page}
              rowsPerPage={perPage}
              rowsPerPageOptions={ROWS_PER_PAGE}
              labelRowsPerPage="แถวต่อหน้า"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(0);
              }}
            />
          )}
        </>
      )}
    </Stack>
  );
};

export default PercentTable;
