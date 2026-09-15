'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Chart Imports
import { useChartPalette } from '@/libs/ChartJs'

// Component Imports
import ShareRow from '@views/beps/shared/ShareRow'
import SplitBar from '@views/beps/shared/SplitBar'

// Type Imports
import type { AllocationMethod } from '@/server/beps/reconciliation'

// Util Imports
import { fmtDec, fmtMillions } from '@/utils/beps-format'

/**
 * ที่มาของต้นทุนรวม — ย้ายจากการ์ด "ที่มาของต้นทุนรวม" ของ mockup/W12-reconciliation.html
 *
 * แยกเป็นต้นทุนที่ผูกหลักสูตรได้โดยตรง เทียบกับที่ต้องปันส่วน แล้วลงรายละเอียดว่าแต่ละวิธี
 * ปันไปเท่าไร — วิธีที่แม่นน้อยกว่าควรมีสัดส่วนน้อยที่สุด
 */

type Props = {
  methods: AllocationMethod[]
  /** ต้นทุนรวมทั้งมหาวิทยาลัย */
  total: number
}

const CostOriginCard = ({ methods, total }: Props) => {
  const palette = useChartPalette()
  const allocated = methods.filter(m => m.isAllocated).reduce((sum, m) => sum + m.amount, 0)
  const direct = total - allocated
  const directShare = total > 0 ? (direct / total) * 100 : 0

  return (
    <Card className='bs-full'>
      <CardHeader title='ที่มาของต้นทุนรวม' subheader='ต้นทุนที่ผูกหลักสูตรได้โดยตรง เทียบ ต้นทุนที่ต้องปันส่วน' />
      <CardContent className='flex flex-col gap-4'>
        <SplitBar percent={directShare} firstColor={palette.positive} secondColor={palette.variable} height={14} />

        <div className='flex justify-between gap-4 flex-wrap'>
          <Typography variant='body2' color='success.main' sx={{ fontWeight: 700 }}>
            ตรง {fmtDec(directShare, 0)}% — {fmtMillions(direct)} ลบ.
          </Typography>
          <Typography variant='body2' color='warning.main' sx={{ fontWeight: 700 }}>
            ปันส่วน {fmtDec(100 - directShare, 0)}% — {fmtMillions(allocated)} ลบ.
          </Typography>
        </div>

        <div className='flex flex-col gap-3'>
          {methods.map(method => (
            <div key={method.label} className='flex flex-col gap-1'>
              <ShareRow
                label={method.label}
                value={`${fmtMillions(method.amount)} ลบ.`}
                share={`${fmtDec(total > 0 ? (method.amount / total) * 100 : 0)}%`}
                color={method.color}
              />
              <Typography variant='caption' color='text.disabled'>
                {method.note}
              </Typography>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default CostOriginCard
