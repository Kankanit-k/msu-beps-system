'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import type { BreakEvenResult } from '@beps/calc-engine'

import InsightList from '@views/beps/shared/InsightList'
import type { Insight } from '@views/beps/shared/InsightList'

// Type Imports
import type { BreakEvenEntity } from '@/server/beps/entities'
import type { BreakEvenStatus } from '@/server/beps/status'
import type { UniversityTotals } from '@/server/beps/university'

// Util Imports
import { fmtDec, fmtInt, fmtMillions } from '@/utils/beps-format'

/**
 * ข้อเสนอแนะ 2 ชุดของ W3 — ย้ายจาก chRecommend() ของ mockup/assets/page-chart.js
 *
 * แยกตาม **ผู้อ่าน** ไม่ใช่ตามหัวข้อ: ผู้บริหารหลักสูตรได้ข้อเสนอเชิงปฏิบัติการที่ทำเองได้
 * ส่วนผู้บริหารคณะ/มหาวิทยาลัยได้ข้อเสนอเชิงพอร์ต ซึ่งเป็นการตัดสินใจคนละระดับกัน
 *
 * ตัวเลขอ้างอิงทุกตัวคำนวณจากชุดข้อมูลที่โหลดอยู่ — mockup ฝัง "~62%" ของสัดส่วน TFC
 * ไว้ตายตัวในข้อความ ซึ่งจะผิดทันทีที่ข้อมูลเปลี่ยน
 */

type Props = {
  entity: BreakEvenEntity
  /** ผลตามฐานรายได้ที่เลือกอยู่ */
  result: BreakEvenResult
  /** ผลฐานไม่รวมเงินแผ่นดินเสมอ — ใช้ตอบคำถามความยั่งยืนระยะยาว */
  withoutGovernment: BreakEvenResult
  status: BreakEvenStatus
  includesGovernment: boolean
  totals: UniversityTotals
}

