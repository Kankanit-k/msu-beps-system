/**
 * นโยบายการคำนวณ (ค่าตั้งระบบ) — W15
 *
 * ค่าเหล่านี้เคย **ฝังอยู่ในโค้ด** ของ prototype ทำให้กองแผนงานเปลี่ยนเองไม่ได้ และหน้าจอ
 * คนละหน้าใช้กติกาต่างกันจนได้ตัวเลขไม่ตรงกัน (SA.md §11.1) — ตอนนี้เป็นค่าตั้งที่มี
 * เวอร์ชันรายปีและต้องอนุมัติ ทุกส่วนของระบบอ่านจากค่าเดียวกัน
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api (ตาราง
 * `system_setting_def` + `system_setting`) และค่าที่ใช้จริงต้องไหลเข้าไปเป็น
 * `CalcPolicy` ของ @beps/calc-engine แทน DEFAULT_POLICY
 */
import { aggregateBreakEven, calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenResult, QStarMethod } from '@beps/calc-engine'

import { GRP_LABEL, SETTING_LOG, SETTINGS } from '@/data/fixtures/master-data'
import { RAW } from '@/data/fixtures/raw'

export type SettingGroup = keyof typeof GRP_LABEL

export type SystemSetting = {
  key: string
  group: SettingGroup
  groupLabel: string
  name: string
  description: string
  type: string
  /** ตัวเลือกของค่าแบบ enum */
  options: string[]
  /** ค่าเริ่มต้นจากนิยามระบบ */
  defaultValue: string
  /** ค่าที่ตั้งทับไว้สำหรับปีนี้ — null = ยังไม่มีมติ ใช้ค่าเริ่มต้น */
  currentValue: string | null
  /** true = เปลี่ยนแล้วต้องสร้างรอบคำนวณใหม่ ตัวเลขเก่าจะไม่เปลี่ยนตามเอง */
  affectsNumbers: boolean
  /** คำอธิบายผลกระทบของแต่ละตัวเลือก */
  impact: Record<string, string>
}

/* fixture เก็บข้อความผลกระทบพร้อมแท็ก <b> — ถอดออกตั้งแต่ชั้นข้อมูล ไม่ส่ง HTML ดิบ
   เข้าไปให้หน้าจอ render */
const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '')

export const getSettings = (): SystemSetting[] =>
  SETTINGS.map(s => ({
    key: s.key,
    group: s.grp as SettingGroup,
    groupLabel: GRP_LABEL[s.grp as SettingGroup],
    name: s.name,
    description: s.desc,
    type: s.type,
    options: 'opts' in s ? ((s as { opts?: string[] }).opts ?? []) : [],
    defaultValue: String(s.def),
    currentValue: s.cur === null || s.cur === undefined ? null : String(s.cur),
    affectsNumbers: s.affects,
    /* fixture ประกาศ impact เป็น object literal ที่คีย์ต่างกันทุกค่าตั้ง TS จึงอนุมานเป็น
       union — แปลงผ่าน unknown เพราะรูปร่างจริงคือ map ของสตริงเสมอ */
    impact: Object.fromEntries(
      Object.entries(s.impact as unknown as Record<string, string>).map(([k, v]) => [k, stripTags(v)])
    )
  }))

export type SettingLogEntry = { at: string; icon: string; text: string }

export const getSettingLog = (): SettingLogEntry[] =>
  SETTING_LOG.map(entry => ({
    at: entry.t,
    icon: entry.ic === '🎛' ? 'ri-equalizer-line' : 'ri-pushpin-line',
    text: stripTags(entry.h)
  }))

/**
 * เปรียบเทียบ Q* ระดับมหาวิทยาลัยของทั้ง 2 วิธี — คำนวณสดจากชุดข้อมูลที่โหลดอยู่
 *
 * mockup พิมพ์ตัวเลขทั้งคู่ไว้ตายตัวในข้อความผลกระทบ (42,203 กับ 47,644) ซึ่งจะผิดทันที
 * ที่ข้อมูลเปลี่ยน — ส่วนต่างระหว่างสองวิธีคือประเด็นทั้งหมดของค่าตั้งนี้ จึงต้องเป็นตัวเลขจริง
 *
 * ระบบเก็บผลทั้งสองวิธีเสมอ (ดู aggregateBreakEven) ค่าตั้งนี้เลือกแค่ว่าตัวไหนเป็นตัวหลัก
 * ในรายงาน จึงสลับได้โดยไม่ต้องคำนวณใหม่
 */
export const getQStarMethodComparison = (): Record<QStarMethod, number | null> & { difference: number | null } => {
  const children: BreakEvenResult[] = RAW.PROGS.map(p =>
    calcBreakEven(
      {
        q: p.Q,
        governmentBudget: p.st,
        incomeBudget: p.own,
        tfc: p.TFC,
        tvc: p.TVC,
        revenueMode: 'with_government'
      },
      DEFAULT_POLICY
    )
  )

  const aggregate = aggregateBreakEven(children, 'university', DEFAULT_POLICY)
  const sum = aggregate.qStarByMethod.sum_of_programs.qStar
  const pooled = aggregate.qStarByMethod.pooled.qStar

  return {
    sum_of_programs: sum,
    pooled,
    difference: sum !== null && pooled !== null ? Math.abs(sum - pooled) : null
  }
}
