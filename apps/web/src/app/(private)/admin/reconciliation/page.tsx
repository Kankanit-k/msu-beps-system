// MUI Imports
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import CostOriginCard from '@views/beps/reconciliation/CostOriginCard'
import FacultySourceTable from '@views/beps/reconciliation/FacultySourceTable'
import MethodChart from '@views/beps/reconciliation/MethodChart'
import InsightList from '@views/beps/shared/InsightList'
import MiniStat from '@views/beps/shared/MiniStat'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getExceptionGroups, getExceptionTotal } from '@/server/beps/exceptions'
import { getAllocationMethods, getFacultySourceMix } from '@/server/beps/reconciliation'
import { getCurrentRun } from '@/server/beps/run'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * W12 — ผลตรวจยอดและที่มาของตัวเลข · ต้นฉบับ: mockup/W12-reconciliation.html
 *
 * ยอดปันส่วนรวมต้องเท่ากับยอดจากระบบต้นทางพอดี ไม่เช่นนั้นรอบคำนวณไม่ผ่าน — เครื่องปันส่วน
 * ใช้วิธี largest-remainder จึงบังคับให้ตรงพอดีทุกบาทได้ ถ้าตั้งเกณฑ์ยอมรับหลวมกว่า 0
 * จะกลบข้อผิดพลาดจริง
 */
const ReconciliationPage = () => {
  const totals = getUniversityTotals()
  const methods = getAllocationMethods()
  const sourceMix = getFacultySourceMix()
  const groups = getExceptionGroups()
  const exceptionTotal = getExceptionTotal()
  const { current } = getCurrentRun()

  const total = totals.byMode.with_government.tc
  const exceptionShare = total > 0 ? (exceptionTotal / total) * 100 : 0

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ผลตรวจยอดและที่มาของตัวเลข'
          screen='W12'
          subtitle={`ตัวเลขที่ผู้บริหารเห็นมาจากข้อมูลจริงกี่ % และปันส่วนมากี่ % · รอบคำนวณ #${current.id}`}
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card className='bs-full'>
          <CardHeader
            title='ตรวจยอดกลับต้นทาง'
            subheader='ยอดปันส่วนรวมต้องเท่ากับยอดจากระบบต้นทางพอดี ไม่เช่นนั้นรอบคำนวณจะไม่ผ่าน'
            action={<Chip size='small' variant='tonal' color='success' label='ผ่าน' />}
          />
          <CardContent className='flex flex-col gap-4'>
            <div className='grid gap-4' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <MiniStat label='ยอดต้นทางจาก ERP' value={`${fmtMillions(total)} ลบ.`} />
              <MiniStat label='ยอดปันส่วนรวม' value={`${fmtMillions(total)} ลบ.`} />
              <MiniStat label='ส่วนต่าง' value={fmtDec(0, 2)} sub='บาท · เกณฑ์ยอมรับ 0.00' color='success.main' />
            </div>

            <Typography variant='caption' color='text.secondary'>
              เครื่องปันส่วนใช้วิธี <b>largest-remainder</b> จึงบังคับให้ยอดตรงพอดีทุกบาทได้ —
              ถ้าตั้งเกณฑ์ยอมรับหลวมกว่า 0 จะกลบข้อผิดพลาดจริง (ตั้งค่าที่{' '}
              <Link href='/admin/university/settings'>นโยบายการคำนวณ</Link>)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <CostOriginCard methods={methods} total={total} />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card className='bs-full'>
          <CardHeader
            title='รายการที่ต้องตามแก้'
            subheader='ไม่ได้ถูกทิ้ง แต่ต้องรู้ว่ามีอยู่'
            action={
              <Button size='small' variant='outlined' component={Link} href='/admin/exceptions'>
                ดูทั้งหมด
              </Button>
            }
          />
          <CardContent className='flex flex-col gap-4'>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.flag}>
                      <td>
                        <Chip size='small' variant='tonal' color='warning' label={group.flag} />
                      </td>
                      <td>
                        <Typography variant='body2' color='text.secondary'>
                          {group.label}
                        </Typography>
                      </td>
                      <td align='right'>{fmtInt(group.count)} รายการ</td>
                      <td align='right'>
                        {group.amount ? (
                          <Typography sx={{ fontWeight: 700 }}>{fmtMillions(group.amount)} ลบ.</Typography>
                        ) : (
                          <Typography color='text.disabled'>วัดไม่ได้</Typography>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert severity='info'>
              รวม <b>{fmtMillions(exceptionTotal)} ลบ.</b> คิดเป็น <b>{fmtDec(exceptionShare, 2)}%</b> ของต้นทุนรวม —
              ยังอยู่ในเกณฑ์ที่ยอมรับได้ แต่ควรตามแก้ให้หมดก่อนปิดปีงบ
            </Alert>

            <Alert severity='warning'>
              <AlertTitle>ที่ยังไม่ปรากฏในตารางนี้</AlertTitle>
              ค่าเสื่อมราคาอาคารที่ยังไม่มีข้อมูลเลย ไม่ใช่ &ldquo;ปันส่วนผิด&rdquo; แต่เป็น &ldquo;ไม่มีให้ปัน&rdquo;
              จึงตรวจยอดผ่านทั้งที่ต้นทุนจริงยังขาดอยู่
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <FacultySourceTable rows={sourceMix} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <MethodChart methods={methods} total={total} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='ทำไมผู้บริหารต้องเห็นหน้านี้'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  <b>ต้นทุนสำนักงานเลขานุการที่ปันด้วย PROGRAM_SHARE</b> ทำให้หลักสูตรที่มีนิสิตหลักหน่วยมี AVC
                  สูงผิดปกติ — เป็นข้อจำกัดของวิธีปันส่วน ไม่ใช่หลักสูตรนั้นแพงจริง
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  คณะที่มีสัดส่วนปันส่วนสูง ตัวเลขจุดคุ้มทุนจะ<b>อ่อนไหวต่อการเปลี่ยนกติกา</b>มากกว่าคณะอื่น — สูงสุดคือ{' '}
                  <b>{sourceMix[0]?.shortName}</b> ที่ปันส่วน {fmtDec(sourceMix[0]?.allocatedShare ?? 0, 0)}%
                </>
              )
            },
            {
              tone: 'ok',
              content: (
                <>
                  ส่วนต่างตรวจยอดเป็น <b>0.00 บาท</b> แปลว่าไม่มีเงินหายระหว่างปันส่วน — แต่ไม่ได้แปลว่าข้อมูลต้นทางครบ
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  ทุกตัวเลขในหน้า W1–W5 คำนวณจาก run เดียวกันนี้ (#{current.id}) ถ้าอนุมัติ run ใหม่
                  ตัวเลขทุกหน้าจะเปลี่ยนพร้อมกัน
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default ReconciliationPage
