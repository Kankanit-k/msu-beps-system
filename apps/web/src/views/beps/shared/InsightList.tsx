// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

/**
 * กล่อง "ประเด็นสำคัญ" ท้ายหน้า — ย้ายจาก .ins / renderInsights() ของ mockup
 *
 * ทุกข้อความต้องคำนวณจากข้อมูลที่โหลดอยู่จริง ไม่ใช่ประโยคที่เขียนตายตัว — ถ้าวันหนึ่ง
 * สลับไปใช้ข้อมูลจริง ข้อสรุปต้องเปลี่ยนตามเองโดยไม่ต้องแก้หน้าจอ
 *
 * `tone` ตรงกับ 4 ระดับของ mockup (info · ok · warn · crit) ใช้กำหนดไอคอนและสีนำหน้า
 */

export type InsightTone = 'info' | 'ok' | 'warn' | 'crit'

export type Insight = {
  tone?: InsightTone
  content: ReactNode
}

const toneStyle: Record<InsightTone, { icon: string; color: string }> = {
  info: { icon: 'ri-information-line', color: 'info.main' },
  ok: { icon: 'ri-check-line', color: 'success.main' },
  warn: { icon: 'ri-error-warning-line', color: 'warning.main' },
  crit: { icon: 'ri-alarm-warning-line', color: 'error.main' }
}

type Props = {
  title: string
  items: Insight[]
}

const InsightList = ({ title, items }: Props) => (
  <Card>
    <CardHeader title={title} avatar={<i className='ri-lightbulb-line' />} />
    <CardContent>
      <div className='flex flex-col gap-3'>
        {items.map((item, index) => {
          const tone = toneStyle[item.tone ?? 'info']

          return (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className='flex items-start gap-3'>
              <Typography component='i' className={tone.icon} sx={{ color: tone.color, lineHeight: 1.6 }} />
              <Typography variant='body2' color='text.secondary' component='div'>
                {item.content}
              </Typography>
            </div>
          )
        })}
      </div>
    </CardContent>
  </Card>
)

export default InsightList
