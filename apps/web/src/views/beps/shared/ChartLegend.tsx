// MUI Imports
import Typography from '@mui/material/Typography'

/**
 * คำอธิบายสีของกราฟ — แทน .leg-row ของ mockup (beps.css)
 *
 * เขียนเองแทนการใช้ legend ในตัวของ Chart.js เพราะ legend ของ Chart.js วาดลง canvas
 * ทำให้ screen reader อ่านไม่ได้ และปรับฟอนต์ให้ตรงกับธีมได้ยาก — mockup ก็แยกออกมาเช่นกัน
 */

type Props = {
  items: { label: string; color: string }[]
}

const ChartLegend = ({ items }: Props) => (
  <div className='flex items-center gap-4 flex-wrap mbe-3'>
    {items.map(item => (
      <div key={item.label} className='flex items-center gap-2'>
        <span
          style={{ inlineSize: 10, blockSize: 10, borderRadius: 2, background: item.color, display: 'inline-block' }}
        />
        <Typography variant='caption' color='text.secondary'>
          {item.label}
        </Typography>
      </div>
    ))}
  </div>
)

export default ChartLegend
