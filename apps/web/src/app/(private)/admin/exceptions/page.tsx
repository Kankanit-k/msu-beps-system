// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import SampleDataAlert from '@components/beps/SampleDataAlert'
import ExceptionTable from '@views/beps/exceptions/ExceptionTable'
import FlagGlossary from '@views/beps/exceptions/FlagGlossary'
import KpiCard from '@views/beps/shared/KpiCard'
import MiniStat from '@views/beps/shared/MiniStat'
import PageHeader from '@views/beps/shared/PageHeader'
import SplitBar from '@views/beps/shared/SplitBar'

// Data Imports
import { getExceptionTotal, getExceptions } from '@/server/beps/exceptions'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * W13 — รายการค้างตรวจ · ต้นฉบับ: mockup/W13-exceptions.html
 *
 * ประเด็นของหน้านี้: **รายการที่ร้ายแรงที่สุดวัดเป็นบาทไม่ได้** — ค่าเสื่อมราคาอาคาร
 * ยังไม่มีข้อมูลเลยแม้แต่แถวเดียว สัดส่วน "มูลค่าที่ติดธง" ที่เห็นจึงต่ำกว่าความจริงเสมอ
 * และต้องกำกับข้อจำกัดนี้ทุกครั้งที่นำเสนอตัวเลข
 */
const ExceptionsPage = () => {
  const exceptions = getExceptions()
  const totalFlagged = getExceptionTotal()
  const totals = getUniversityTotals()

  const universityTc = totals.byMode.with_government.tc
  const flaggedShare = universityTc > 0 ? (totalFlagged / universityTc) * 100 : 0

  const open = exceptions.filter(e => e.state === 'OPEN').length
  const inProgress = exceptions.filter(e => e.state === 'IN_PROGRESS').length
  const accepted = exceptions.filter(e => e.state === 'ACCEPTED').length
  const profit = totals.byMode.with_government.profit

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='รายการค้างตรวจ'
          screen='W13'
          subtitle='ทุกธงมีผู้รับผิดชอบและมูลค่าที่กระทบ เพื่อให้ตามแก้ได้จริง ไม่ใช่รู้ว่ามีปัญหาแต่ไม่รู้ว่าของใคร'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ยังไม่แก้' value={fmtInt(open)} unit='รายการ' color='error.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='กำลังตาม' value={fmtInt(inProgress)} unit='รายการ' color='warning.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='ยอมรับแล้ว' value={fmtInt(accepted)} unit='รายการ · รับทราบข้อจำกัด' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='มูลค่าที่กระทบรวม'
          value={fmtMillions(totalFlagged)}
          unit={`ล้านบาท · ${fmtDec(flaggedShare, 2)}% ของต้นทุนรวม`}
          color='primary.main'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity='warning'>
          <AlertTitle>รายการที่ร้ายแรงที่สุดไม่ได้วัดเป็นบาทได้</AlertTitle>
          ค่าเสื่อมราคาอาคารยังไม่มีข้อมูลเลยแม้แต่แถวเดียว ทำให้ TFC และ TC ต่ำกว่าความจริงทั้งระบบ{' '}
          {profit >= 0 ? (
            <>
              ส่วนเกิน +{fmtMillions(profit)} ลบ. ที่รายงานอยู่จึง<b>สูงเกินจริง</b>
            </>
          ) : (
            <>
              ตัวเลขขาดทุน {fmtMillions(Math.abs(profit))} ลบ. ที่รายงานอยู่จึง<b>น้อยกว่าความจริง</b>
            </>
          )}{' '}
          และ Q* ทุกระดับ<b>ต่ำกว่าที่ควรเป็น</b> — ต้องกำกับข้อจำกัดนี้ทุกครั้งที่นำเสนอตัวเลข
        </Alert>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <ExceptionTable exceptions={exceptions} />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <FlagGlossary />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card className='bs-full'>
          <CardHeader
            title='สัดส่วนเทียบต้นทุนรวม'
            subheader='ประเมินว่าปัญหาคุณภาพข้อมูลใหญ่แค่ไหนเมื่อเทียบกับตัวเลขทั้งหมด'
          />
          <CardContent className='flex flex-col gap-4'>
            <div className='grid gap-4' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <MiniStat label='มูลค่าที่ติดธง' value={fmtMillions(totalFlagged)} sub='ล้านบาท' color='warning.main' />
              <MiniStat
                label='คิดเป็นสัดส่วน'
                value={`${fmtDec(flaggedShare, 2)}%`}
                sub='ของต้นทุนรวม'
                color='warning.main'
              />
              <MiniStat label='เกณฑ์ที่ยอมรับ' value='≤ 1.0%' sub='ตั้งไว้ในนโยบายคุณภาพข้อมูล' color='success.main' />
            </div>

            <SplitBar
              percent={flaggedShare}
              firstColor='var(--mui-palette-warning-main)'
              secondColor='var(--mui-palette-success-main)'
              height={16}
            />

            <div className='flex justify-between gap-4 flex-wrap'>
              <Typography variant='caption' color='warning.main' sx={{ fontWeight: 700 }}>
                ติดธง {fmtDec(flaggedShare, 2)}%
              </Typography>
              <Typography variant='caption' color='success.main' sx={{ fontWeight: 700 }}>
                ผ่านโดยไม่มีข้อสังเกต {fmtDec(100 - flaggedShare, 2)}%
              </Typography>
            </div>

            <Alert severity='warning'>
              ตัวเลข <b>{fmtDec(flaggedShare, 2)}%</b> ดูน้อย แต่<b>ไม่ได้นับค่าเสื่อมราคาอาคารที่หายไปทั้งก้อน</b>{' '}
              เพราะวัดเป็นบาทไม่ได้จนกว่าจะมีข้อมูล — สัดส่วนที่แท้จริงจึงสูงกว่านี้
            </Alert>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ExceptionsPage
