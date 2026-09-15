// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

/**
 * รายการกติกาพร้อมป้ายกำกับ — แทน .rule-row ของ mockup (extra.css)
 *
 * ใช้ในหน้าที่ต้องอธิบายว่า "ทำไมข้อมูลหลักถึงต้องเป็นแบบนี้" (W11, W17, W19)
 * ป้ายด้านขวาบอกว่ากติกานั้นเป็นข้อบังคับ ตรวจอัตโนมัติ หรือเป็นผลข้างเคียงที่ต้องรู้
 */

export type Rule = {
  name: string
  description: ReactNode
  chip?: string
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

type Props = {
  title: string
  subheader?: ReactNode
  rules: Rule[]
  /** ข้อความหรือแถบเตือนท้ายการ์ด */
  footer?: ReactNode
}

const RuleList = ({ title, subheader, rules, footer }: Props) => (
  <Card className='bs-full'>
    <CardHeader title={title} subheader={subheader} />
    <CardContent className='flex flex-col gap-4'>
      {rules.map(rule => (
        <Box key={rule.name} className='flex justify-between items-start gap-3'>
          <div>
            <Typography sx={{ fontWeight: 600 }}>{rule.name}</Typography>
            <Typography variant='caption' color='text.secondary' component='div'>
              {rule.description}
            </Typography>
          </div>
          {rule.chip && <Chip size='small' variant='tonal' color={rule.color ?? 'default'} label={rule.chip} />}
        </Box>
      ))}
      {footer}
    </CardContent>
  </Card>
)

export default RuleList
