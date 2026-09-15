'use client'

// React Imports
import { useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'

// MUI Imports
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

/**
 * แท็บ 3 ชุดของ W17 — ย้ายจาก .seg#tabs ของ mockup/W17-master-data.html
 *
 * ทั้งสามชุดเป็นข้อมูลหลักคนละเรื่องที่ไม่ต้องดูพร้อมกัน แต่ผู้ดูแลคนเดียวกันเป็นคนแก้
 * จึงอยู่หน้าเดียวแบบแท็บ ไม่แยกเป็น 3 เส้นทาง (ตรงกับที่ SA.md §9 จัดกลุ่มไว้)
 */

type Props = {
  org: ReactNode
  period: ReactNode
  studentType: ReactNode
}

const MasterDataTabs = ({ org, period, studentType }: Props) => {
  const [value, setValue] = useState('org')

  const handleChange = (_: SyntheticEvent, next: string) => setValue(next)

  return (
    <TabContext value={value}>
      <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
        <Tab value='org' label='โครงสร้างหน่วยงาน' icon={<i className='ri-building-line' />} iconPosition='start' />
        <Tab value='period' label='งวดปีงบประมาณ' icon={<i className='ri-calendar-line' />} iconPosition='start' />
        <Tab value='stype' label='ประเภทนิสิต' icon={<i className='ri-group-line' />} iconPosition='start' />
      </CustomTabList>

      <TabPanel value='org' sx={{ paddingInline: 0 }}>
        {org}
      </TabPanel>
      <TabPanel value='period' sx={{ paddingInline: 0 }}>
        {period}
      </TabPanel>
      <TabPanel value='stype' sx={{ paddingInline: 0 }}>
        {studentType}
      </TabPanel>
    </TabContext>
  )
}

export default MasterDataTabs
