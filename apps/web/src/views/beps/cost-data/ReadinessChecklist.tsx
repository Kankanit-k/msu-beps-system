// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'

// Type Imports
import type { ValidationIssue, ValidationSeverity } from '@/server/beps/cost-data'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * บล็อกตรวจความพร้อมก่อนสั่งคำนวณ (W9) — ย้ายจาก `val-list` ของ mockup/W9-cost-data.html
 *
 * เป็นของใหม่ทั้งหมดที่ prototype ไม่มี เพราะ prototype ใช้ข้อมูลที่ fix มาแล้ว
 * ระบบจริงข้อมูลไม่ครบได้ตลอด — ต้องเห็น **ก่อน** คำนวณ ไม่ใช่รู้ตอนตัวเลขออกมาแล้วผิด
 *
 * ปุ่มสร้างรอบคำนวณถูกปิดไว้เมื่อยังมีปัญหาระดับ block ค้างอยู่ — การปิดปุ่มคือกติกา
 * ของหน้านี้ ไม่ใช่การตกแต่ง (SA.md §9.1 ข้อ 5)
 */

const severityStyle: Record<ValidationSeverity, { icon: string; color: 'error' | 'warning' | 'info'; label: string }> =
  {
    block: { icon: 'ri-forbid-2-line', color: 'error', label: 'ปิดกั้นการคำนวณ' },
    warn: { icon: 'ri-error-warning-line', color: 'warning', label: 'เตือน' },
    info: { icon: 'ri-information-line', color: 'info', label: 'ทราบไว้' }
  }

type Props = {
  issues: ValidationIssue[]
}

const ReadinessChecklist = ({ issues }: Props) => {
  const blockers = issues.filter(issue => issue.severity === 'block')

  return (
    <Card className='bs-full'>
      <CardHeader
        title='ตรวจความพร้อมก่อนสั่งคำนวณ'
        subheader='ระบบจริงข้อมูลไม่ครบได้ตลอด — ต้องเห็นก่อนคำนวณ ไม่ใช่รู้ตอนตัวเลขออกมาแล้วผิด'
      />
      <CardContent className='flex flex-col gap-4'>
        {issues.map(issue => {
          const style = severityStyle[issue.severity]

          return (
            <Box
              key={issue.title}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 3,
                paddingBlockEnd: 4,
                borderBlockEnd: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  inlineSize: 28,
                  blockSize: 28,
                  borderRadius: 1,
                  flexShrink: 0,
                  backgroundColor: `${style.color}.lightOpacity`,
                  color: `${style.color}.main`
                }}
                title={style.label}
              >
                <i className={style.icon} />
              </Box>

              <div className='flex-1'>
                <Typography sx={{ fontWeight: 600 }}>
                  {issue.title}{' '}
                  <Typography component='span' color={`${style.color}.main`} sx={{ fontWeight: 800 }}>
                    {fmtInt(issue.count)}
                  </Typography>{' '}
                  <Typography component='span' variant='caption' color='text.disabled'>
                    {issue.unit}
                  </Typography>
                </Typography>
                <Typography variant='caption' color='text.secondary' component='div'>
                  ผลกระทบ: {issue.impact} · ผู้รับผิดชอบ: <b>{issue.owner}</b>
                </Typography>
              </div>

              <Button size='small' variant='outlined' component={Link} href={issue.href}>
                ไปแก้
              </Button>
            </Box>
          )
        })}

        <div className='flex items-center gap-4 flex-wrap'>
          <Button variant='contained' disabled startIcon={<i className='ri-play-line' />}>
            สร้างรอบคำนวณใหม่
          </Button>
          {blockers.length > 0 && (
            <Typography variant='caption' color='error.main'>
              มี {blockers.length} ปัญหาที่ปิดกั้นอยู่ — แก้ให้ครบก่อนจึงจะสร้าง run ได้
            </Typography>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ReadinessChecklist
