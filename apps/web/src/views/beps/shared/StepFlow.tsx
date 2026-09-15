// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * ไทม์ไลน์สถานะเป็นขั้น — ย้ายจาก .flow ของ mockup (extra.css)
 *
 * ขั้นที่ผ่านแล้วเป็นเครื่องหมายถูก · ขั้นปัจจุบันเป็นจุดทึบ · ขั้นที่ยังไม่ถึงเป็นจุดกลวง
 * ใช้ทั้งกับรอบคำนวณ (W11 — สถานะ FAILED ไม่อยู่ในสายนี้เพราะ run ที่ล้มต้องสร้างใหม่)
 * และวงจรชีวิตหลักสูตร (W16)
 */

type Props = {
  flow: { state: string; label: string }[]
  /** สถานะที่กำลังอยู่ — ค่าที่ไม่มีในสายจะทำให้ไม่มีขั้นไหนถูกไฮไลต์ */
  current: string
}

const StepFlow = ({ flow, current }: Props) => {
  const currentIndex = flow.findIndex(step => step.state === current)

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      {flow.map((step, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <Box key={step.state} className='flex items-center gap-2'>
            {index > 0 && (
              <Typography component='i' className='ri-arrow-right-line' color='text.disabled' sx={{ fontSize: 14 }} />
            )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                paddingBlock: 1,
                paddingInline: 3,
                borderRadius: 5,
                fontSize: '0.8125rem',
                fontWeight: isCurrent ? 700 : 500,
                backgroundColor: isDone ? 'success.lightOpacity' : isCurrent ? 'primary.lightOpacity' : 'action.hover',
                color: isDone ? 'success.main' : isCurrent ? 'primary.main' : 'text.disabled'
              }}
            >
              <i className={isDone ? 'ri-check-line' : isCurrent ? 'ri-record-circle-line' : 'ri-circle-line'} />
              {step.label}
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

export default StepFlow
