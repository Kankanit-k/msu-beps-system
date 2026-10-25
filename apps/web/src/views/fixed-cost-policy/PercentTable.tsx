'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Radio from '@mui/material/Radio';
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
  /** กลุ่มที่มีหลักสูตรใหม่ (W7) — ช่องว่างไม่นับเป็น 0 ต้องกรอกเอง */
  hasNew?: boolean;
  /** ระดับการศึกษาของหลักสูตร — ใช้กับ `groupCaps` */
  group?: string;
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

/** ทุกบรรทัดอยู่ในช่วง 0–100 และรวมกันได้ 100 พอดี — `150 / −50` รวมได้ 100 เหมือนกันแต่ใช้ไม่ได้ */
export const pctComplete = (buckets: Bucket[], pct: Record<string, string>): boolean =>
  roundPct(100 - pctSum(buckets, pct)) === 0 &&
  buckets.every((b) => {
    const v = parsePct(pct[b.key] ?? '');

    return v !== null && v >= 0 && v <= 100;
  });

/**
 * "เฉลี่ยส่วนที่เหลือ" — เติมกลุ่มที่ยังว่างให้รวมครบ 100% (ถ้ากรอกครบทุกกลุ่มแล้ว เฉลี่ยใหม่ทั้งหมด)
 * เศษที่ปัดทิ้งไปกองที่บรรทัดสุดท้าย เพื่อให้ผลรวมเป็น 100 พอดีตามกติกา V1
 *
 * @returns ค่าใหม่ หรือข้อความบอกเหตุผลเมื่อเฉลี่ยไม่ได้
 */
export function fillRemainderPct(
  buckets: Bucket[],
  pct: Record<string, string>,
): { pct: Record<string, string> } | { error: string } | null {
  const blanks = buckets.filter((b) => (pct[b.key] ?? '').trim() === '');
  const targets = blanks.length > 0 ? blanks : buckets;

  if (targets.length === 0) return null;

  const used = blanks.length > 0 ? pctSum(buckets, pct) : 0;

  if (used > 100) {
    // เฉลี่ยส่วนที่เหลือติดลบไม่ได้ — ปล่อยไปจะได้สัดส่วนติดลบที่รวมแล้วเป็น 100 พอดี
    return {
      error: `ผลรวมที่กรอกไว้เกิน 100% แล้ว (${used}%) — ลดค่าที่กรอกก่อนจึงจะเฉลี่ยส่วนที่เหลือได้`,
    };
  }

  const share = roundPct((100 - used) / targets.length);
  const next: Record<string, string> = blanks.length > 0 ? { ...pct } : {};

  targets.forEach((b, i) => {
    next[b.key] = String(
      i === targets.length - 1 ? roundPct(100 - used - share * (targets.length - 1)) : share,
    );
  });

  return { pct: next };
}

const BUCKET_LEVEL_META: {
  value: BucketLevel;
  icon: string;
  label: string;
  summary: string;
  tag: string;
  tagColor: 'success' | 'warning';
}[] = [
  {
    value: 'EDUCATION_LEVEL',
    icon: 'ri-graduation-cap-line',
    label: 'ตามระดับการศึกษา',
    summary: 'กรอก % ให้ ป.ตรี / ป.โท / ป.เอก เท่านั้น — ระบบแบ่งต่อให้หลักสูตรในระดับเดียวกันตามจำนวนนิสิต',
    tag: 'กรอกน้อย · รองรับหลักสูตรที่จะเปิดใหม่',
    tagColor: 'success',
  },
  {
    value: 'PROGRAM',
    icon: 'ri-list-check-3',
    label: 'รายหลักสูตร',
    summary: 'กรอก % ของแต่ละระดับ (ก.) แล้วแบ่ง % ลงทุกหลักสูตรเอง (ข.) — ละเอียดที่สุด',
    tag: 'หลักสูตรเปิดใหม่ยังไม่มี % จนกว่าคณะจะเพิ่มให้',
    tagColor: 'warning',
  },
];

