// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Link from '@components/Link'
import SampleDataAlert from '@components/beps/SampleDataAlert'
import ErpAccountExplorer from '@views/beps/erp-accounts/ErpAccountExplorer'
import InsightList from '@views/beps/shared/InsightList'
import PageHeader from '@views/beps/shared/PageHeader'

// Data Imports
import { getAccountRules } from '@/server/beps/account-rules'
import { getErpAccountYears, getErpAccounts } from '@/server/beps/erp-accounts'
import { getUniversityTotals } from '@/server/beps/university'

/**
 * W19 — ผังบัญชี 4 ระดับ · ต้นฉบับ: mockup/W19-erp-accounts.html
 *
 * เก็บ **ตัวบัญชี** ส่วนกติกา TFC/TVC อยู่ที่ W14 — แยกกันเพราะบัญชีหนึ่งใบมีกติกาได้
 * หลายช่วงปี และกติกาต้องผ่านการอนุมัติ ส่วนตัวบัญชีมาจาก ERP
 */
const ErpAccountsPage = () => {
  const accounts = getErpAccounts()
  const rules = getAccountRules()
  const years = getErpAccountYears()
  const totals = getUniversityTotals()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <PageHeader
          title='ผังบัญชี 4 ระดับ'
          screen='W19'
          subtitle='แผนงาน + หมวดงบประมาณ + หมวดรายจ่าย + หมวดย่อย = 1 บัญชี · รหัสหมวดเดียวกันเป็นคนละบัญชีได้เมื่ออยู่คนละแผนงาน'
        />
      </Grid>

      {totals.isSample && (
        <Grid size={{ xs: 12 }}>
          <SampleDataAlert />
        </Grid>
      )}

      <ErpAccountExplorer accounts={accounts} rules={rules} years={years} />

      <Grid size={{ xs: 12 }}>
        <InsightList
          title='เกิดอะไรขึ้นถ้าบัญชีไม่มีกติกา'
          items={[
            {
              tone: 'info',
              content: (
                <>
                  <b>ระบบไม่เดาแทน</b> — รายการถูกจัดเป็น <code>UNCLASSIFIED</code> ไม่ใช่เดาว่าเป็น FIXED
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>เงินถูกพักไว้ที่หน่วยงาน</b> — ไม่ปันลงหลักสูตร ยอดรวมไม่หาย แต่ไม่เข้าไปในต้นทุนรายหลักสูตร
                </>
              )
            },
            {
              tone: 'warn',
              content: (
                <>
                  <b>ติดธงไปที่รายการค้างตรวจ</b> — ปรากฏที่ <Link href='/admin/exceptions'>W13</Link>{' '}
                  พร้อมมูลค่าและผู้รับผิดชอบ
                </>
              )
            },
            {
              tone: 'crit',
              content: (
                <>
                  <b>ตรวจยอดยังผ่าน</b> เพราะเงินไม่หาย —{' '}
                  <b>
                    นี่คือเหตุผลที่ต้องดู <Link href='/admin/exceptions'>W13</Link> คู่กับ{' '}
                    <Link href='/admin/reconciliation'>W12</Link> เสมอ
                  </b>
                </>
              )
            }
          ]}
        />
      </Grid>
    </Grid>
  )
}

export default ErpAccountsPage
