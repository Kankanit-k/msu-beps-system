// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import AccountRuleExplorer from '@views/beps/account-rules/AccountRuleExplorer'
import InsightList from '@views/beps/shared/InsightList'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getAccountRules, getRuleYears } from '@/server/beps/account-rules'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W14 — กติกาจำแนกต้นทุนคงที่ / ผันแปร · ต้นฉบับ: mockup/W14-account-rules.html
 *
 * เป็นหน้าที่ถ้าตั้งผิดแล้วตัวเลข **ทั้งระบบ** ผิด — การจำแนก TFC/TVC คือจุดตั้งต้นของ
 * ทั้งสูตร 1 และสูตร 2 จึงอยู่ใต้ /admin/university/** ที่ต้องเป็นผู้ดูแลมหาวิทยาลัย
 */
const AccountRulesPage = () => {
  const accounts = getAccountRules()
  const years = getRuleYears()
  const totals = getUniversityTotals()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='กติกาจำแนกต้นทุนคงที่ / ผันแปร'
          screen='W14'
          subtitle='กติกาผูกกับคีย์ผสม 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) และมีช่วงปีที่มีผลเสมอ'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <AccountRuleExplorer accounts={accounts} years={years} totals={totals} />

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='จุดที่ถ้าตั้งผิดจะทำให้ตัวเลขทั้งระบบผิด'
          items={[
            {
              tone: 'crit',
              content: (
                <>
                  <b>คีย์ผสม 4 ระดับ ไม่ใช่รหัสหมวดเดียว</b> — <code>80001 เงินอุดหนุน</code>{' '}
                  ในแผนงานจัดการศึกษาเป็นคนละประเภทกับในแผนงานวิจัย ถ้าตั้งด้วยรหัสหมวดอย่างเดียวจะจำแนกผิดทั้งก้อน
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>กติกาเจาะจงหน่วยงานมาก่อนกติกากลางเสมอ</b> —
                  ค่าวัสดุการศึกษาของคณะแพทยศาสตร์ตั้งสัดส่วนของตัวเองทับกติกากลาง
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>UNCLASSIFIED ไม่ใช่ค่าว่าง</b> — เป็นสถานะที่ตั้งใจ ระบบจะพักเงินไว้ที่หน่วยงานและติดธงไปที่{' '}
                  <Link href='/admin/exceptions'>รายการค้างตรวจ</Link> ไม่เดาแทน
                </>
              )
            },
            {
              tone: 'info',
              content: (
                <>
                  <b>ค่าเสื่อมราคาไม่มีรหัสผังบัญชี</b> จึงหากติกาปกติไม่เจอ — กำหนดผ่านค่าตั้ง{' '}
                  <code>depreciation_behavior</code> ที่ <Link href='/admin/university/settings'>นโยบายการคำนวณ</Link>{' '}
                  แทน
                </>
              )
            },
            {
              tone: 'ok',
              content: (
                <>
                  การแก้กติกาต้องผ่านการอนุมัติ และ run ที่คำนวณไปแล้วจะ<b>ล็อกเวอร์ชันกติกาไว้</b>{' '}
                  คำนวณซ้ำได้ตัวเลขเดิมเป๊ะ
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default AccountRulesPage
