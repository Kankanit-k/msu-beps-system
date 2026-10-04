'use client';

// MUI Imports
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import type { CostGroup } from './CostBlockTable';

const fmtN = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

interface Props {
  groups: CostGroup[];
  /** เลือกคอลัมน์ที่ใช้กับกราฟ ตารางสัดส่วน และการบันทึก */
  onSelect: (groupKey: string, colKey: string) => void;
}

/**
 * สรุป "ต้องรับนิสิตกี่คนถึงคุ้มทุน" — กรณีรวม/ไม่รวมเงินแผ่นดิน วางคู่กัน
 * แต่ละกรณีเทียบ คอลัมน์ฐาน (หลักสูตรเดิม) กับ คอลัมน์ที่แก้ได้ · กดแถวเพื่อใช้กับกราฟ/บันทึก
 */
const BreakEvenCompare = ({ groups, onSelect }: Props) => (
  <Grid container spacing={3}>
    {groups.map((g) => {
      const [a, b] = g.cols.map((c) => c.result.qStar);
      const delta =
        g.cols.length === 2 && a !== null && a !== undefined && b !== null && b !== undefined
          ? b - a
          : null;

      return (
        <Grid key={g.key} size={{ xs: 12, md: 12 / groups.length }}>
          <Box
            sx={{
              border: 1.5,
              borderColor: `${g.color}.main`,
              borderRadius: 2,
              p: 2,
              height: '100%',
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 800, color: `${g.color}.main` }}>
              กรณี{g.title}
            </Typography>
            {g.cols.map((c) => {
              const { qStar } = c.result;
              const q = c.block.q;
              const negative = qStar !== null && qStar < 0;
              const ok = qStar !== null && !negative && q >= qStar;

              return (
                <ButtonBase
                  key={c.key}
                  onClick={() => onSelect(g.key, c.key)}
                  title="กดเพื่อใช้คอลัมน์นี้กับกราฟ ตารางสัดส่วนนิสิต และการบันทึก"
                  sx={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    textAlign: 'left',
                    p: 1.5,
                    mt: 1,
                    borderRadius: 1,
                    bgcolor: c.active ? 'action.selected' : 'action.hover',
                    outline: c.active ? 2 : 0,
                    outlineColor: 'primary.main',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {c.title}
                      {c.active && (
                        <Chip
                          size="small"
                          color="primary"
                          label="ใช้คำนวณ"
                          sx={{ ml: 1, height: 18, fontSize: 10 }}
                        />
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 600,
                        color:
                          qStar === null ? 'text.secondary' : ok ? 'success.main' : 'error.main',
                      }}
                    >
                      นิสิตจริง {fmtN(q)} คน ·{' '}
                      {qStar === null
                        ? 'คำนวณไม่ได้'
                        : negative
                          ? 'R ≤ AVC — ยิ่งรับนิสิตยิ่งขาดทุน'
                          : ok
                            ? `✓ เกินจุดคุ้มทุน +${fmtN(q - qStar)} คน`
                            : `⚠ ต้องเพิ่มอีก ${fmtN(qStar - q)} คน`}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      จุดคุ้มทุน (Q*)
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: negative ? 'warning.main' : 'primary.main' }}
                    >
                      {qStar === null ? '—' : fmtN(qStar)}{' '}
                      <Typography component="span" variant="body2">
                        คน
                      </Typography>
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
            {delta !== null && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1.5,
                  color: delta === 0 ? 'text.secondary' : 'info.main',
                }}
              >
                {g.cols[1]!.title} − {g.cols[0]!.title}:{' '}
                <b>
                  {delta === 0 ? 'เท่ากัน' : `${delta > 0 ? '+' : '−'}${fmtN(Math.abs(delta))} คน`}
                </b>
              </Typography>
            )}
          </Box>
        </Grid>
      );
    })}
  </Grid>
);

export default BreakEvenCompare;