/** เลือกระดับที่กำหนดสัดส่วน — การ์ด 2 ใบบอกความหมาย+ข้อแลกเปลี่ยน (หน้าล็อกวิธีวางไว้เหนือตาราง ก./ข. เอง) */
export const BucketLevelToggle = ({
  value,
  onChange,
  disabled,
}: {
  value: BucketLevel;
  onChange: (level: BucketLevel) => void;
  disabled?: boolean;
}) => (
  <Box
    role="radiogroup"
    aria-label="ระดับที่กำหนดสัดส่วน"
    sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
  >
    {BUCKET_LEVEL_META.map((m) => {
      const selected = m.value === value;
      const pick = () => !disabled && onChange(m.value);

      return (
        <Box
          key={m.value}
          role="radio"
          aria-checked={selected}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={pick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              pick();
            }
          }}
          sx={{
            display: 'flex',
            gap: 2,
            p: 3,
            borderRadius: 1,
            border: 2,
            borderColor: selected ? 'primary.main' : 'divider',
            bgcolor: selected ? 'primary.lighterOpacity' : 'background.paper',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled && !selected ? 0.6 : 1,
            transition: 'border-color .2s, background-color .2s',
            '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
          }}
        >
          <Radio
            checked={selected}
            size="small"
            disabled={disabled}
            inputProps={{ tabIndex: -1, 'aria-hidden': true }}
            sx={{ p: 0, alignSelf: 'flex-start', mt: 0.5 }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className={m.icon} style={{ fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                {m.label}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {m.summary}
            </Typography>
            <Chip
              size="small"
              variant="tonal"
              color={m.tagColor}
              label={m.tag}
              sx={{
                alignSelf: 'flex-start',
                maxWidth: '100%',
                height: 'auto',
                py: 0.5,
                '& .MuiChip-label': { whiteSpace: 'normal' },
              }}
            />
          </Box>
        </Box>
      );
    })}
  </Box>
);

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
  /** ป้ายสั้น — ใช้ในหน้าปรับปรุงหลักสูตร */
  compact?: boolean;
  /** ดูอย่างเดียว — คณะล็อกวิธีปันส่วนแล้ว */
  readOnly?: boolean;
  /** ซ่อนแถบเลือกระดับ/วิธีย่อย + ปุ่มเฉลี่ย/ล้างร่าง — หน้าล็อกวิธี (ยังไม่ทำในเฟสนี้) */
  hideControls?: boolean;
  /** รายหลักสูตร: เพดาน % ของแต่ละระดับ — หลักสูตรในระดับรวมกันห้ามเกิน (ต้องเท่าพอดีจึงล็อกได้) */
  groupCaps?: Record<string, number>;
};

const ROWS_PER_PAGE = [10, 25, 50];

