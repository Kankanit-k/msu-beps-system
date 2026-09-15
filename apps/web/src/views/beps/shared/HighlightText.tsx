// MUI Imports
import Box from '@mui/material/Box'

/**
 * ไฮไลต์คำค้นในข้อความ — แทน phTableHL() / beTableHL() ของ mockup
 *
 * ไฮไลต์เฉพาะตำแหน่งแรกที่พบ (เหมือน mockup) เพราะชื่อหน่วยงานไม่ยาวพอที่จะมีคำซ้ำ
 * จนสับสน และการไฮไลต์ทุกตำแหน่งทำให้แถวอ่านยากกว่าเดิม
 */

type Props = {
  text: string
  /** คำค้นที่ normalize เป็นตัวพิมพ์เล็กแล้ว */
  query: string
}

const HighlightText = ({ text, query }: Props) => {
  if (!query) return <>{text}</>

  const index = text.toLowerCase().indexOf(query)

  if (index < 0) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <Box component='mark' sx={{ backgroundColor: 'warning.lightOpacity', color: 'inherit', borderRadius: 0.5 }}>
        {text.slice(index, index + query.length)}
      </Box>
      {text.slice(index + query.length)}
    </>
  )
}

export default HighlightText
