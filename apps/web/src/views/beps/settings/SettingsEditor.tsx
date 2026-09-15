'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@components/Link'

// Type Imports
import type { SettingGroup, SystemSetting } from '@/server/beps/settings'

/**
 * รายการค่าตั้ง + ผลกระทบของแต่ละตัวเลือก — ต้นฉบับ: mockup/W15-settings.html
 *
 * การแก้ค่าที่นี่เป็น **ร่าง** เสมอ ยังไม่มีผลจนกว่าจะผ่านการอนุมัติ และค่าที่ติดป้าย
 * "กระทบตัวเลข" เปลี่ยนแล้วต้องสร้างรอบคำนวณใหม่ที่ W11 — ตัวเลขเก่าจะไม่เปลี่ยนตามเอง
 * (นี่คือสาเหตุที่ปุ่มบันทึกไม่ใช่การบันทึกตรงๆ)
 */

type GroupFilter = 'all' | SettingGroup

const FILTERS: { value: GroupFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'calculation', label: 'การคำนวณ' },
  { value: 'allocation', label: 'การปันส่วน' },
  { value: 'presentation', label: 'การแสดงผล' }
]

type Props = {
  settings: SystemSetting[]
  /** ข้อความเทียบ Q* 2 วิธีที่คำนวณสดจากข้อมูลจริง */
  qStarNote: string
}

const SettingsEditor = ({ settings, qStarNote }: Props) => {
  const [group, setGroup] = useState<GroupFilter>('all')
  const [selectedKey, setSelectedKey] = useState(settings[0]?.key ?? '')
  const [draft, setDraft] = useState<Record<string, string>>({})

  const valueOf = (setting: SystemSetting) => draft[setting.key] ?? setting.currentValue ?? setting.defaultValue

  const rows = settings.filter(setting => group === 'all' || setting.group === group)
  const selected = settings.find(setting => setting.key === selectedKey) ?? settings[0]

  const changed = Object.keys(draft).filter(key => {
    const setting = settings.find(s => s.key === key)

    return setting && draft[key] !== (setting.currentValue ?? setting.defaultValue)
  })

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-4 flex-wrap'>
          <ToggleButtonGroup
            exclusive
            size='small'
            color='primary'
            value={group}
            onChange={(_, next: GroupFilter | null) => next && setGroup(next)}
          >
            {FILTERS.map(filter => (
              <ToggleButton key={filter.value} value={filter.value} sx={{ textTransform: 'none' }}>
                {filter.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Chip size='small' variant='tonal' color='warning' label='กระทบตัวเลข = เปลี่ยนแล้วต้องสั่งคำนวณใหม่' />
        </div>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title='รายการค่าตั้ง'
            subheader='คลิกชื่อค่าตั้งเพื่อดูผลกระทบ · ค่าที่ไม่ได้ตั้งทับจะใช้ค่าเริ่มต้นจากนิยามระบบ'
          />
          <CardContent className='flex flex-col gap-4'>
            {rows.map(setting => {
              const value = valueOf(setting)
              const isOverridden = setting.currentValue !== null

              const isDirty =
                draft[setting.key] !== undefined &&
                draft[setting.key] !== (setting.currentValue ?? setting.defaultValue)

              return (
                <Box
                  key={setting.key}
                  onClick={() => setSelectedKey(setting.key)}
                  sx={{
                    cursor: 'pointer',
                    paddingBlockEnd: 4,
                    borderBlockEnd: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: setting.key === selectedKey ? 'primary.lighterOpacity' : 'transparent'
                  }}
                >
                  <div className='flex justify-between items-start gap-3 flex-wrap'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <Typography sx={{ fontWeight: 600 }}>{setting.name}</Typography>
                        <Chip size='small' variant='outlined' label={setting.groupLabel} />
                        {setting.affectsNumbers && (
                          <Chip size='small' variant='tonal' color='warning' label='กระทบตัวเลข' />
                        )}
                        {isDirty && <Chip size='small' variant='tonal' color='primary' label='แก้ไขแล้ว (ร่าง)' />}
                      </div>
                      <Typography variant='caption' color='text.secondary' component='div'>
                        <code>{setting.key}</code> · {setting.description}
                      </Typography>
                    </div>

                    {setting.options.length > 0 ? (
                      <TextField
                        select
                        size='small'
                        value={value}
                        onChange={e => setDraft(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        onClick={event => event.stopPropagation()}
                        sx={{ minInlineSize: 200 }}
                      >
                        {setting.options.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography component='code' sx={{ fontWeight: 700 }}>
                        {value}
                      </Typography>
                    )}
                  </div>

                  {!isOverridden && (
                    <Typography variant='caption' color='warning.main'>
                      ยังไม่มีมติกำหนดค่านี้ — ใช้ค่าเริ่มต้นจากนิยามระบบ ({setting.defaultValue})
                    </Typography>
                  )}
                </Box>
              )
            })}

            <div className='flex items-center gap-3 flex-wrap'>
              <Button variant='contained' disabled={changed.length === 0}>
                เสนออนุมัติการเปลี่ยนแปลง
              </Button>
              <Button variant='outlined' disabled={changed.length === 0} onClick={() => setDraft({})}>
                ย้อนกลับ
              </Button>
              <Typography variant='caption' color={changed.length ? 'primary.main' : 'text.disabled'}>
                {changed.length
                  ? `แก้ไข ${changed.length} ค่า — ยังไม่มีผลจนกว่าจะผ่านการอนุมัติ`
                  : 'ยังไม่มีการเปลี่ยนแปลง'}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card className='bs-full'>
          <CardHeader
            title='ผลกระทบถ้าเปลี่ยนค่านี้'
            subheader={selected ? `${selected.name} · ประเมินจากชุดข้อมูลที่โหลดอยู่` : null}
            action={
              selected && (
                <Chip
                  size='small'
                  variant='tonal'
                  color={selected.affectsNumbers ? 'warning' : 'success'}
                  label={selected.affectsNumbers ? 'ต้องคำนวณใหม่' : 'ไม่ต้องคำนวณใหม่'}
                />
              )
            }
          />
          <CardContent className='flex flex-col gap-3'>
            {selected &&
              Object.entries(selected.impact).map(([option, text]) => {
                const isCurrent = option === valueOf(selected)

                return (
                  <Box
                    key={option}
                    sx={{
                      border: '1px solid',
                      borderColor: isCurrent ? 'primary.main' : 'divider',
                      backgroundColor: isCurrent ? 'primary.lighterOpacity' : 'action.hover',
                      borderRadius: 1,
                      paddingBlock: 3,
                      paddingInline: 4
                    }}
                  >
                    <div className='flex items-center gap-2 mbe-1'>
                      <Typography component='code' color='primary.main' sx={{ fontWeight: 700 }}>
                        {option}
                      </Typography>
                      {isCurrent && <Chip size='small' variant='tonal' color='success' label='ค่าที่ใช้อยู่' />}
                    </div>
                    <Typography variant='body2' color='text.secondary'>
                      {text}
                    </Typography>
                  </Box>
                )
              })}

            {selected?.key === 'qstar_primary_method' && (
              <Typography variant='body2' color='primary.main'>
                {qStarNote}
              </Typography>
            )}

            {selected?.affectsNumbers && (
              <Typography variant='caption' color='warning.main'>
                เปลี่ยนค่านี้แล้ว ตัวเลขในหน้า W1–W5 <b>จะยังไม่เปลี่ยน</b> จนกว่าจะสร้างและอนุมัติรอบคำนวณใหม่ที่{' '}
                <Link href='/admin/runs'>รอบคำนวณ (W11)</Link>
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default SettingsEditor