/** สีแยกกลุ่มระดับการศึกษา (ป.ตรี/โท/เอก) — วนตามลำดับใน groupCaps */
const GROUP_COLORS = ['primary', 'success', 'warning', 'info', 'secondary'] as const;

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
  compact = false,
  readOnly = false,
  hideControls = false,
  groupCaps,
}: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // เปลี่ยนระดับกลุ่มแล้วจำนวนแถวเปลี่ยนทั้งชุด — ค้างอยู่หน้าเดิมจะเห็นตารางว่าง
  useEffect(() => setPage(0), [bucketLevel, buckets.length]);

  const sum = useMemo(() => pctSum(buckets, pct), [buckets, pct]);
  const diff = roundPct(100 - sum);
  const exact = diff === 0;

  // จัดหลักสูตรตามระดับให้เห็นว่ากรอกอยู่ในเพดานไหน
  const ordered = useMemo(
    () =>
      groupCaps
        ? Object.keys(groupCaps).flatMap((g) => buckets.filter((b) => (b.group ?? '') === g))
        : buckets,
    [buckets, groupCaps],
  );
  const groupSum = (g: string) =>
    pctSum(
      buckets.filter((b) => (b.group ?? '') === g),
      pct,
    );
  const groupColor = (g: string) => {
    const i = Object.keys(groupCaps ?? {}).indexOf(g);

    return GROUP_COLORS[(i < 0 ? 0 : i) % GROUP_COLORS.length]!;
  };
  const fmtPct = (v: number) =>
    (Number.isFinite(v) ? v : 0).toLocaleString('th-TH', { maximumFractionDigits: PCT_DECIMALS });

  const rowError = (b: Bucket): string | null => {
    const v = parsePct(pct[b.key] ?? '');

    if (b.hasNew && (pct[b.key] ?? '').trim() === '') return 'ต้องกรอก % ของหลักสูตรใหม่ (0 ได้)';
    if (v === null) return 'กรอกเป็นตัวเลขเท่านั้น';
    if (v < 0) return 'ติดลบไม่ได้';
    if (v > 100) return 'เกิน 100% ไม่ได้';
    if (v > 0 && b.programCount === 0) return 'กลุ่มนี้ไม่มีหลักสูตร — เงินจะค้างไม่มีเจ้าภาพ';
    if (groupCaps && b.group !== undefined && groupSum(b.group) > (groupCaps[b.group] ?? 0))
      return `${b.group}รวมเกิน ${groupCaps[b.group] || 0}%`;

    return null;
  };

  const rows = ordered.slice(page * perPage, page * perPage + perPage);

  return (
    <Stack spacing={4}>
      {!hideControls && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          sx={{ alignItems: { md: 'flex-end' } }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {compact ? 'แบ่งตาม' : 'กำหนดสัดส่วนที่ระดับ'}
            </Typography>
            <BucketLevelToggle
              value={bucketLevel}
              onChange={onBucketLevelChange}
              disabled={readOnly}
            />
          </Box>

          {bucketLevel === 'EDUCATION_LEVEL' && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {compact ? 'ในกลุ่ม' : 'ภายในกลุ่มเดียวกัน แบ่งต่อด้วยวิธี'}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                disabled={readOnly}
                value={subMethod}
                onChange={(_, v: FixedCostSubMethod | null) => v && onSubMethodChange(v)}
              >
                <ToggleButton value="PER_HEAD_FTES">ตามรายหัว</ToggleButton>
                <ToggleButton value="EQUAL_PROGRAM">หารเท่ากัน</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {!readOnly && (
            <Box sx={{ display: 'flex', gap: 2, marginInlineStart: { md: 'auto' } }}>
              <Tooltip title="เติมส่วนที่ยังขาดให้ครบ 100% โดยเฉลี่ยลงกลุ่มที่ยังไม่ได้กรอก (ถ้ากรอกครบทุกกลุ่มแล้ว จะเฉลี่ยใหม่ทั้งหมด)">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<i className="ri-scales-line" />}
                    onClick={onFillRemainder}
                  >
                    {compact ? 'เฉลี่ย' : 'เฉลี่ยส่วนที่เหลือ'}
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
                {compact ? 'ล้าง' : 'ล้างร่าง'}
              </Button>
            </Box>
          )}
        </Stack>
      )}

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600}>
            {compact ? 'รวม' : 'ผลรวมสัดส่วน'}
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
              {compact || readOnly ? '' : ' — ต้องเป็น 100% พอดีจึงเสนอได้'}
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
        {groupCaps && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {Object.entries(groupCaps).map(([g, cap]) => {
              const s = groupSum(g);

              return (
                <Chip
                  key={g}
                  size="small"
                  variant="tonal"
                  color={s === cap ? 'success' : s > cap ? 'error' : 'warning'}
                  icon={
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: `${groupColor(g)}.main`,
                      }}
                    />
                  }
                  label={`${g} ${fmtPct(s)} / ${fmtPct(cap)}%`}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {!readOnly &&
        !hideControls &&
        buckets.length > 0 &&
        buckets.every((b) => (pct[b.key] ?? '').trim() === '') && (
          <Alert severity="info">
            {compact ? (
              <>
                กด <strong>เฉลี่ย</strong> เพื่อเริ่ม แล้วปรับ % ให้รวม 100
              </>
            ) : (
              <>
                ยังไม่ได้กรอกสัดส่วน — กด <strong>เฉลี่ยส่วนที่เหลือ</strong>{' '}
                เพื่อเริ่มจากหารเท่ากันทุกกลุ่ม แล้วค่อยปรับตัวเลขตามมติ · ผลรวมต้องเป็น 100%
                พอดีจึงจะจำลองผลได้
              </>
            )}
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
                  <TableCell align="center" sx={{ width: 56 }}>
                    ลำดับ
                  </TableCell>
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
                {rows.map((b, i) => {
                  const err = touched[b.key] || b.hasNew || groupCaps ? rowError(b) : null;
                  const g = b.group ?? '';
                  const c = groupCaps ? groupColor(g) : null;
                  // หัวกลุ่มขึ้นที่แถวแรกของแต่ละระดับ (และแถวแรกของหน้า ถ้ากลุ่มต่อมาจากหน้าก่อน)
                  const showHeader = groupCaps && (i === 0 || (rows[i - 1]!.group ?? '') !== g);
                  const members = groupCaps ? buckets.filter((x) => (x.group ?? '') === g) : [];
                  const s = groupCaps ? groupSum(g) : 0;
                  const cap = groupCaps?.[g] ?? 0;
                  const bar = c
                    ? { borderInlineStart: `4px solid var(--mui-palette-${c}-main)` }
                    : {};

                  return (
                    <Fragment key={b.key}>
                      {showHeader && c && (
                        <TableRow sx={{ bgcolor: `var(--mui-palette-${c}-lightOpacity)` }}>
                          <TableCell colSpan={2} sx={bar}>
                            <Typography variant="body2" fontWeight={700} color={`${c}.main`}>
                              {g || 'ไม่ระบุระดับ'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {fmtInt(members.reduce((t, x) => t + x.programCount, 0))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {fmtInt(members.reduce((t, x) => t + x.q, 0))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              variant="tonal"
                              color={s === cap ? 'success' : s > cap ? 'error' : 'warning'}
                              label={`รวม ${fmtPct(s)} / ${fmtPct(cap)}%`}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow hover>
                        {/* ลำดับต่อเนื่องข้ามหน้า */}
                        <TableCell align="center" sx={bar}>
                          {page * perPage + i + 1}
                        </TableCell>
                        <TableCell sx={c ? { pl: 5 } : undefined}>{b.label}</TableCell>
                        <TableCell align="right">{fmtInt(b.programCount)}</TableCell>
                        <TableCell align="right">{fmtInt(b.q)}</TableCell>
                        <TableCell align="right">
                          {readOnly ? (
                            <Typography variant="body2" fontWeight={700}>
                              {(pct[b.key] ?? '').trim() || '0'}%
                            </Typography>
                          ) : (
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
                          )}
                        </TableCell>
                      </TableRow>
                    </Fragment>
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
