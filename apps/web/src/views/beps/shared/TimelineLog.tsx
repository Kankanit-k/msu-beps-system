// MUI Imports
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// React Imports

/**
 * ไทม์ไลน์เหตุการณ์ — แทน .log / .log-item ของ mockup (extra.css)
 *
 * ใช้ร่วมกันทุกหน้าที่ต้องแสดง audit trail (W9 นำเข้าข้อมูล · W11 รอบคำนวณ ·
 * W15 ประวัติการตั้งค่า · W16 ทะเบียนหลักสูตร · W18 การเปลี่ยนสิทธิ์) — SA.md §9.2 ข้อ 9
 * บังคับว่าทุกการแก้ข้อมูลหลักต้องตอบได้ว่าใครทำและเมื่อไร
 */

export type TimelineTone = 'ok' | 'info' | 'warn' | 'error'

export type TimelineEntry = {
  at: string
  icon: string
  tone: TimelineTone
  content: ReactNode
}

const toneColor: Record<TimelineTone, string> = {
  ok: 'success.main',
  info: 'info.main',
  warn: 'warning.main',
  error: 'error.main'
}

type Props = {
  title: string
  subheader?: ReactNode
  entries: TimelineEntry[]
}

const TimelineLog = ({ title, subheader, entries }: Props) => (
  <Card className='bs-full'>
    <CardHeader title={title} subheader={subheader} />
    <CardContent className='flex flex-col gap-4'>
      {entries.map((entry, index) => (
        <Box
          // eslint-disable-next-line react/no-array-index-key
          key={`${entry.at}-${index}`}
          sx={{ display: 'grid', gridTemplateColumns: '84px 28px 1fr', gap: 3, alignItems: 'start' }}
        >
          <Typography variant='caption' color='text.disabled'>
            {entry.at}
          </Typography>
          <Typography
            component='i'
            className={entry.icon}
            sx={{ color: toneColor[entry.tone], fontSize: '1.125rem' }}
          />
          <Typography variant='body2' color='text.secondary'>
            {entry.content}
          </Typography>
        </Box>
      ))}
    </CardContent>
  </Card>
)

export default TimelineLog
