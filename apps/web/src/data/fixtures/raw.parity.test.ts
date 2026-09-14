/**
 * พิสูจน์ว่า packages/calc-engine ให้ตัวเลขตรงกับชุดข้อมูลของ mockup
 *
 * ทำไมต้องมี — mockup มีสูตรของตัวเองอยู่ที่ mockup/assets/core.js:27-36
 * (R · Qs · TRc · AVC · ATC · profit · status) ซ้อนกับสูตรใน calc-engine
 * ถ้าปล่อยให้หน้าจอที่ย้ายมาใช้สูตรของ mockup ต่อ ระบบจะมีสูตรสองชุดที่ค่อยๆ
 * แยกจากกัน ซึ่งเป็นบั๊กแบบเดียวกับที่ SA.md §11.1 เตือนไว้ว่าเคยเกิดใน v8
 * (หลักสูตรเคมี ป.โท ได้ Q* สามค่าในระบบเดียว)
 *
 * เทสต์นี้จึงเป็นเงื่อนไขก่อนเริ่ม Phase 3: ถ้าผ่าน แปลว่าทิ้งสูตรใน core.js
 * ได้อย่างปลอดภัย และหน้าจอที่ย้ายมาต้องเรียก calc-engine เท่านั้น
 *
 * ค่าอ้างอิงใน RAW (Rin/Rex/AVC/Qin/Qex) มาจาก prototype v8-1 ซึ่งคำนวณไว้ล่วงหน้า
 * เทสต์จึงคำนวณใหม่จาก Q · st · own · TFC · TVC แล้วเทียบกับค่าที่ฝังมา
 */
import { describe, expect, it } from 'vitest'

import { calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenInput, RevenueMode } from '@beps/calc-engine'

import { RAW } from './raw'
import type { BepsAggregate } from './raw'

/**
 * ค่าที่ฝังใน RAW ถูกปัดไว้ 2 ตำแหน่งแล้ว จึงเทียบได้แค่ "ตรงกันในระดับสตางค์"
 *
 * ใช้ toBeCloseTo(_, 2) ตรงๆ ไม่ได้ เพราะกรณีที่ห่างกันพอดี 0.005 (ครึ่งสตางค์สุดท้าย)
 * จะถูกนับว่าไม่ผ่านทั้งที่ค่าเต็มความละเอียดตรงกัน และจะปัดฝั่ง calc-engine ให้เท่ากัน
 * ก่อนก็ไม่ได้ เพราะ Math.round(62669.955 * 100) ได้ 6266995 ไม่ใช่ 6266996 —
 * 62669.955 * 100 เก็บเป็น float ได้ 6266995.499999... ตามข้อจำกัดของ IEEE-754
 */
const AGREES_TO_SATANG = 0.005 + 1e-9

const expectSameMoney = (got: number | null, stored: number) => {
  expect(Math.abs((got as number) - stored)).toBeLessThanOrEqual(AGREES_TO_SATANG)
}

/**
 * 2 แถวที่ Q* ต่างจากค่าที่ฝังไว้ 1 คน — **calc-engine ถูก ค่าใน mockup ผิด**
 *
 * prototype v8-1 คำนวณ Q* จาก R และ AVC ที่ปัด 2 ตำแหน่งไปแล้ว ไม่ใช่ค่าเต็มความละเอียด
 * ทั้งสองแถวนี้ค่าจริงอยู่ต่ำกว่าจำนวนเต็มอยู่นิดเดียว พอปัดตัวตั้งก่อนหาร ผลลัพธ์เลย
 * ดันข้ามจำนวนเต็มไป แล้ว ceil ก็กระโดดไปทั้งคน:
 *
 *   ปริญญาตรี (DEPTS)          ค่าเต็ม 8143.994509 → 8144 · ปัดก่อนหาร 8144.002562 → 8145
 *   สังคมศึกษาฯ (PROGS)        ค่าเต็ม  145.999801 →  146 · ปัดก่อนหาร  146.000440 →  147
 *
 * ไม่ใช่เรื่องนโยบายการปัดเศษ (ทั้งคู่ใช้ ceil เหมือนกัน) แต่เป็นลำดับการปัด — ปัดตัวตั้ง
 * ก่อนหารทำให้ผลเพี้ยนได้เสมอ เมื่อค่าจริงเฉียดจำนวนเต็ม calc-engine จึงเป็นค่าที่ถูก
 * และเป็นเหตุผลว่าทำไมหน้าจอที่ย้ายมาต้องเรียก calc-engine ไม่ใช่คัดลอกสูตรจาก core.js
 */
