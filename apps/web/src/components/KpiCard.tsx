'use client';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export type KpiAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  label: string;
  value: string;
  /** บรรทัดล่าง — หน่วย/บริบทของตัวเลข */
  unit: string;
  /** เส้นสีขอบบน — ตรงกับคลาส .kpi.cn/.cg/.co/.cr ของ mockup */
  accent?: KpiAccent;
  /** สีตัวเลขเมื่อต้องสื่อความหมาย (กำไร/ขาดทุน) — ปกติปล่อยเป็นสีข้อความปกติ */
  valueColor?: string;
};

/**
 * การ์ด KPI — ตรงกับ .kpi ของ mockup: เส้นสี 3px ขอบบน ตัวหนังสือแน่น ไม่มีไอคอน
 * ความสูงเต็มช่องเสมอ เพื่อให้ทั้งแถวเรียงเท่ากันแม้ unit ยาวไม่เท่ากัน
 */
const KpiCard = ({ label, value, unit, accent, valueColor }: Props) => (
  <Card
    sx={{
      blockSize: '100%',
      // MUI's sx border shorthand only maps the physical props, so use borderTop here.
      ...(accent && { borderTop: 3, borderTopColor: `${accent}.main` }),
    }}
  >
    <CardContent sx={{ px: 4, py: 3.5, '&:last-child': { pb: 3.5 } }}>
      <Typography
        sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 }}
        color="text.secondary"
      >
        {label}
      </Typography>
      <Typography
        className="num"
        sx={{
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          lineHeight: 1.3,
          marginBlock: '2px',
          color: valueColor ?? 'text.primary',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{ fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.4 }}
        color="text.disabled"
      >
        {unit}
      </Typography>
    </CardContent>
  </Card>
);

export default KpiCard;
