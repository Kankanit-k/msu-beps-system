/**
 * รายการค้างตรวจ (W13) — ธงที่ engine ตั้งไว้ระหว่างปันส่วน
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 *
 * รายการเหล่านี้ **ไม่ปิดกั้นการคำนวณ** (ต่างจากบล็อกตรวจความพร้อมใน W9) แต่ต้องตามเก็บ
 * เพราะทุกบาทที่ค้างอยู่คือส่วนที่ไม่ได้ถูกปันลงหลักสูตร — ตัวเลข Q* จึงต่ำกว่าความจริง
 */
import { EXC_STATE, EXCEPTIONS } from '@/data/fixtures/master-data'

export type ExceptionState = keyof typeof EXC_STATE

export type ExceptionFlag = {
  /** รหัสธง เช่น UNCLASSIFIED · MISSING_DRIVER · NO_FEE · Q_ZERO */
  flag: string
  flagLabel: string
  /** รายการที่ติดธง — คีย์บัญชี หรือชื่อหลักสูตร */
  item: string
  /** หน่วยงานที่เกี่ยวข้อง */
  org: string
  /** มูลค่าที่กระทบ (บาท) — null = ประเมินเป็นตัวเงินไม่ได้ */
  amount: number | null
  owner: string
  since: string
  state: ExceptionState
  stateLabel: string
  note: string
}

export const getExceptions = (): ExceptionFlag[] =>
  EXCEPTIONS.map(e => ({
    flag: e.flag,
    flagLabel: e.label,
    item: e.item,
    org: e.org,
    amount: e.amount,
    owner: e.owner,
    since: e.since,
    state: e.state as ExceptionState,
    stateLabel: EXC_STATE[e.state as ExceptionState].l,
    note: e.note
  }))

/** ยอดรวมของรายการที่ประเมินเป็นตัวเงินได้ — ใช้บอกขนาดของช่องว่าง */
export const getExceptionTotal = (): number => EXCEPTIONS.reduce((sum, e) => sum + (e.amount ?? 0), 0)

export type ExceptionGroup = {
  flag: string
  label: string
  count: number
  /** ยอดรวมของรายการที่ประเมินเป็นตัวเงินได้ — 0 = ทั้งกลุ่มวัดเป็นตัวเงินไม่ได้ */
  amount: number
}

/** สรุปรายการค้างตรวจแยกตามธง — W12 กับ W13 ต้องได้ตัวเลขชุดเดียวกัน */
export const getExceptionGroups = (): ExceptionGroup[] => {
  const groups = new Map<string, ExceptionGroup>()

  for (const e of EXCEPTIONS) {
    const group = groups.get(e.flag) ?? { flag: e.flag, label: e.label, count: 0, amount: 0 }

    group.count += 1
    group.amount += e.amount ?? 0
    groups.set(e.flag, group)
  }

  return [...groups.values()]
}
