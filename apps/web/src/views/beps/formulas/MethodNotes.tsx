// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * หมายเหตุลำดับชั้นการวิเคราะห์ และเอกสารอ้างอิง
 *
 * จำนวนคณะ/หลักสูตรนับจากชุดข้อมูลที่โหลดอยู่ ไม่ใช่เลขที่พิมพ์ไว้ตายตัวใน mockup
 * บรรณานุกรมเป็นข้อความคงที่ (APA 7th) — ถ้าจะแก้ต้องแก้ที่นี่ที่เดียว
 */

const REFERENCES = [
  'Horngren, C. T., Datar, S. M., & Rajan, M. V. (2015). Cost accounting: A managerial emphasis (15th ed.). Pearson Education.',
  'Drury, C. (2018). Management and cost accounting (10th ed.). Cengage Learning EMEA.',
  'Garrison, R. H., Noreen, E. W., & Brewer, P. C. (2021). Managerial accounting (17th ed.). McGraw-Hill Education.',
  'Johnes, G., & Johnes, J. (Eds.). (2004). International handbook on the economics of education. Edward Elgar Publishing.',
  'กรมบัญชีกลาง. (2566). หลักเกณฑ์การคำนวณต้นทุนต่อหน่วยผลผลิตของส่วนราชการ. กระทรวงการคลัง.',
  'สำนักงานคณะกรรมการการอุดมศึกษา. (2565). แนวทางการวิเคราะห์ต้นทุนและการจัดทำงบประมาณของสถาบันอุดมศึกษา. กระทรวง อว.',
  'มหาวิทยาลัยมหาสารคาม. (2568). รายงานต้นทุนต่อหน่วยผลผลิตและการวิเคราะห์จุดคุ้มทุน. กองแผนงาน มมส.',
  'Worthington, A. C., & Higgs, H. (2011). Economies of scale and scope in Australian higher education. Higher Education, 61(4), 387–414.',
  'Vanderbei, R. J. (2020). Linear programming: Foundations and extensions (5th ed.). Springer.'
]

type Props = {
  facultyCount: number
  programCount: number
}

const MethodNotes = ({ facultyCount, programCount }: Props) => (
  <>
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardHeader
          avatar={<i className='ri-organization-chart' />}
          title='ลำดับชั้นการวิเคราะห์ และเรื่อง "ภาควิชา"'
        />
        <CardContent className='flex flex-col gap-3'>
          <Typography variant='body2' color='text.secondary'>
            ระบบรวมข้อมูลจากล่างขึ้นบน: <b>หลักสูตร ({fmtInt(programCount)})</b> →{' '}
            <b>ระดับการศึกษาในแต่ละคณะ (ปริญญาตรี / บัณฑิตศึกษา)</b> → <b>คณะ ({fmtInt(facultyCount)})</b> →{' '}
            <b>มหาวิทยาลัย</b> ทุกตัวเลขระดับบนคือผลรวมของหน่วยย่อย ส่วน R, AVC, Q* คำนวณใหม่จากยอดรวมของหน่วยนั้น
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            ชุดข้อมูลนี้ไม่มีคอลัมน์ &ldquo;ภาควิชา&rdquo; โดยตรง ระบบจึงใช้ <b>ระดับการศึกษา</b> เป็นชั้นกลางแทน
            ซึ่งตรงกับวิธีที่ Excel ปันส่วนต้นทุนสำนักงานเลขานุการ (แยกระดับปริญญาตรี / บัณฑิตศึกษา) —
            หากมีตารางจับคู่หลักสูตร→ภาควิชาจริง สามารถสลับชั้นกลางได้ทันที
          </Typography>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12 }}>
      <Card>
        <CardHeader avatar={<i className='ri-book-2-line' />} title='เอกสารอ้างอิง (APA 7th Edition)' />
        <CardContent>
          <Box component='ol' sx={{ margin: 0, paddingInlineStart: 5 }}>
            {REFERENCES.map(ref => (
              <Typography
                key={ref}
                component='li'
                variant='body2'
                color='text.secondary'
                sx={{
                  paddingBlock: 2,
                  borderBlockEnd: 1,
                  borderColor: 'divider',
                  '&:last-of-type': { borderBlockEnd: 0 }
                }}
              >
                {ref}
              </Typography>
            ))}
          </Box>
          <Typography variant='caption' color='text.disabled' className='block mbs-4'>
            แหล่งข้อมูล: ไฟล์ &ldquo;20260711_จุดคุ้มทุน update.xlsx&rdquo; — ชีต 1.รายได้ และ 2.ค่าใช้จ่าย ·
            ปรับปรุงจากแอป breakeven_app v7
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  </>
)

export default MethodNotes
