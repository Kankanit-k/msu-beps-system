// MUI Imports
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import MasterDataTabs from '@views/beps/master-data/MasterDataTabs'
import OrgUnitTable from '@views/beps/master-data/OrgUnitTable'
import PeriodTable from '@views/beps/master-data/PeriodTable'
import RuleList from '@views/beps/master-data/RuleList'
import StudentTypeTable from '@views/beps/master-data/StudentTypeTable'
import InsightList from '@views/beps/shared/InsightList'
import KpiCard from '@views/beps/shared/KpiCard'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getOrgUnits, getPeriods, getStudentTypeTotals, getStudentTypes } from '@/server/beps/org'
import { getUniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtInt } from '@/utils/beps-format'

/**
 * W17 — ทะเบียนหน่วยงาน · งวด · ประเภทนิสิต · ต้นฉบับ: mockup/W17-master-data.html
 *
 * ข้อมูลหลักทุกชุดต้องมี **ช่วงเวลามีผล** ไม่ใช่แก้ทับ — คณะเปลี่ยนชื่อ ควบรวม หรือแยกออก
 * เกิดขึ้นจริงทุกไม่กี่ปี ถ้าแก้ทับ รายงานปีเก่าจะแสดงชื่อใหม่ทั้งที่ตอนนั้นยังไม่มีหน่วยงานนี้
 */
