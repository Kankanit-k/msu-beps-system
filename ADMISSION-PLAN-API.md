# สัญญา API — แผนการรับนิสิต (Admission Plan)

เอกสารนี้เขียนไว้ให้ผู้พัฒนา backend ที่จะทำ `apps/api` ใน Sprint 2 ใช้เป็นสเปกตรง ๆ
ตอนนี้หน้าจอ `/scenario/admission-plan` ทำงานได้ครบแล้วโดยเก็บข้อมูลไว้ใน `localStorage`
ทุกฟังก์ชันใน [`admissionPlanStore.ts`](apps/web/src/views/scenario-program/admissionPlanStore.ts)
ประกาศเป็น `async` ไว้แล้ว **การย้ายขึ้นเซิร์ฟเวอร์จึงเปลี่ยนแค่ข้างในไฟล์นั้นไฟล์เดียว**
ไม่ต้องแตะคอมโพเนนต์ใด ๆ

---

## 1. ฟังก์ชันที่ต้องแทนที่

| ฟังก์ชันปัจจุบัน                                          | ที่เก็บตอนนี้                               | endpoint ที่ควรไปเรียกแทน                                            |
| --------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `loadPlans(): Promise<AdmissionPlan[]>`                   | `localStorage["beps.admission-plan.plans"]` | `GET /admission-plans`                                               |
| `savePlans(plans): Promise<void>`                         | เขียนทับทั้งอาร์เรย์                        | `POST /admission-plans` (สร้าง) + `DELETE /admission-plans/:id` (ลบ) |
| `loadDraft(programName): Promise<AdmissionDraft \| null>` | `localStorage["beps.admission-plan.draft"]` | `GET /admission-plans/draft?program=<name>`                          |
| `saveDraft(programName, draft): Promise<void>`            | ทับรายการของหลักสูตรนั้น                    | `PUT /admission-plans/draft`                                         |
| `clearDraft(programName): Promise<void>`                  | ลบคีย์ของหลักสูตรนั้น                       | `DELETE /admission-plans/draft?program=<name>`                       |

> `savePlans` รับทั้งอาร์เรย์เพราะ localStorage เขียนทีเดียวทั้งก้อน — ตอนต่อ API
> ให้เปลี่ยนภายในเป็น POST/DELETE รายรายการ โดยคงลายเซ็นเดิมไว้ หรือแก้ hook
> [`useAdmissionPlan.ts`](apps/web/src/views/scenario-program/useAdmissionPlan.ts)
> ให้เรียก `createPlan` / `deletePlan` แยกกัน (สะอาดกว่า แนะนำแบบหลัง)

---

## 2. โครงสร้างข้อมูล

ชนิดข้อมูลจริงอยู่ใน `admissionPlanStore.ts` — สรุปเป็น JSON ที่ API ต้องรับ/คืน:

```jsonc
// AdmissionPlan
{
  "id": 1737450000000, // ฝั่ง API ให้ใช้ bigint identity แทน Date.now()
  "name": "แผน A — เน้นต่างชาติ",
  "programName": "วิทยาการปัญญาประดิษฐ์",
  "qStar": 120, // Q* รวม จากหน้าจุดคุ้มทุนรายหลักสูตร
  "savedAt": "21/9/2569 15:30:27", // แสดงผลอย่างเดียว — API ควรคืน ISO 8601 แล้วให้ web จัดรูปแบบ
  "enabled": {
    "thaiSpecial": true,
    "foreignRegular": false,
    "foreignSpecial": true,
    "continuing": false,
  },
  "pct": { "thaiSpecial": 30, "foreignRegular": 0, "foreignSpecial": 40, "continuing": 0 },
  "segmented": {
    "tfc": 2000000,
    "rates": {
      "thaiRegular": { "fee": 20000, "gov": 8000, "avc": 10000 },
      "thaiSpecial": { "fee": 50000, "gov": 0, "avc": 12000 },
      "foreignRegular": { "fee": 0, "gov": 0, "avc": 0 },
      "foreignSpecial": { "fee": 90000, "gov": 0, "avc": 12000 },
      "continuing": { "fee": 0, "gov": 0, "avc": 0 },
    },
  },
  "segmentedQStar": 42, // ผลลัพธ์จาก calcSegmentedBreakEven() — null เมื่อคำนวณไม่ได้
}
```

กติกาที่หน้าจอบังคับไว้แล้ว และ API ควรบังคับซ้ำฝั่งเซิร์ฟเวอร์:

- `pct` ของกลุ่มที่ `enabled` รวมกันต้อง **ไม่เกิน 100** — ส่วนที่เหลือคือนิสิตไทยภาคปกติเสมอ
  (กลุ่ม `thaiRegular` จึงไม่มีใน `enabled`/`pct` แต่มีใน `segmented.rates`)
- ทุกอัตราเป็นจำนวนไม่ติดลบ หน่วยบาทต่อหัวต่อปี
- `name` ห้ามว่าง

---

## 3. การ map ลงตารางใน `db/01_schema.sql`

ตาราง `scenario_plan` ที่มีอยู่เป็นของ **สถานการณ์จำลองต้นทุน** (W7) คนละเรื่องกับแผนการรับนิสิต
จึงควรเพิ่มสองตารางใหม่ ไม่ควรยัดลงของเดิม:

