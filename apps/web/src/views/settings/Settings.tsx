'use client';

// React Imports
import { useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

// Data Imports
import { SETTINGS, SETTING_LOG, type CalcSetting } from './data';

const YEARS = [2568, 2569, 2570];

const Settings = () => {
  const [year, setYear] = useState(2568);
  const [sel, setSel] = useState(SETTINGS[0]!.key);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const valueOf = (s: CalcSetting) => draft[s.key] ?? s.cur ?? s.def;
  const dirtyKeys = Object.keys(draft).filter(k => {
    const s = SETTINGS.find(x => x.key === k);
    return s && draft[k] !== (s.cur ?? s.def);
  });

  const selected = SETTINGS.find(s => s.key === sel) ?? SETTINGS[0]!;
  const selectedValue = valueOf(selected);
  const impactRows: Array<[string, string]> =
    selected.type === 'enum' && selected.opts
      ? selected.opts.map((o): [string, string] => [o, selected.impact[o] ?? ''])
      : [[selectedValue, selected.impact['*'] ?? '']];

  const handleChange = (s: CalcSetting, value: string) => {
    setDraft(prev => ({ ...prev, [s.key]: value }));
    setSel(s.key);
  };

  const handleReset = () => setDraft({});

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          ค่าเหล่านี้เคย<b>ฝังอยู่ในโค้ด</b>ของ prototype ทำให้กองแผนงานเปลี่ยนเองไม่ได้ และหน้าจอคนละหน้าใช้กติกาต่างกันจนได้ตัวเลขไม่ตรงกัน
          · ตอนนี้เป็นค่าตั้งที่<b>มีเวอร์ชันรายปีและต้องอนุมัติ</b> ทุกส่วนของระบบอ่านจากค่าเดียวกัน
        </Alert>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Alert severity="warning">
          <b>ปีการศึกษา 2568 ยังไม่มีมติกำหนดค่าใดเลย</b> — ทุกค่ายังใช้ค่าเริ่มต้นจากนิยามระบบ รายการที่ยังรอมติที่ประชุม:{' '}
          <code>cm_le_zero_policy</code> · <code>qstar_primary_method</code> · <code>qstar_rounding</code> ·{' '}
          <code>profit_pct_basis</code> ตัวเลขที่นำเสนออยู่ตอนนี้จึงเป็นผลของ<b>ค่าเริ่มต้น</b> ไม่ใช่นโยบายที่ผ่านการรับรอง
        </Alert>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={4}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="settings-year-label">มีผลตั้งแต่ปีการศึกษา</InputLabel>
            <Select
              labelId="settings-year-label"
              label="มีผลตั้งแต่ปีการศึกษา"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {YEARS.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box flexGrow={1} />
          <Chip variant="outlined" color="warning" label="⚡ กระทบตัวเลข = เปลี่ยนแล้วต้องสั่งคำนวณใหม่" />
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader title="รายการค่าตั้ง" subheader="คลิกชื่อค่าตั้งเพื่อดูผลกระทบ · ค่าที่ไม่ได้ตั้งทับจะใช้ค่าเริ่มต้นจากนิยามระบบ" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={3}>
              {SETTINGS.map(s => {
                const v = valueOf(s);
                const isDirty = draft[s.key] !== undefined && draft[s.key] !== (s.cur ?? s.def);
                return (
                  <Box
                    key={s.key}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={4}
                    p={3}
                    borderRadius={1}
                    onClick={() => setSel(s.key)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: s.key === sel ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box>
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Typography fontWeight={600}>{s.name}</Typography>
                        <Typography variant="caption" component="code" color="text.secondary">
                          {s.key}
                        </Typography>
                        {s.affects && <Chip size="small" color="warning" variant="outlined" label="⚡ กระทบตัวเลข" />}
                        {isDirty && <Chip size="small" color="success" label="แก้แล้ว" />}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {s.desc}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {s.cur === null ? (
                          <>
                            ยังไม่ตั้งทับ · ใช้ค่าเริ่มต้น <b>{s.def}</b>
                          </>
                        ) : (
                          <>
                            {s.def} → {s.cur}
                          </>
                        )}
                        {isDirty && (
                          <>
                            {' '}
                            · แก้เป็น <b>{draft[s.key]}</b>
                          </>
                        )}
                      </Typography>
                    </Box>
                    <Box onClick={e => e.stopPropagation()} minWidth={160}>
                      {s.type === 'enum' ? (
                        <FormControl size="small" fullWidth>
                          <Select value={v} onChange={e => handleChange(s, e.target.value)}>
                            {s.opts?.map(o => (
                              <MenuItem key={o} value={o}>
                                {o}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          size="small"
                          value={v}
                          onChange={e => handleChange(s, e.target.value)}
                          sx={{ width: 110 }}
                        />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Divider sx={{ my: 4 }} />
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
              <Button variant="contained" disabled={dirtyKeys.length === 0}>
                📤 เสนออนุมัติการเปลี่ยนแปลง
              </Button>
              <Button variant="outlined" disabled={dirtyKeys.length === 0} onClick={handleReset}>
                ↺ ย้อนกลับ
              </Button>
              <Box flexGrow={1} />
              <Typography variant="body2" color="text.secondary">
                {dirtyKeys.length > 0 ? `แก้ไข ${dirtyKeys.length} ค่า — ยังไม่มีผลจนกว่าจะผ่านการอนุมัติ` : 'ยังไม่มีการเปลี่ยนแปลง'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title="ผลกระทบถ้าเปลี่ยนค่านี้"
                subheader={`${selected.name} · ประเมินจากข้อมูลปีการศึกษา 2568 · 230 หลักสูตร`}
                action={
                  selected.affects ? (
                    <Chip size="small" color="warning" variant="outlined" label="⚡ ต้องคำนวณใหม่" />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="ไม่ต้องคำนวณใหม่" />
                  )
                }
              />
              <CardContent>
                <Box display="flex" flexDirection="column" gap={2}>
                  {impactRows.map(([o, txt]) => (
                    <Box
                      key={o}
                      p={3}
                      borderRadius={1}
                      border={1}
                      borderColor={o === selectedValue ? 'primary.main' : 'divider'}
                      bgcolor={o === selectedValue ? 'action.selected' : 'background.default'}
                    >
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography component="code" fontWeight={700} fontSize={12}>
                          {o}
                        </Typography>
                        {o === selectedValue && <Chip size="small" color="success" label="ค่าที่ใช้อยู่" />}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {txt}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {selected.affects && (
                  <Alert severity="warning" sx={{ mt: 3 }}>
                    ⚡ เปลี่ยนค่านี้แล้ว ตัวเลขในหน้าวิเคราะห์<b>จะยังไม่เปลี่ยน</b>จนกว่าจะสร้างและอนุมัติรอบคำนวณใหม่
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title="ประวัติการเปลี่ยนค่าตั้ง" subheader="ตอบได้ว่าตัวเลขปีไหนคำนวณด้วยกติกาใด" />
              <CardContent>
                <Box display="flex" flexDirection="column" gap={3}>
                  {SETTING_LOG.map((l, i) => (
                    <Box key={i} display="flex" gap={3}>
                      <Typography>{l.ic}</Typography>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {l.t}
                        </Typography>
                        <Typography variant="body2">{l.h}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="ทำไมค่าตั้งต้องมีเวอร์ชันรายปี" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="error">
                ถ้าไม่มีหน้านี้ นโยบายจะกลับไป<b>ฝังในโค้ด</b> และ<b>เทียบตัวเลขข้ามปีไม่ได้</b>
                เพราะไม่รู้ว่าแต่ละปีคำนวณด้วยกติกาใด
              </Alert>
              <Alert severity="warning">
                ค่าที่ติดป้าย <b>กระทบตัวเลข</b> เปลี่ยนแล้วต้องสร้างรอบคำนวณใหม่ — ตัวเลขเก่าจะไม่เปลี่ยนตามเอง
              </Alert>
              <Alert severity="info">
                <code>qstar_primary_method</code> ต่างกันถึง <b>5,441 คน</b> ในระดับมหาวิทยาลัย — ไม่ใช่รายละเอียดปลีกย่อย
                แต่เป็นเรื่องที่ต้องมีมติ
              </Alert>
              <Alert severity="success">
                ระบบ<b>คำนวณเก็บไว้ทั้ง 2 วิธีเสมอ</b> ค่าตั้งนี้เลือกแค่ว่าตัวไหนเป็นตัวหลักในรายงาน จึงสลับได้โดยไม่ต้องคำนวณใหม่
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Settings;