const Recommendations = ({ entity, result, withoutGovernment, status, includesGovernment, totals }: Props) => {
  const r = result.r ?? 0
  const avc = result.avc ?? 0
  const atc = result.atc ?? 0
  const cm = result.cm ?? 0
  const universityAtc = totals.byMode.with_government.atc ?? 0

  /* สัดส่วนเงินแผ่นดินต่อรายได้ทั้งหมดของหน่วยนี้ — ไม่ขึ้นกับฐานที่เลือก */
  const totalBudget = entity.input.governmentBudget + entity.input.incomeBudget
  const governmentShare = totalBudget > 0 ? entity.input.governmentBudget / totalBudget : 0

  /* สูตร 7 — จำนวนนิสิตที่ทำให้รายได้คลุมต้นทุนทั้งหมด ใช้ตอบกรณีที่ไม่มีจุดคุ้มทุน */
  const fullCostRecoveryQ = r > 0 ? Math.ceil(result.tc / r) : 0
  const marginOfSafety = result.qStar !== null && result.q > result.qStar ? result.q - result.qStar : 0

  const programItems: Insight[] = []

  if (status === 'no_breakeven') {
    programItems.push(
      {
        tone: 'crit',
        content: (
          <>
            ราคาต่อหัว (R <b>{fmtInt(r)}</b>) ต่ำกว่าต้นทุนผันแปรต่อหัว (AVC <b>{fmtInt(avc)}</b>) —{' '}
            <b>รับนิสิตเพิ่มยิ่งขาดทุน</b> ควรชะลอการขยายจนกว่าจะปรับโครงสร้างราคา/ต้นทุน
          </>
        )
      },
      {
        tone: 'warn',
        content: (
          <>
            ตั้งเป้าให้ <b>R &gt; AVC</b>: ทบทวนอัตราค่าธรรมเนียม หรือลดต้นทุนผันแปรต่อหัว (ค่าตอบแทนผู้สอน · ค่าวัสดุ ·
            สาธารณูปโภค) ให้ต่ำกว่า {fmtInt(r)} บ./คน
          </>
        )
      },
      {
        tone: 'info',
        content: (
          <>
            แนวทาง Full-Cost Recovery: ต้องมีนิสิตราว <b>{fmtInt(fullCostRecoveryQ)} คน</b> ค่าเทอมรวมจึงครอบคลุมต้นทุน
            (ปัจจุบัน {fmtInt(result.q)} คน) — พิจารณา<b>ควบรวม/ร่วมสอน</b>กับหลักสูตรใกล้เคียงเพื่อเฉลี่ยต้นทุนคงที่
          </>
        )
      }
    )
  } else if (status === 'below') {
    programItems.push(
      {
        tone: 'warn',
        content: (
          <>
            เพิ่มการรับเข้าอีก <b>{fmtInt((result.qStar ?? 0) - result.q)} คน</b> (เป็น {fmtInt(result.qStar ?? 0)} คน)
            เพื่อถึงจุดคุ้มทุน — นิสิตแต่ละคนสมทบกำไรส่วนเกิน <b>{fmtInt(cm)}</b> บ. เข้าไปชดเชยต้นทุนคงที่
          </>
        )
      },
      {
        tone: 'info',
        content: (
          <>
            หรือเพิ่ม <b>CM ต่อหัว</b> ด้วยการขึ้นค่าธรรมเนียม/เพิ่มรายได้เสริม หรือลด AVC และ<b>ลดต้นทุนคงที่</b> (TFC{' '}
            {fmtMillions(result.tfc)} ลบ.) โดยใช้ห้องเรียน/อาจารย์/ครุภัณฑ์ร่วมกับหลักสูตรอื่น
          </>
        )
      },
      {
        tone: 'info',
        content: <>เร่งการตลาดเชิงรุกในกลุ่มเป้าหมาย และรักษาอัตราคงอยู่ (retention) ไม่ให้จำนวนนิสิตหลุดต่ำลงไปอีก</>
      }
    )
  } else {
    programItems.push(
      {
        tone: 'ok',
        content: (
          <>
            คุ้มทุนแล้ว มี <b>Margin of Safety {fmtInt(marginOfSafety)} คน</b> (
            {result.q > 0 ? fmtDec((marginOfSafety / result.q) * 100, 0) : 0}% ของนิสิตปัจจุบัน) —
            ยังรองรับความเสี่ยงจำนวนนิสิตลดได้ระดับหนึ่ง
          </>
        )
      },
      {
        tone: 'info',
        content: (
          <>
            นำส่วนเกิน <b>{fmtMillions(result.profit)} ลบ.</b> ไปพัฒนาคุณภาพหลักสูตร งานวิจัย หรือทุนนิสิต
            เพื่อรักษาความสามารถในการแข่งขันและดึงดูดผู้เรียน
          </>
        )
      },
      {
        tone: 'warn',
        content: (
          <>
            ระวังการเพิ่มต้นทุนคงที่ (อัตรากำลัง/ครุภัณฑ์) ที่จะดันจุดคุ้มทุนสูงขึ้น — ประเมินความคุ้มค่าก่อนลงทุนเพิ่ม
          </>
        )
      }
    )
  }

  /* เตือนเฉพาะตอนที่กำลังดูฐาน "รวมเงินแผ่นดิน" อยู่ — ตัวเลขที่เห็นจะดูดีกว่าความเป็นจริง
     ถ้าวันหนึ่งงบอุดหนุนถูกตัด (mockup เตือนตอน BM === 'in' เช่นกัน) */
  const exNoBreakEven = withoutGovernment.qStarStatus === 'full_cost_recovery'
  const exOk = withoutGovernment.qStar !== null && withoutGovernment.q >= withoutGovernment.qStar

  if (includesGovernment && (exNoBreakEven || !exOk)) {
    programItems.push({
      tone: 'crit',
      content: (
        <>
          ฐาน &ldquo;ไม่รวมเงินแผ่นดิน&rdquo;: หน่วยนี้
          {exNoBreakEven ? (
            <b> ยังไม่มีจุดคุ้มทุน</b>
          ) : (
            <>
              {' '}
              ต้องการ <b>{fmtInt(withoutGovernment.qStar ?? 0)} คน</b>
            </>
          )}{' '}
          — สะท้อนการ<b>พึ่งพางบแผ่นดินสูง</b> ควรวางแผนเพิ่มรายได้ค่าธรรมเนียม/แหล่งทุนภายนอก
        </>
      )
    })
  }

  const universityProfit = totals.byMode.with_government.profit
  const universityProfitExcl = totals.byMode.without_government.profit

  const executiveItems: Insight[] = [
    {
      tone: governmentShare >= 0.4 ? 'warn' : 'info',
      content: (
        <>
          พึ่งพางบประมาณเงินแผ่นดิน <b>{fmtDec(governmentShare * 100, 0)}%</b> ของรายได้ —{' '}
          {governmentShare >= 0.5
            ? 'สัดส่วนสูงมาก ควรเร่งกระจายความเสี่ยงด้านรายได้'
            : governmentShare >= 0.4
              ? 'สัดส่วนค่อนข้างสูง ควรติดตามใกล้ชิด'
              : 'อยู่ในระดับบริหารจัดการได้'}
        </>
      )
    },
    status === 'ok' && result.profit > 0
      ? {
          tone: 'ok',
          content: (
            <>
              เป็นหน่วยที่<b>สร้างส่วนเกิน (+{fmtMillions(result.profit)} ลบ.)</b> —
              พิจารณาให้ช่วยอุ้มหลักสูตรเชิงยุทธศาสตร์ที่จำเป็นแต่ยังไม่คุ้มทุน (<b>cross-subsidy</b>)
              โดยกำหนดเพดานและตัวชี้วัดชัดเจน
            </>
          )
        }
      : {
          tone: 'crit',
          content: (
            <>
              หน่วยนี้<b>ขาดทุน ({fmtMillions(result.profit)} ลบ.)</b> — ระดับคณะ/มหาวิทยาลัยควรตัดสินใจเชิงพอร์ต:
              สนับสนุนต่อ (หากเป็นพันธกิจ/ยุทธศาสตร์), ปรับโครงสร้าง หรือควบรวม โดยคำนึงต้นทุนคงที่ที่จมอยู่
            </>
          )
        },
    {
      tone: 'info',
      content: (
        <>
          ต้นทุนต่อหัว <b>{fmtInt(atc)}</b> บ. {atc > universityAtc ? <b>สูงกว่า</b> : 'ต่ำกว่า'}ค่าเฉลี่ยมหาวิทยาลัย (
          {fmtInt(universityAtc)}) —{' '}
          {result.q < 800
            ? 'หน่วยขนาดเล็กทำให้ต้นทุนคงที่เฉลี่ยต่อหัวสูง ควรใช้ทรัพยากร/รวมชั้นเรียนข้ามหลักสูตร'
            : 'ขนาดอยู่ในเกณฑ์ที่ได้ประโยชน์จากการประหยัดต่อขนาด'}
        </>
      )
    },
    {
      tone: 'info',
      content: (
        <>
          ภาพรวม มมส. มีต้นทุนคงที่ ~<b>{fmtDec(totals.fixedCostShare, 0)}%</b> ของต้นทุนรวม —
          การเติมนิสิตในหลักสูตรที่ยังมีที่ว่างช่วยลดต้นทุนต่อหัวทั้งระบบ (economies of scale)
          ควรจัดสรรโควตารับเข้าไปยังหลักสูตรที่มี CM เป็นบวกและยังไม่เต็ม
        </>
      )
    },
    {
      tone: 'warn',
      content: (
        <>
          ใช้ตัวเลข &ldquo;<b>ไม่รวมเงินแผ่นดิน</b>&rdquo; เป็นเกณฑ์ความยั่งยืนระยะยาว
          และเตรียมแผนรองรับกรณีถูกปรับลดงบอุดหนุน (ทั้งมหาวิทยาลัย
          {universityProfit >= 0 ? ' มีส่วนเกิน ' : ' ขาดทุน '}
          {fmtMillions(Math.abs(universityProfit))} ลบ. เมื่อรวมเงินแผ่นดิน แต่
          {universityProfitExcl >= 0 ? 'มีส่วนเกิน ' : 'ขาดทุน '}
          {fmtMillions(Math.abs(universityProfitExcl))} ลบ. หากตัดงบส่วนนี้)
        </>
      )
    }
  ]

  return (
    <>
      <Grid size={{ xs: 12, lg: 6 }}>
        <InsightList title='ข้อเสนอแนะ — ผู้บริหารหลักสูตร (เชิงปฏิบัติการ)' items={programItems} />
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <InsightList title='ข้อเสนอแนะ — ผู้บริหารคณะ / มหาวิทยาลัย (เชิงกลยุทธ์)' items={executiveItems} />
      </Grid>
    </>
  )
}

export default Recommendations
