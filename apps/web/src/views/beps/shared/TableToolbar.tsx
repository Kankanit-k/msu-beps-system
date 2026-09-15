'use client'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

/**
 * ช่องค้นหา + ปุ่มกรองด่วนเหนือตาราง — แทน .be-search-wrap / .be-qbtn ของ mockup
 *
 * ใช้ร่วมกันระหว่าง W2 และ W4a ซึ่ง mockup เขียนโค้ดชุดเดียวกันไว้คนละไฟล์
 */

export type QuickFilter<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  search: string
  onSearchChange: (value: string) => void
  placeholder: string
  filters: QuickFilter<T>[]
  filter: T
  onFilterChange: (value: T) => void
}

const TableToolbar = <T extends string>({
  search,
  onSearchChange,
  placeholder,
  filters,
  filter,
  onFilterChange
}: Props<T>) => (
  <div className='flex items-center gap-3 flex-wrap'>
    <TextField
      size='small'
      value={search}
      placeholder={placeholder}
      onChange={e => onSearchChange(e.target.value)}
      sx={{ minInlineSize: 240 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position='start'>
              <i className='ri-search-line' />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position='end'>
              <IconButton size='small' edge='end' onClick={() => onSearchChange('')} aria-label='ล้างคำค้นหา'>
                <i className='ri-close-line' />
              </IconButton>
            </InputAdornment>
          ) : null
        }
      }}
    />

    <ToggleButtonGroup
      exclusive
      size='small'
      color='primary'
      value={filter}
      onChange={(_, next: T | null) => next && onFilterChange(next)}
    >
      {filters.map(item => (
        <ToggleButton key={item.value} value={item.value} sx={{ textTransform: 'none' }}>
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </div>
)

export default TableToolbar
