'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import Typography from '@mui/material/Typography';

// Type Imports
import type { FixedCostMethod } from '@beps/calc-engine';

/** คำอธิบายแต่ละวิธีเป็นภาษาคน — คณะต้องเลือกได้โดยไม่ต้องอ่านสูตร */
export const METHOD_META: {
  value: FixedCostMethod;
  no: string;
  label: string;
  icon: string;
  summary: string;
  pros: string;
  cons: string;
}[] = [
  {
    value: 'PER_HEAD_FTES',
    no: '1',
    label: 'คิดตามรายหัวนิสิต',
    icon: 'ri-user-star-line',
    summary: 'หลักสูตรที่มีนิสิตมาก รับต้นทุนคงที่มากตามสัดส่วนจำนวนนิสิต (FTES)',
    pros: 'ตรงกับวิธีที่ระบบใช้อยู่เดิม · อธิบายง่ายที่สุด · ไม่ต้องกรอกอะไรเพิ่ม',
    cons: 'หลักสูตร ป.โท–ป.เอก ที่นิสิตน้อย จะได้ต้นทุนต่อหัวสูงจน Q* ไม่มีความหมาย',
  },
  {
    value: 'EQUAL_PROGRAM',
    no: '2',
    label: 'หารเท่ากันทุกหลักสูตร',
    icon: 'ri-equalizer-line',
    summary: 'ทุกหลักสูตรที่เปิดสอนในปีนั้นรับต้นทุนคงที่เท่ากัน ไม่ว่ามีนิสิตกี่คน',
    pros: 'มองต้นทุนคงที่เป็น "ค่าดูแลหลักสูตร" · ไม่ลงโทษหลักสูตรที่นิสิตน้อย',
    cons: 'หลักสูตรใหญ่ได้เปรียบมาก · คณะที่มีหลักสูตรเล็กจำนวนมากจะเห็นต้นทุนกระจายผิดรูป',
  },
  {
    value: 'CUSTOM_PCT',
    no: '3',
    label: 'กำหนดสัดส่วนเปอร์เซ็นต์เอง',
    icon: 'ri-percent-line',
    summary: 'คณะระบุเองว่าแต่ละกลุ่ม (ระดับการศึกษา หรือรายหลักสูตร) รับกี่เปอร์เซ็นต์',
    pros: 'สะท้อนมติของคณะได้ตรงที่สุด เช่น ป.ตรี 90% · บัณฑิตศึกษา 10%',
    cons: 'ต้องแนบเหตุผล + เลขที่มติ · ผลรวมต้องเป็น 100% พอดี · ติดธง MANUAL_OVERRIDE',
  },
];

type Props = {
  value: FixedCostMethod;
  onChange: (method: FixedCostMethod) => void;
  /** วิธีที่คณะใช้อยู่ตอนนี้ — แสดงป้าย "ใช้อยู่ปัจจุบัน" */
  current: FixedCostMethod;
};

/** ขั้นที่ 1 ของ Stepper — การ์ด 3 ใบให้เลือกวิธี */
const MethodCards = ({ value, onChange, current }: Props) => (
  <Grid container spacing={4}>
    {METHOD_META.map((m) => {
      const selected = m.value === value;

      return (
        <Grid key={m.value} size={{ xs: 12, md: 4 }}>
          <Card
            role="radio"
            aria-checked={selected}
            aria-label={m.label}
            tabIndex={0}
            onClick={() => onChange(m.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(m.value);
              }
            }}
            sx={{
              height: '100%',
              cursor: 'pointer',
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: selected ? 'primary.main' : 'transparent',
              transition: 'border-color .2s, box-shadow .2s',
              '&:hover': { borderColor: selected ? 'primary.main' : 'primary.light' },
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className={m.icon} style={{ fontSize: 22 }} />
                <Typography variant="h6" sx={{ flex: 1 }}>
                  {m.no}. {m.label}
                </Typography>
                {/* ตัวการ์ดทั้งใบเป็น radio อยู่แล้ว วงกลมนี้จึงเป็นภาพประกอบ ไม่ใช่ตัวควบคุมซ้อน */}
                <Radio
                  checked={selected}
                  size="small"
                  inputProps={{ tabIndex: -1, 'aria-hidden': true }}
                />
              </Box>

              {m.value === current && (
                <Chip
                  size="small"
                  variant="tonal"
                  color="info"
                  label="ใช้อยู่ปัจจุบัน"
                  sx={{ alignSelf: 'flex-start' }}
                />
              )}

              <Typography variant="body2">{m.summary}</Typography>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <i
                  className="ri-thumb-up-line"
                  style={{ fontSize: 16, marginTop: 2, opacity: 0.7 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {m.pros}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <i className="ri-alert-line" style={{ fontSize: 16, marginTop: 2, opacity: 0.7 }} />
                <Typography variant="caption" color="text.secondary">
                  {m.cons}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      );
    })}
  </Grid>
);

export default MethodCards;
