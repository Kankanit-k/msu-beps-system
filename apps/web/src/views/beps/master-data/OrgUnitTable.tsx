// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Type Imports
import type { OrgUnit } from '@/server/beps/org'

/**
 * ทะเบียนหน่วยงาน 3 ระดับ — ย้ายจาก `org-tb` ของ mockup/W17-master-data.html
 *
 * ชุดข้อมูลต้นฉบับ **ไม่มีคอลัมน์ภาควิชา** ระบบจึงใช้ *ระดับการศึกษา* (ปริญญาตรี /
 * บัณฑิตศึกษา) เป็นชั้นกลางแทน ซึ่งตรงกับวิธีที่ Excel ปันส่วนต้นทุนสำนักงานเลขานุการอยู่แล้ว
 * — ถ้าภายหลังมีตารางจับคู่หลักสูตร → ภาควิชาจริง สลับชั้นกลางได้โดยไม่ต้องแก้สูตร
 */

type Props = {
  units: OrgUnit[]
}

const OrgUnitTable = ({ units }: Props) => (
  <Card>
    <CardHeader
      title='ทะเบียนหน่วยงาน 3 ระดับ'
      subheader={
        <>
          ตาราง <code>org_unit</code> + <code>org_unit_map</code> · มหาวิทยาลัย → คณะ → ระดับการศึกษา
        </>
      }
    />
    <CardContent>
      <div className='overflow-auto' style={{ maxBlockSize: 620 }}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อหน่วยงาน</th>
              <th>ระดับ</th>
              <th>รหัส ERP</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {units.map(unit => (
              <tr key={unit.code}>
                <td>
                  <Typography component='code' color='primary.main' variant='body2'>
                    {unit.code}
                  </Typography>
                </td>
                <td style={{ paddingInlineStart: `calc(1.25rem + ${unit.depth * 16}px)` }}>
                  <Typography sx={{ fontWeight: 600 }}>{unit.name}</Typography>
                </td>
                <td>
                  <Typography variant='body2' color='text.secondary'>
                    {unit.levelLabel}
                  </Typography>
                </td>
                <td>
                  {unit.erpCode ? (
                    <Typography component='code' variant='body2'>
                      {unit.erpCode}
                    </Typography>
                  ) : (
                    <Chip size='small' variant='tonal' color='error' label='ยังไม่ผูก' />
                  )}
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={unit.isAcademic ? 'success' : 'warning'}
                    label={unit.isAcademic ? 'ผลิตบัณฑิต' : 'หน่วยสนับสนุน'}
                  />
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={unit.status === 'APPROVED' ? 'success' : 'default'}
                    label={unit.status === 'APPROVED' ? 'อนุมัติ' : 'ร่าง'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default OrgUnitTable
