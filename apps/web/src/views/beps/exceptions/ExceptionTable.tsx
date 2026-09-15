'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { ExceptionFlag, ExceptionState } from '@/server/beps/exceptions'

// Util Imports
import { fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ตารางรายการค้างตรวจ (W13) — ย้ายจาก `exc-tb` ของ mockup/W13-exceptions.html
 *
 * ทุกธงต้องมี **ผู้รับผิดชอบ** และ **มูลค่าที่กระทบ** เพื่อให้ตามแก้ได้จริง
 * ไม่ใช่รู้ว่ามีปัญหาแต่ไม่รู้ว่าของใคร — รายการที่วัดเป็นบาทไม่ได้ต้องเขียนว่า "วัดไม่ได้"
 * ไม่ใช่ปล่อยว่างหรือใส่ 0 ซึ่งจะอ่านเป็น "ไม่กระทบ"
 */

const stateColor: Record<ExceptionState, 'error' | 'warning' | 'default' | 'success'> = {
  OPEN: 'error',
  IN_PROGRESS: 'warning',
  ACCEPTED: 'default',
  RESOLVED: 'success'
}

type Props = {
  exceptions: ExceptionFlag[]
}

const ExceptionTable = ({ exceptions }: Props) => {
  const [flag, setFlag] = useState('all')

  const flags = [...new Set(exceptions.map(e => e.flag))]
  const rows = flag === 'all' ? exceptions : exceptions.filter(e => e.flag === flag)

  return (
    <Card>
      <CardHeader
        title='รายการค้างตรวจทั้งหมด'
        subheader='รายการที่ระบบคำนวณต่อไปได้แต่ไม่มั่นใจ จะถูกติดธงไว้แทนที่จะรวมเงียบๆ'
        action={
          <div className='flex items-center gap-3 flex-wrap'>
            <TextField
              select
              size='small'
              label='ธง'
              value={flag}
              onChange={e => setFlag(e.target.value)}
              sx={{ minInlineSize: 200 }}
            >
              <MenuItem value='all'>ทั้งหมด</MenuItem>
              {flags.map(value => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <Chip size='small' variant='tonal' color='primary' label={`${fmtInt(rows.length)} รายการ`} />
          </div>
        }
        sx={{ flexWrap: 'wrap', gap: 4, '& .MuiCardHeader-action': { margin: 0, alignSelf: 'center' } }}
      />
      <CardContent>
        <div className='overflow-auto' style={{ maxBlockSize: 640 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>ธง</th>
                <th>รายการ</th>
                <th>หน่วยงาน</th>
                <th align='right'>มูลค่าที่กระทบ</th>
                <th>ผู้รับผิดชอบ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.flag}-${row.item}`}>
                  <td>
                    <Chip size='small' variant='tonal' color='warning' label={row.flag} />
                  </td>
                  <td style={{ whiteSpace: 'normal', minWidth: 280 }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.item}</Typography>
                    <Typography variant='caption' color='text.disabled'>
                      {row.note}
                    </Typography>
                  </td>
                  <td>
                    <Typography variant='body2' color='text.secondary'>
                      {row.org}
                    </Typography>
                  </td>
                  <td align='right'>
                    {row.amount === null ? (
                      <Typography color='text.disabled'>วัดไม่ได้</Typography>
                    ) : (
                      <Typography sx={{ fontWeight: 700 }}>{fmtMillions(row.amount)} ลบ.</Typography>
                    )}
                  </td>
                  <td>
                    <Typography variant='body2' color='text.secondary'>
                      {row.owner}
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      ตั้งแต่ {row.since}
                    </Typography>
                  </td>
                  <td>
                    <Chip size='small' variant='tonal' color={stateColor[row.state]} label={row.stateLabel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExceptionTable
