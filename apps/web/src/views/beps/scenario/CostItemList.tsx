'use client'

// MUI Imports
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/**
 * รายการต้นทุนที่เพิ่ม/ลบ/แก้ยอดได้ — แทน .cost-row + addRow() ของ mockup
 *
 * ใช้ทั้ง W6 และ W7 · แต่ละแถวเลือกหมวดจากรายการสำเร็จหรือพิมพ์ชื่อเอง
 * (หมวดสำเร็จมาจากผังบัญชีจริง จึงกรอกได้เร็วและเทียบกับ W14 ได้)
 */

export type CostItem = {
  id: string
  label: string
  amount: number
}

const CUSTOM = '__custom__'

type Props = {
  title: string
  items: CostItem[]
  presets: string[]
  onChange: (items: CostItem[]) => void
  color: 'primary' | 'success'
}

const CostItemList = ({ title, items, presets, onChange, color }: Props) => {
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  const update = (id: string, patch: Partial<CostItem>) =>
    onChange(items.map(item => (item.id === id ? { ...item, ...patch } : item)))

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-baseline gap-3 flex-wrap'>
        <Typography variant='body2' color={`${color}.main`} sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant='body2'>
          รวม{' '}
          <Typography component='span' color={`${color}.main`} sx={{ fontWeight: 700 }}>
            {total.toLocaleString('th-TH')}
          </Typography>{' '}
          บาท
        </Typography>
      </div>

      <div className='flex flex-col gap-3' style={{ maxBlockSize: 260, overflowY: 'auto' }}>
        {items.map(item => {
          const isPreset = presets.includes(item.label)

          return (
            <div key={item.id} className='flex gap-2 items-center'>
              <TextField
                select
                size='small'
                value={isPreset ? item.label : CUSTOM}
                onChange={e => update(item.id, { label: e.target.value === CUSTOM ? '' : e.target.value })}
                sx={{ flex: '1 1 40%', minInlineSize: 130 }}
              >
                {presets.map(preset => (
                  <MenuItem key={preset} value={preset}>
                    {preset}
                  </MenuItem>
                ))}
                <MenuItem value={CUSTOM}>— กรอกเอง —</MenuItem>
              </TextField>

              {!isPreset && (
                <TextField
                  size='small'
                  placeholder='ชื่อรายการ'
                  value={item.label}
                  onChange={e => update(item.id, { label: e.target.value })}
                  sx={{ flex: '1 1 30%', minInlineSize: 120 }}
                />
              )}

              <TextField
                size='small'
                type='number'
                value={item.amount || ''}
                placeholder='0'
                onChange={e => update(item.id, { amount: Number(e.target.value) || 0 })}
                sx={{ flex: '1 1 25%', minInlineSize: 110 }}
              />

              <IconButton
                size='small'
                aria-label='ลบรายการ'
                onClick={() => onChange(items.filter(x => x.id !== item.id))}
              >
                <i className='ri-close-line' />
              </IconButton>
            </div>
          )
        })}
      </div>

      <Button
        size='small'
        variant='outlined'
        color={color}
        startIcon={<i className='ri-add-line' />}
        onClick={() =>
          onChange([...items, { id: `${Date.now()}-${items.length}`, label: presets[0] ?? '', amount: 0 }])
        }
      >
        เพิ่มรายการ
      </Button>
    </div>
  )
}

export default CostItemList
