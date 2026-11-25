'use client';

// React Imports
import { useEffect, useState } from 'react';

// Next Imports
import { useRouter } from 'next/navigation';

// MUI Imports
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { BEPS } from '@components/ChartBits';
import { fmtInt, fmtMillion } from '@views/breakeven/calc';

export type RankKind = 'gain' | 'loss';

/** แถวที่ตารางต้องใช้ — name = ชื่อคณะเต็ม (ใช้เปิดหน้าภาพรวมคณะ) */
export type RankRow = {
  key: string;
  name: string;
  label: string;
  Q: number;
  profitWith: number;
  profitWithout: number;
};

type SortKey = 'label' | 'Q' | 'with' | 'without';

const GAIN = BEPS.breakEven;
const LOSS = BEPS.cost.dark;

const fmtSigned = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMillion(Math.abs(v))}`;

/** หัวป็อปอัปตามการ์ดที่กด — ④ ส่วนต่างสูงสุด · ⑤ ค่าใช้จ่ายสูงกว่ารายได้ (แยกกันคนละป็อปอัป ไม่มีแท็บ) */
const KIND = {
  gain: { title: '④ คณะที่มีส่วนต่างสูงสุด', color: GAIN, word: 'มีส่วนต่าง' },
  loss: { title: '⑤ คณะที่มีค่าใช้จ่ายสูงกว่ารายได้', color: LOSS, word: 'ขาดทุน' },
};

/**
 * ป็อปอัป "ดูทั้งหมด" ของการ์ด ④ หรือ ⑤ — แสดงเฉพาะกลุ่มของการ์ดนั้น
 * ค้นหาชื่อคณะ · กดหัวคอลัมน์เพื่อเรียง · กดแถวเพื่อเปิดหน้าภาพรวมคณะ (เฉพาะผู้ที่เลือกคณะได้)
 */
const FacultyRankDialog = ({
  open,
  kind,
  rows,
  mode,
  unitWord,
  canOpenFaculty,
  onClose,
}: {
  open: boolean;
  kind: RankKind;
  rows: RankRow[];
  mode: RevenueMode;
  /** "คณะ" หรือ "รายการ" (โหมดเทียบระดับ) */
  unitWord: string;
  canOpenFaculty: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: mode === 'with_government' ? 'with' : 'without',
    dir: 'desc',
  });

  // เปิดใหม่ทุกครั้ง = ล้างคำค้น · เรียงแบบการ์ด (ส่วนเกินมากสุด / ขาดทุนมากสุด ขึ้นก่อน)
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSort({
      key: mode === 'with_government' ? 'with' : 'without',
      dir: kind === 'loss' ? 'asc' : 'desc',
    });
  }, [open, kind, mode]);

  const cur = (r: RankRow) => (mode === 'with_government' ? r.profitWith : r.profitWithout);
  const k = KIND[kind];
  // แสดงทุกคณะ (rows) ทั้งสองป็อปอัป — ผู้ใช้หาคณะตนเองเจอเสมอ แม้ไม่อยู่ในกลุ่มของการ์ด
  const inCard = (r: RankRow) => (kind === 'gain' ? cur(r) > 0 : cur(r) < 0);
  const nCard = rows.filter(inCard).length;

  // ไฮไลต์ 5 อันดับแรก (= 5 คณะบนการ์ด) — ติดตามคณะ ไม่ใช่ตำแหน่งแถว จึงยังถูกแม้เรียงคอลัมน์อื่น
  const top5 = new Set(
    rows
      .filter(inCard)
      .sort((a, b) => (kind === 'gain' ? cur(b) - cur(a) : cur(a) - cur(b)))
      .slice(0, 5)
      .map((r) => r.key),
  );

  // ข้อมูลไม่เกินหลักสิบแถว — คำนวณใหม่ทุกครั้งได้ ไม่ต้อง memo
  const q = query.trim();
  const val = (r: RankRow): number | string =>
    sort.key === 'label'
      ? r.name
      : sort.key === 'Q'
        ? r.Q
        : sort.key === 'with'
          ? r.profitWith
          : r.profitWithout;

  const shown = rows
    .filter((r) => !q || r.name.includes(q) || r.label.includes(q))
    .sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const d = typeof x === 'string' ? x.localeCompare(String(y), 'th') : x - (y as number);

      return sort.dir === 'asc' ? d : -d;
    });

  const sortBy = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const head = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align} sortDirection={sort.key === key ? sort.dir : false}>
      <TableSortLabel
        active={sort.key === key}
        direction={sort.key === key ? sort.dir : 'desc'}
        onClick={() => sortBy(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const color = (v: number) => (v >= 0 ? GAIN : LOSS);
  const curKey: SortKey = mode === 'with_government' ? 'with' : 'without';
  const modeWord = mode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component="span"
            sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: k.color, flexShrink: 0 }}
          />
          {unitWord === 'คณะ' ? k.title : k.title.replace('คณะ', 'รายการ')}
          <Box
            component="span"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              px: 1.5,
              py: 0.25,
              borderRadius: 4,
              color: k.color,
              bgcolor: `color-mix(in srgb, ${k.color} 16%, transparent)`,
            }}
          >
            ทั้งหมด {rows.length} {unitWord} · {k.word} {nCard}
          </Box>
        </Box>
        {canOpenFaculty && unitWord === 'คณะ' && (
          <Typography variant="body2" color="text.secondary">
            กดแถวเพื่อเปิดภาพรวมคณะ
          </Typography>
        )}
        <IconButton
          aria-label="ปิด"
          onClick={onClose}
          sx={{ position: 'absolute', insetInlineEnd: 12, insetBlockStart: 12 }}
        >
          <i className="ri-close-line" />
        </IconButton>
      </DialogTitle>
      <Box sx={{ px: 6, display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          size="small"
          placeholder="ค้นหาคณะ…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 220 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <i className="ri-search-line" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <DialogContent sx={{ pt: 2 }}>
        <TableContainer>
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                {head('label', unitWord, 'left')}
                {head('Q', 'นิสิต')}
                {/* แสดงเฉพาะฐานรายได้ที่เลือกบนหัวหน้า */}
                {head(curKey, `${modeWord} (ล้านบาท)`)}
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                    {query ? (
                      <>
                        ไม่พบ{unitWord}ที่ตรงกับ “{query}” —{' '}
                        <Box
                          component="span"
                          role="button"
                          tabIndex={0}
                          onClick={() => setQuery('')}
                          sx={{ color: 'primary.main', cursor: 'pointer' }}
                        >
                          ล้างคำค้น
                        </Box>
                      </>
                    ) : (
                      `ไม่มี${unitWord}ที่${k.word}`
                    )}
                  </TableCell>
                </TableRow>
              )}
              {shown.map((r, i) => {
                const clickable = canOpenFaculty;

                return (
                  <TableRow
                    key={r.key}
                    hover={clickable}
                    onClick={
                      clickable
                        ? () => router.push(`/faculty?fac=${encodeURIComponent(r.name)}`)
                        : undefined
                    }
                    sx={{
                      cursor: clickable ? 'pointer' : 'default',
                      ...(top5.has(r.key) && {
                        bgcolor: `color-mix(in srgb, ${k.color} 8%, transparent)`,
                        '& td:first-of-type': { boxShadow: `inset 3px 0 0 ${k.color}` },
                      }),
                    }}
                  >
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {top5.has(r.key) ? (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-grid',
                            placeItems: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: k.color,
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </Box>
                      ) : (
                        i + 1
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: top5.has(r.key) ? 700 : 500 }}>{r.name}</TableCell>
                    <TableCell align="right" className="num">
                      {fmtInt(r.Q)}
                    </TableCell>
                    <TableCell
                      align="right"
                      className="num"
                      sx={{ color: color(cur(r)), fontWeight: 700 }}
                    >
                      {fmtSigned(cur(r))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default FacultyRankDialog;