const KNOWN_QSTAR_DRIFT = new Set(['DEPTS/ปริญญาตรี/ex/8145', 'PROGS/สังคมศึกษา ศาสนาและวัฒนธรรม/ex/147'])

const inputFor = (o: BepsAggregate, revenueMode: RevenueMode): BreakEvenInput => ({
  q: o.Q,
  governmentBudget: o.st,
  incomeBudget: o.own,
  tfc: o.TFC,
  tvc: o.TVC,
  revenueMode
})

/** ชื่อที่ใช้ระบุแถวเวลาเทียบ Q* — DEPTS ใช้ grp, PROGS ใช้ prog */
const labelOf = (o: BepsAggregate): string =>
  (o as BepsAggregate & { prog?: string; grp?: string; name?: string }).prog ??
  (o as BepsAggregate & { grp?: string }).grp ??
  (o as BepsAggregate & { name?: string }).name ??
  'UNI'

/** ชุดตัวอย่างที่เอามาตรวจ — ครบทุกระดับตามที่แผน Phase 2 กำหนด */
const levels = [
  { key: 'UNI', name: 'มหาวิทยาลัย', rows: [RAW.UNI] as BepsAggregate[] },
  { key: 'FACS', name: 'คณะ', rows: RAW.FACS as BepsAggregate[] },
  { key: 'DEPTS', name: 'คณะ × ระดับ', rows: RAW.DEPTS as BepsAggregate[] },
  { key: 'PROGS', name: 'หลักสูตร', rows: RAW.PROGS as unknown as BepsAggregate[] }
]

describe('calc-engine ให้ตัวเลขตรงกับชุดข้อมูลของ mockup', () => {
  it('ชุดข้อมูลมีขนาดตามที่คาด', () => {
    expect(RAW.FACS).toHaveLength(20)
    expect(RAW.DEPTS).toHaveLength(38)
    expect(RAW.PROGS).toHaveLength(230)
  })

  describe.each(levels)('ระดับ$name', ({ key, rows }) => {
    it('รายได้ต่อหัว (R) ตรงกับ Rin / Rex ที่ฝังไว้', () => {
      for (const o of rows) {
        if (o.Q <= 0) continue

        const withGov = calcBreakEven(inputFor(o, 'with_government'), DEFAULT_POLICY)
        const withoutGov = calcBreakEven(inputFor(o, 'without_government'), DEFAULT_POLICY)

        expectSameMoney(withGov.r, o.Rin)
        expectSameMoney(withoutGov.r, o.Rex)
      }
    })

    it('ต้นทุนผันแปรต่อหัว (AVC) ตรงกับที่ฝังไว้', () => {
      for (const o of rows) {
        if (o.Q <= 0) continue

        const res = calcBreakEven(inputFor(o, 'with_government'), DEFAULT_POLICY)

        expectSameMoney(res.avc, o.AVC)
      }
    })

    it('ต้นทุนรวม (TC) = TFC + TVC ตรงกับที่ฝังไว้', () => {
      for (const o of rows) {
        const res = calcBreakEven(inputFor(o, 'with_government'), DEFAULT_POLICY)

        expectSameMoney(res.tc, o.TC)
      }
    })

    it('จุดคุ้มทุน (Q*) ตรงกับ Qin / Qex ที่ฝังไว้ (ยกเว้น 2 แถวที่ mockup ปัดเศษผิดลำดับ)', () => {
      for (const o of rows) {
        if (o.Q <= 0) continue

        const withGov = calcBreakEven(inputFor(o, 'with_government'), DEFAULT_POLICY)
        const withoutGov = calcBreakEven(inputFor(o, 'without_government'), DEFAULT_POLICY)

        for (const [res, expected, mode] of [
          [withGov, o.Qin, 'in'],
          [withoutGov, o.Qex, 'ex']
        ] as const) {
          if (KNOWN_QSTAR_DRIFT.has(`${key}/${labelOf(o)}/${mode}/${expected}`)) {
            // calc-engine ต้องต่ำกว่าค่าที่ฝังไว้พอดี 1 คน ตามที่อธิบายไว้ข้างบน
            expect(res.qStar).toBe(expected - 1)
            continue
          }

          expect(res.qStar).toBe(expected)
        }
      }
    })
  })
})