```sql
CREATE TABLE admission_plan (
  admission_plan_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_by         bigint NOT NULL REFERENCES app_user(app_user_id),
  program_version_id bigint REFERENCES program_version(program_version_id), -- NULL = หลักสูตรใหม่/กรอกชื่อเอง
  program_name       text NOT NULL,          -- ชื่อที่ผู้ใช้เห็น ใช้ตอน program_version_id เป็น NULL
  plan_name          text NOT NULL,
  revenue_mode       revenue_mode NOT NULL,
  q_star             integer NOT NULL CHECK (q_star >= 0),
  segmented_tfc      numeric(20,2) NOT NULL DEFAULT 0,
  segmented_q_star   integer,                -- ผลจากการคำนวณแยกรายกลุ่ม NULL = คำนวณไม่ได้
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admission_plan_segment (
  admission_plan_segment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admission_plan_id bigint NOT NULL REFERENCES admission_plan(admission_plan_id) ON DELETE CASCADE,
  segment_code      varchar(30) NOT NULL,    -- thaiRegular | thaiSpecial | foreignRegular | foreignSpecial | continuing
  student_type_id   bigint REFERENCES student_type(student_type_id), -- NULL สำหรับ continuing (ดูข้อ 5)
  share_pct         numeric(6,2) NOT NULL CHECK (share_pct BETWEEN 0 AND 100),
  fee_rate          numeric(20,2) NOT NULL DEFAULT 0,
  gov_rate          numeric(20,2) NOT NULL DEFAULT 0,
  avc               numeric(20,2) NOT NULL DEFAULT 0,
  UNIQUE (admission_plan_id, segment_code)
);
```

**draft** ไม่ควรลงตารางเดียวกัน เพราะเป็นของชั่วคราวรายผู้ใช้ — ใช้ตารางเดี่ยว
`admission_plan_draft (app_user_id, program_name, payload jsonb, updated_at)`
คีย์ผสม `(app_user_id, program_name)` แล้ว upsert ทับได้เลย

---

## 4. สิทธิ์และขอบเขต

- แผนเป็นของผู้ใช้ที่สร้าง — `GET` คืนเฉพาะของตัวเอง เว้นแต่เป็นผู้ดูแลมหาวิทยาลัย
- เจ้าหน้าที่คณะ (`app_user.org_unit_id` ไม่เป็น NULL) เห็นได้เฉพาะแผนของหลักสูตรในคณะตัวเอง
- `DELETE` ต้องเป็นเจ้าของแผนเท่านั้น

---

## 5. ข้อที่ต้องตัดสินใจก่อนลงมือ

1. **`student_type` รองรับไม่ครบ 5 กลุ่ม** — สคีมาปัจจุบันบังคับ
   `student_group IN ('ภาคปกติ','ภาคพิเศษ')` × `nationality IN ('ไทย','ต่างชาติ')` = 4 ชุด
   แต่หน้าจอมีกลุ่มที่ 5 คือ **หลักสูตรต่อเนื่อง** ซึ่งไม่ใช่มิติเดียวกัน
   ต้องเลือกทางใดทางหนึ่ง: เพิ่มค่าใน CHECK ของ `student_group`, เพิ่มคอลัมน์
   `is_continuing boolean`, หรือปล่อยให้ `student_type_id` เป็น NULL แล้วใช้ `segment_code` อย่างเดียว
   — **ข้อนี้ต้องถามกองแผนงานว่านิสิตหลักสูตรต่อเนื่องถูกจัดประเภทอย่างไรในทะเบียนจริง**
2. **อัตรารายกลุ่มควรมาจากระบบ ไม่ใช่ให้ผู้ใช้กรอก** — `fee_schedule.fee_rate` ผูกกับ
   `(program_version_id, period_id, student_type_id)` อยู่แล้ว เมื่อ import ข้อมูลจริงเสร็จ
   ควรให้ API คืนอัตราตั้งต้นมาเติมในฟอร์ม แล้วให้ผู้ใช้แก้ได้เฉพาะกรณีจำลอง
   เช่นเดียวกับ `per_student_charge.rate_per_student` ที่ใช้เป็น AVC ตั้งต้นได้
3. **ควรคำนวณฝั่งเซิร์ฟเวอร์ด้วยหรือไม่** — สูตรอยู่ใน `@beps/calc-engine`
   (`calcSegmentedBreakEven`) ซึ่งเป็น TypeScript ใช้ร่วมกันได้ทั้งสองฝั่ง
   ถ้าเก็บ `segmented_q_star` ลง DB ต้องคำนวณซ้ำฝั่ง API ด้วยแพ็กเกจเดียวกัน
   **ห้ามเขียนสูตรใหม่** ไม่งั้นจะเจอปัญหาเดิมที่ prototype v8 เคยเจอ (Q* สามค่าในระบบเดียว)

---

## 6. การย้ายข้อมูลเดิมของผู้ใช้

ผู้ใช้ที่ทดลองระบบไปแล้วจะมีแผนค้างอยู่ใน `localStorage` ของเบราว์เซอร์ตัวเอง
ตอนเปิดใช้ API ครั้งแรก ให้หน้าจออ่านคีย์เดิมทั้งสอง (`beps.admission-plan.plans`,
`beps.admission-plan.draft`) แล้ว POST ขึ้นเซิร์ฟเวอร์ครั้งเดียว จากนั้นลบคีย์ทิ้ง
— ถ้าไม่ทำ ผู้ใช้จะรู้สึกว่า "แผนที่บันทึกไว้หายไปทั้งหมด" ทันทีที่ deploy
