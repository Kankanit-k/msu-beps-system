'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import Typography from '@mui/material/Typography';

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar';

// Type Imports
import type { FixedCostMethod } from '@beps/calc-engine';

/** คำอธิบายแต่ละวิธีเป็นภาษาคน — คณะต้องเลือกได้โดยไม่ต้องอ่านสูตร */
export const METHOD_META: {
  value: FixedCostMethod;
  no: string;
  label: string;
  icon: string;
  summary: string;
}[] = [
  {
    value: 'PER_HEAD_FTES',
    no: '1',
    label: 'คิดตามรายหัวนิสิต',
    icon: 'ri-group-line',
    summary: 'นิสิตมาก รับต้นทุนมาก ตามจำนวนนิสิต',
  },
  {
    value: 'EQUAL_PROGRAM',
    no: '2',
    label: 'หารเท่ากันทุกหลักสูตร',
    icon: 'ri-scales-3-line',
    summary: 'ทุกหลักสูตรรับต้นทุนเท่ากัน',
  },
  {
    value: 'CUSTOM_PCT',
    no: '3',
    label: 'กำหนดสัดส่วนเปอร์เซ็นต์เอง',
    icon: 'ri-percent-line',
    summary: 'คณะกำหนดสัดส่วนให้แต่ละระดับหรือหลักสูตรเอง',
  },
];

type Props = {
  value: FixedCostMethod;
  onChange: (method: FixedCostMethod) => void;
  /** วิธีที่คณะใช้อยู่ตอนนี้ — แสดงป้าย "ใช้อยู่ปัจจุบัน" · ไม่ส่ง = ยังไม่มีวิธีที่ใช้อยู่ */
  current?: FixedCostMethod;
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
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: selected ? 'var(--mui-palette-primary-lightOpacity)' : undefined,
              boxShadow: 'none',
              transition: 'border-color .2s, box-shadow .2s',
              '&:hover': { borderColor: selected ? 'primary.main' : 'primary.light' },
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <CustomAvatar skin="light" color="primary" size={48}>
                <i className={m.icon} style={{ fontSize: 24 }} />
              </CustomAvatar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h6">
                  {m.no}. {m.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {m.summary}
                </Typography>
                {m.value === current && (
                  <Chip
                    size="small"
                    variant="tonal"
                    color="info"
                    label="ใช้อยู่ปัจจุบัน"
                    sx={{ alignSelf: 'flex-start' }}
                  />
                )}
              </Box>
              {/* ตัวการ์ดทั้งใบเป็น radio อยู่แล้ว วงกลมนี้จึงเป็นภาพประกอบ ไม่ใช่ตัวควบคุมซ้อน */}
              <Radio
                checked={selected}
                size="small"
                sx={{ mt: -1, mr: -1 }}
                inputProps={{ tabIndex: -1, 'aria-hidden': true }}
              />
            </CardContent>
          </Card>
        </Grid>
      );
    })}
  </Grid>
);

export default MethodCards;
