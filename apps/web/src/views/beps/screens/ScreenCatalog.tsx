// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'

// Type Imports
import type { AccessLevel } from '@/configs/accessControl'
import type { BepsNavItem } from '@/data/navigation/bepsNav'

/**
 * สารบัญหน้าจอ — ย้ายจาก .hub-grid ของ mockup/screens.html
 *
 * รายการหน้าจออ่านจาก src/data/navigation/bepsNav.ts ซึ่งเป็นแหล่งเดียวกับ sidebar
 * (mockup มีรายชื่อหน้าจอสองชุด: NAV ใน core.js กับ SCREENS ใน screens.html)
 * ทุกกลุ่มจึงบอกชั้นสิทธิ์ขั้นต่ำได้ด้วย — ผู้ที่สิทธิ์ไม่ถึงกดเข้าไปแล้วโดน middleware เด้ง
 */

const levelChip: Record<AccessLevel, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  public: { label: 'เปิดสาธารณะ', color: 'success' },
  user: { label: 'ผู้ใช้ที่ล็อกอิน', color: 'info' },
  deptAdmin: { label: 'ผู้ดูแลหน่วยงาน', color: 'warning' },
  universityAdmin: { label: 'ผู้ดูแลมหาวิทยาลัย', color: 'error' }
}

type Props = {
  groups: { label: string; icon: string; level: AccessLevel; items: BepsNavItem[] }[]
}

const ScreenCard = ({ item }: { item: BepsNavItem }) => (
  <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
    <Card
      component={Link}
      href={item.href}
      className='bs-full block'
      sx={{
        textDecoration: 'none',
        transition: 'border-color .2s, box-shadow .2s',
        border: '1px solid',
        borderColor: item.isNew ? 'primary.main' : 'divider',
        '&:hover': { boxShadow: 6 }
      }}
    >
      <CardContent className='flex gap-4'>
        <i className={item.icon} style={{ fontSize: 24, color: 'var(--mui-palette-primary-main)', flexShrink: 0 }} />
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <Chip size='small' variant='tonal' color='primary' label={item.w} />
            <Typography variant='h6'>{item.label}</Typography>
          </div>
          <Typography variant='body2' color='text.secondary'>
            {item.desc}
          </Typography>
          <Typography variant='caption' color={item.isNew ? 'primary.main' : 'text.disabled'}>
            {item.isNew ? 'หน้าจอใหม่ (ER v2)' : 'ยกมาจาก prototype v8-1'}
          </Typography>
        </div>
      </CardContent>
    </Card>
  </Grid>
)

const ScreenCatalog = ({ groups }: Props) => (
  <div className='flex flex-col gap-8'>
    {groups.map(group => (
      <div key={group.label} className='flex flex-col gap-4'>
        <div className='flex items-center gap-3 flex-wrap'>
          <i className={group.icon} style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h5'>{group.label}</Typography>
          <Chip
            size='small'
            variant='tonal'
            color={levelChip[group.level].color}
            label={levelChip[group.level].label}
          />
        </div>
        <Grid container spacing={6}>
          {group.items.map(item => (
            <ScreenCard key={`${item.w}-${item.href}`} item={item} />
          ))}
        </Grid>
      </div>
    ))}
  </div>
)

export default ScreenCatalog
