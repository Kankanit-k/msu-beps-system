'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import type { CostGroup } from './CostBlockTable';

const fmtN = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

interface Props {
  groups: CostGroup[];
}

/**
 * สรุป "ต้องรับนิสิตกี่คนถึงคุ้มทุน" — กรณีรวม/ไม่รวมเงินแผ่นดิน วางคู่กัน
 * แต่ละกรณีเทียบ คอลัมน์ฐาน (หลักสูตรเดิม) กับ คอลัมน์ที่แก้ได้
 */
const BreakEvenCompare = ({ groups }: Props) => (
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
                <Box
                  key={c.key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    mt: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {c.title}
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
                          ? 'รายได้ต่อหัวไม่สูงกว่าต้นทุนผันแปรต่อหัว — ยิ่งรับนิสิตยิ่งขาดทุน'
                          : ok
                            ? `✓ เกินจุดคุ้มทุน +${fmtN(q - qStar)} คน`
                            : `⚠ ต้องเพิ่มอีก ${fmtN(qStar - q)} คน`}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      จำนวนนิสิต ณ จุดคุ้มทุน
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
                </Box>
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