const MasterDataPage = () => {
  const units = getOrgUnits()
  const periods = getPeriods()
  const studentTypes = getStudentTypes()
  const studentTotals = getStudentTypeTotals()
  const totals = getUniversityTotals()

  const academic = units.filter(unit => unit.isAcademic).length
  const support = units.length - academic
  const missingErp = units.filter(unit => !unit.erpCode)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ทะเบียนหน่วยงาน · งวด · ประเภทนิสิต'
          screen='W17'
          subtitle='สามชุดนี้ถูกอ้างโดยทุกตารางที่เก็บตัวเลข ถ้าตั้งผิดหรือเปลี่ยนย้อนหลัง ตัวเลขทั้งระบบจะเปลี่ยนตาม'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='หน่วยงานทั้งหมด' value={fmtInt(units.length)} unit='รายการในทะเบียน' color='primary.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label='หน่วยที่ผลิตบัณฑิต' value={fmtInt(academic)} unit='is_academic = true' color='success.main' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='หน่วยสนับสนุน'
          value={fmtInt(support)}
          unit='ต้องปันส่วนต้นทุนออกทั้งหมด'
          color='warning.main'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label='ยังไม่ผูกรหัส ERP'
          value={fmtInt(missingErp.length)}
          unit='รับต้นทุนจากระบบต้นทางไม่ได้'
          color='error.main'
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <MasterDataTabs
          org={
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <OrgUnitTable units={units} />
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <RuleList
                  title='ทำไมโครงสร้างต้องมี 3 ระดับ'
                  subheader='มหาวิทยาลัย → คณะ → ระดับการศึกษา'
                  rules={[
                    {
                      name: 'หลักสูตรผูกที่ระดับการศึกษา',
                      description: (
                        <>
                          <code>program.org_unit_id</code> ชี้ที่ <code>EDUCATION_LEVEL</code> ไม่ใช่ระดับคณะ
                        </>
                      ),
                      chip: 'บังคับ',
                      color: 'error'
                    },
                    {
                      name: 'หน่วยสนับสนุนต้องปันออกให้หมด',
                      description:
                        'สำนักงานเลขานุการและสถาบันวิจัยไม่มีนิสิต เป็น cost pool ที่ต้องกระจายลงหลักสูตร ไม่งั้นต้นทุนจะค้าง',
                      chip: 'is_academic = false',
                      color: 'warning'
                    },
                    {
                      name: 'การจับคู่รหัส ERP มีช่วงเวลา',
                      description: 'รหัส ERP เดียวกันเปลี่ยนหน่วยงานปลายทางตามปีได้ ระบบกันช่วงเวลาคาบเกี่ยวไว้แล้ว',
                      chip: 'ตรวจอัตโนมัติ',
                      color: 'success'
                    }
                  ]}
                  footer={
                    missingErp.length > 0 && (
                      <Alert severity='warning'>
                        <b>{missingErp.map(unit => unit.name).join(' · ')}</b> ยังไม่ผูกรหัส ERP —
                        ต้นทุนที่ส่งมาจากระบบต้นทางจะจับคู่ไม่ได้ และไปโผล่เป็นธง <code>MISSING_DRIVER</code> ที่{' '}
                        <Link href='/admin/exceptions'>รายการค้างตรวจ</Link>
                      </Alert>
                    )
                  }
                />
              </Grid>
            </Grid>
          }
          period={
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <PeriodTable periods={periods} />
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <RuleList
                  title='สองอย่างที่ต้องกำหนดให้ชัด'
                  subheader='ถ้าไม่ตั้ง จะได้ตัวเลขที่เทียบข้ามปีไม่ได้'
                  rules={[
                    {
                      name: '1. ปีงบประมาณ ไม่เท่ากับ ปีการศึกษา',
                      description: (
                        <>
                          ต้นทุนมาเป็น<b>ปีงบประมาณ</b> (ต.ค.–ก.ย.) แต่จำนวนนิสิตและค่าธรรมเนียมเป็น<b>ปีการศึกษา</b>{' '}
                          ระบบจึงบังคับให้ทุกงวดระบุทั้งสองค่า — ถ้าปล่อยว่าง กติกาที่ผูกกับปีการศึกษา (W14, W15)
                          จะหาปีไม่เจอแบบเงียบๆ
                        </>
                      )
                    },
                    {
                      name: '2. วันตัดยอดนิสิต และสถานะที่นับเป็น Q',
                      description: (
                        <>
                          Q เป็นตัวหารของทั้ง R และ AVC — ตัดยอดคนละวันหรือนับนิสิตลาพักต่างกัน ทำให้ Q* เปลี่ยนทั้งระบบ
                          · ค่าที่ตั้งไว้จะถูกล็อกติดไปกับรอบคำนวณ (<Link href='/admin/runs'>W11</Link>)
                          เพื่อให้คำนวณซ้ำได้ผลเดิม
                        </>
                      )
                    }
                  ]}
                  footer={
                    <Alert severity='warning'>
                      ยังค้างอยู่ใน <code>MAPPING.md</code> — ไฟล์ต้นฉบับใช้ <b>งบประมาณ 2568</b> คู่กับ{' '}
                      <b>ค่าเสื่อมราคารวม 2567</b> ซึ่งเป็นคนละปี ต้องยืนยันว่างวด 2568 ใช้ค่าเสื่อมของปีไหน ก่อนปิดงวด
                    </Alert>
                  }
                />
              </Grid>
            </Grid>
          }
          studentType={
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <StudentTypeTable rows={studentTypes} totals={studentTotals} />
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <RuleList
                  title='ประเภทนิสิตกระทบอะไรบ้าง'
                  rules={[
                    {
                      name: 'อัตราค่าธรรมเนียม (W8)',
                      description:
                        'หลักสูตรเดียวกันมีได้หลายอัตรา — ธุรกิจระหว่างประเทศ (นานาชาติ) คิดนิสิตไทยและต่างชาติคนละอัตรา',
                      chip: 'TR',
                      color: 'primary'
                    },
                    {
                      name: 'เงินสมทบรายการหลัก (FR-11)',
                      description: 'หักตาม master ค่าธรรมเนียม × จำนวนนิสิตแยกตามประเภท ไม่ใช่ยอดรวม',
                      chip: 'TVC',
                      color: 'warning'
                    },
                    {
                      name: 'เงินสมทบมหาวิทยาลัย (FR-12)',
                      description: 'อัตราเปลี่ยนได้ทุกปี จึงเก็บเป็นค่าตั้งรายปี ไม่ใช่ค่าคงที่ในโค้ด',
                      chip: 'TVC',
                      color: 'warning'
                    }
                  ]}
                  footer={
                    <Alert severity='error'>
                      <b>ห้ามเพิ่มประเภทนิสิตย้อนหลังในงวดที่ปิดแล้ว</b> — ยอดรวมนิสิตของงวดจะไม่ตรงกับที่เคยคำนวณ
                      และตรวจยอดกลับต้นทางที่ <Link href='/admin/reconciliation'>W12</Link> จะไม่ผ่าน
                    </Alert>
                  }
                />
              </Grid>
            </Grid>
          }
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='ทำไมข้อมูลหลักต้องมีช่วงเวลามีผล ไม่ใช่แก้ทับ'
          items={[
            {
              tone: 'crit',
              content:
                'คณะเปลี่ยนชื่อ ควบรวม หรือแยกออก เกิดขึ้นจริงทุกไม่กี่ปี — ถ้าแก้ทับ รายงานปีเก่าจะแสดงชื่อใหม่ทั้งที่ตอนนั้นยังไม่มีหน่วยงานนี้'
            },
            {
              tone: 'warn',
              content:
                'รหัส ERP เดียวกันถูกย้ายไปหน่วยงานอื่นได้ ระบบจึงกันช่วงเวลาคาบเกี่ยวไว้ที่ระดับฐานข้อมูล ไม่ใช่แค่เตือนบนหน้าจอ'
            },
            {
              tone: 'info',
              content: (
                <>
                  ทุกตารางที่เก็บตัวเลขอ้าง <code>period_id</code> · <code>org_unit_id</code> ·{' '}
                  <code>program_version_id</code> ครบทั้งสามเสมอ
                </>
              )
            },
            {
              tone: 'ok',
              content:
                'ผลที่ได้คือตอบได้ว่า "ตัวเลขปี 2567 คำนวณด้วยโครงสร้างหน่วยงานแบบไหน กติกาเวอร์ชันใด และนับนิสิต ณ วันไหน"'
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default MasterDataPage
