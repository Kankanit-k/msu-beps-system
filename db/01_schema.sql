-- ============================================================================
-- BEPS-SYSTEM — ER v2 schema (PostgreSQL 17)
--
-- ที่มา: รวม ER v1 ของโครงการ (17 ตาราง) กับข้อเสนอใน MANUS/ แล้วแก้ข้อบกพร่อง 6 จุด
--        รายละเอียดการรวมและเหตุผลอยู่ใน COMPARISON.md · โครงสร้างเต็มอยู่ใน SA.md หัวข้อ 5
--
-- สถานะ: ไฟล์อ้างอิงที่รันได้จริง ใช้ตรวจสอบ logic การปันส่วนและ BEP
--        production ใช้ Prisma (Sprint 2) โดย derive จากไฟล์นี้
-- ============================================================================

DROP SCHEMA IF EXISTS beps CASCADE;
CREATE SCHEMA beps;
SET search_path TO beps, public;

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- จำเป็นสำหรับ EXCLUDE ที่ผสม scalar กับ daterange

-- ─────────────────────────────── enums ───────────────────────────────
CREATE TYPE cost_behavior     AS ENUM ('FIXED','VARIABLE','MIXED','UNCLASSIFIED');
CREATE TYPE result_behavior   AS ENUM ('FIXED','VARIABLE');  -- MIXED ถูกแตกก่อนถึงชั้นผลลัพธ์แล้ว
CREATE TYPE master_status     AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','RETIRED');
CREATE TYPE run_status        AS ENUM ('DRAFT','RUNNING','CALCULATED','VALIDATED','APPROVED','FAILED','CANCELLED');
-- 3 ค่าท้ายเป็นวิธีจัดสรรต้นทุนคงที่ตามมติที่ประชุม (ดู ../FIXED-COST-WORKFLOW.md)
--   ทั้ง 3 วิธีต่างกันแค่ "ค่าของ driver" เครื่องปันส่วนจึงไม่ต้องรู้จักวิธีเป็นรายตัว
CREATE TYPE alloc_method      AS ENUM ('DIRECT','ACTUAL_USAGE','STUDENT_HEADCOUNT','PROGRAM_SHARE',
                                       'PER_HEAD_FTES','EQUAL_PROGRAM','CUSTOM_PCT');
CREATE TYPE quality_flag      AS ENUM ('PASS','ESTIMATED','UNCLASSIFIED','MISSING_DRIVER','ROUNDING_ADJUSTMENT','MANUAL_OVERRIDE','POLICY_DEFAULTED');
CREATE TYPE org_level         AS ENUM ('UNIVERSITY','FACULTY','EDUCATION_LEVEL','DEPARTMENT','COST_CENTER');
CREATE TYPE scope_level       AS ENUM ('program','education_level','faculty','university');
CREATE TYPE revenue_mode      AS ENUM ('with_government','without_government');
CREATE TYPE qstar_status      AS ENUM ('normal','full_cost_recovery','not_computable');
CREATE TYPE qstar_method      AS ENUM ('sum_of_programs','pooled');
CREATE TYPE amount_basis      AS ENUM ('ACTUAL','COMMITTED','BUDGET');
CREATE TYPE cost_source_type  AS ENUM ('ERP','DEPRECIATION');
CREATE TYPE budget_category   AS ENUM ('10_govt','20_income');
CREATE TYPE charge_type       AS ENUM ('university_contribution','main_fee_contribution','ge_cost');
CREATE TYPE approval_action   AS ENUM ('submit','approve','reject');
-- กติกาและค่าตั้งระบบมีผลเป็น "รายปี" ไม่ใช่รายวัน — แต่ปีมี 2 แบบ
--   ACADEMIC = ปีการศึกษา (ค่าธรรมเนียม จำนวนนิสิต การรายงาน BEP)
--   FISCAL   = ปีงบประมาณ (งบประมาณ ผังบัญชี ค่าเสื่อมราคา)
CREATE TYPE year_basis        AS ENUM ('ACADEMIC','FISCAL');
CREATE TYPE setting_value_type AS ENUM ('string','integer','numeric','boolean','enum');
-- กลุ่มต้นทุนคงที่ที่นโยบายรายคณะกำหนดวิธีหารแยกกันได้
--   ALL = ฉบับเดียวคุมต้นทุนคงที่ทั้งก้อน (ใช้เป็น fallback เสมอ)
--   OTHER = ต้นทุนที่ยังไม่ได้จับกลุ่ม — ตกไปใช้ฉบับ ALL
CREATE TYPE fixed_cost_pool   AS ENUM ('ALL','SALARY','DEPRECIATION','OFFICE_OVERHEAD','OTHER');
-- ระดับที่คณะกำหนดสัดส่วนเอง — ตัวอย่างในมติ (ป.ตรี 90% / ป.โท-เอก 10%) เป็นระดับการศึกษา
CREATE TYPE bucket_level      AS ENUM ('EDUCATION_LEVEL','PROGRAM');

-- ════════════════ ชั้น 0 — Governance ════════════════
CREATE TABLE import_batch (
  import_batch_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_system     varchar(50)  NOT NULL,
  source_file_name  text,
  source_file_hash  char(64),
  record_count      integer      CHECK (record_count >= 0),
  status            varchar(20)  NOT NULL DEFAULT 'LOADED'
                    CHECK (status IN ('LOADED','VALIDATED','REJECTED','ARCHIVED')),
  received_by       varchar(100) NOT NULL,
  received_at       timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_file_hash)
);

CREATE TABLE audit_event (
  audit_event_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_time          timestamptz NOT NULL DEFAULT now(),
  actor               varchar(100) NOT NULL,
  action              varchar(50)  NOT NULL,
  entity_type         varchar(80)  NOT NULL,
  entity_id           text         NOT NULL,
  reason              text,
  before_payload      jsonb,
  after_payload       jsonb
);

CREATE TABLE app_role (
  app_role_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name   varchar(40) NOT NULL UNIQUE
              CHECK (role_name IN ('admin','budget_office','faculty_officer','viewer'))
);

-- ════════════════ ชั้น 1 — Master ════════════════
CREATE TABLE dim_period (
  period_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fiscal_year          integer NOT NULL CHECK (fiscal_year BETWEEN 2500 AND 2700),
  -- บังคับ NOT NULL: ทั้งระบบรายงานเป็น "ปีการศึกษา" และกติกา/ค่าตั้งที่ผูกกับ ACADEMIC
  -- ต้องหาปีของงวดได้เสมอ ถ้าปล่อยว่างจะมีงวดที่หากติกาไม่เจอแบบเงียบๆ
  academic_year        integer NOT NULL CHECK (academic_year BETWEEN 2500 AND 2700),
  semester             varchar(20),
  period_start         date NOT NULL,
  period_end           date NOT NULL,
  q_snapshot_date      date,                 -- วันนับจำนวนนิสิตที่อนุมัติ
  student_status_rule  text,                 -- สถานะนิสิตที่นับเป็น Q
  CHECK (period_end >= period_start),
  UNIQUE (fiscal_year, academic_year, semester)
);

CREATE TABLE org_unit (
  org_unit_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_org_unit_id bigint REFERENCES org_unit(org_unit_id),
  org_code           varchar(50) NOT NULL,
  org_name           text        NOT NULL,
  org_level          org_level   NOT NULL,
  is_academic        boolean     NOT NULL DEFAULT true,  -- false = หน่วยสนับสนุน ต้องปันส่วนออก
  valid_from         date        NOT NULL,
  valid_to           date,
  status             master_status NOT NULL DEFAULT 'APPROVED',
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK ((org_level = 'UNIVERSITY') = (parent_org_unit_id IS NULL)),
  UNIQUE (org_code, valid_from)
);

CREATE TABLE org_unit_map (
  org_unit_map_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_unit_id     bigint NOT NULL REFERENCES org_unit(org_unit_id),
  erp_org_code    varchar(50) NOT NULL,
  source_reference text,
  status          master_status NOT NULL DEFAULT 'DRAFT',
  approved_by     varchar(100),
  approved_at     timestamptz,
  valid_from      date NOT NULL,
  valid_to        date,
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

-- แก้ #5: กันช่วงเวลาคาบเกี่ยว ไม่ใช่แค่ valid_from ซ้ำ
ALTER TABLE org_unit_map ADD CONSTRAINT org_unit_map_no_overlap
  EXCLUDE USING gist (
    erp_org_code WITH =,
    daterange(valid_from, valid_to, '[]') WITH &&
  ) WHERE (status = 'APPROVED');

CREATE TABLE program (
  program_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_code     varchar(80) NOT NULL UNIQUE,   -- รหัสจริงจากทะเบียน ห้ามใช้ชื่อไทยต่อข้อความ
  program_name     text NOT NULL,
  org_unit_id      bigint NOT NULL REFERENCES org_unit(org_unit_id),  -- ระดับ EDUCATION_LEVEL
  degree_level     varchar(30),
  degree_name      text,
  is_international boolean NOT NULL DEFAULT false
);

CREATE TABLE program_version (
  program_version_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id         bigint NOT NULL REFERENCES program(program_id),
  curriculum_version varchar(30) NOT NULL,        -- รอบปรับปรุง มคอ.
  valid_from         date NOT NULL,
  valid_to           date,
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE (program_id, curriculum_version)
);

CREATE TABLE student_type (
  student_type_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_type_code varchar(50) NOT NULL UNIQUE,
  student_group     varchar(30) NOT NULL CHECK (student_group IN ('ภาคปกติ','ภาคพิเศษ')),
  nationality       varchar(30) NOT NULL CHECK (nationality  IN ('ไทย','ต่างชาติ')),
  -- น้ำหนัก FTES ของนิสิตประเภทนี้ — มติเขียน "Per Head / FTES" ติดกัน แต่สองอย่างนี้ไม่เท่ากัน
  -- ตั้งทุกประเภท = 1 → FTES กลายเป็นการนับหัวตรงๆ จึงรองรับทั้งสองแบบโดยไม่ต้องแก้โค้ด
  ftes_weight       numeric(6,4) NOT NULL DEFAULT 1 CHECK (ftes_weight > 0)
);

CREATE TABLE erp_account (
  erp_account_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_code                 varchar(50) NOT NULL,   -- แผนงาน
  budget_category_code      varchar(50) NOT NULL,   -- หมวดงบประมาณ
  expenditure_category_code varchar(50) NOT NULL,   -- หมวดรายจ่าย
  subcategory_code          varchar(50) NOT NULL,   -- หมวดรายจ่ายย่อย
  account_name              text,
  valid_from                date NOT NULL,
  valid_to                  date,
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  -- คีย์ที่แท้จริงคือคีย์ผสม 4 ระดับ (พิสูจน์จากข้อมูลจริง — MAPPING.md หัวข้อ 2)
  UNIQUE (plan_code, budget_category_code, expenditure_category_code, subcategory_code, valid_from)
);

CREATE TABLE allocation_method_def (
  allocation_method_code alloc_method PRIMARY KEY,
  method_name            text NOT NULL,
  reliability_rank       smallint NOT NULL UNIQUE CHECK (reliability_rank BETWEEN 1 AND 9),
  default_quality_flag   quality_flag NOT NULL
);

CREATE TABLE account_behavior_rule (
  behavior_rule_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  erp_account_id         bigint NOT NULL REFERENCES erp_account(erp_account_id),
  org_unit_id            bigint REFERENCES org_unit(org_unit_id),   -- NULL = ใช้ทุกหน่วยงาน
  behavior               cost_behavior NOT NULL,
  fixed_ratio            numeric(9,8) NOT NULL DEFAULT 0 CHECK (fixed_ratio    BETWEEN 0 AND 1),
  variable_ratio         numeric(9,8) NOT NULL DEFAULT 0 CHECK (variable_ratio BETWEEN 0 AND 1),
  allocation_method_code alloc_method REFERENCES allocation_method_def(allocation_method_code),
  direct_indirect_flag   varchar(20) CHECK (direct_indirect_flag IN ('DIRECT','INDIRECT')),
  priority               smallint NOT NULL DEFAULT 100 CHECK (priority >= 0),
  rule_version           varchar(50) NOT NULL,
  status                 master_status NOT NULL DEFAULT 'DRAFT',
  approved_by            varchar(100),
  approved_at            timestamptz,
  -- แก้ #8: เดิมกติกาผูกกับ "ช่วงวันที่" แต่ข้อมูลต้นทุนผูกกับ "งวด" (period_id)
  --         การหากติกาจึงต้องเดาวันจากงวด (ใช้ period_start) ทำให้กติกาที่เปลี่ยนกลางงวด
  --         ถูกมองข้ามเงียบๆ และผู้ใช้ที่คิดเป็น "ปีการศึกษา" ตั้งค่าผิดได้ง่าย
  --         → เปลี่ยนมาผูกกับช่วง "ปี" ตรงๆ พร้อมระบุว่าเป็นปีการศึกษาหรือปีงบประมาณ
  year_basis             year_basis NOT NULL DEFAULT 'ACADEMIC',
  effective_from_year    integer NOT NULL CHECK (effective_from_year BETWEEN 2500 AND 2700),
  effective_to_year      integer          CHECK (effective_to_year   BETWEEN 2500 AND 2700),
  note                   text,
  CHECK (effective_to_year IS NULL OR effective_to_year >= effective_from_year),
  CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  -- แก้ #1: CHECK ผูกกับ behavior ทำให้ UNCLASSIFIED (0/0) แทรกได้
  --         เดิม MANUS บังคับ fixed+variable = 1 กับทุกแถว → แทรก UNCLASSIFIED ไม่ได้เลย
  CONSTRAINT behavior_ratio_consistent CHECK (
       (behavior = 'FIXED'        AND fixed_ratio = 1 AND variable_ratio = 0)
    OR (behavior = 'VARIABLE'     AND fixed_ratio = 0 AND variable_ratio = 1)
    OR (behavior = 'MIXED'        AND fixed_ratio > 0 AND variable_ratio > 0
                                  AND fixed_ratio + variable_ratio = 1)
    OR (behavior = 'UNCLASSIFIED' AND fixed_ratio = 0 AND variable_ratio = 0)
  )
);

-- แก้ #5: กันกติกาที่อนุมัติแล้วซ้อนช่วงเวลากันในบริบทเดียวกัน
--         (แก้ #8: เปลี่ยนจาก daterange เป็น int4range ของปี)
ALTER TABLE account_behavior_rule ADD CONSTRAINT behavior_rule_no_overlap
  EXCLUDE USING gist (
    erp_account_id WITH =,
    COALESCE(org_unit_id, -1) WITH =,
    priority WITH =,
    year_basis WITH =,
    int4range(effective_from_year, effective_to_year, '[]') WITH &&
  ) WHERE (status = 'APPROVED');

-- ── ค่าตั้งระบบ (นโยบายการคำนวณ) ────────────────────────────────────────────
-- แก้ #9: เดิมนโยบายการคำนวณถูกฝังในโค้ด (prototype ฝังไว้ทั้งหมด) ทำให้
--   ก) กองแผนงานเปลี่ยนเองไม่ได้ ต้องแก้โค้ด
--   ข) ไม่มีหลักฐานว่าตัวเลขปีไหนคำนวณด้วยนโยบายใด — เทียบข้ามปีไม่ได้
--   ค) เกิดกรณีที่หน้าจอหนึ่งใช้กติกาหนึ่ง อีกหน้าใช้อีกกติกา (พบจริงใน prototype v8:
--      ตารางรายงานว่า "ไม่มีจุดคุ้มทุน" แต่เครื่องคำนวณตอบ Q* = 24 สำหรับหลักสูตรเดียวกัน)
-- จึงยกขึ้นมาเป็น master ที่มีเวอร์ชันและต้องอนุมัติ เหมือน account_behavior_rule

-- catalog: นิยามว่ามีค่าตั้งอะไรบ้าง ชนิดอะไร ค่าที่ยอมรับได้คืออะไร
CREATE TABLE system_setting_def (
  setting_key     varchar(60) PRIMARY KEY,
  setting_group   varchar(40) NOT NULL
                  CHECK (setting_group IN ('calculation','allocation','presentation')),
  display_name    text NOT NULL,
  description     text NOT NULL,
  value_type      setting_value_type NOT NULL,
  allowed_values  text[],                 -- NULL = ไม่จำกัดชุดค่า
  default_value   text NOT NULL,
  -- ปีแบบไหนเป็นตัวตัดสินว่าค่าไหนมีผล — กำหนดที่ระดับ key ไม่ใช่ระดับแถวค่า
  -- เพื่อไม่ให้ค่าสองแถวคนละฐานปีมีผลพร้อมกันแล้วเลือกไม่ถูก
  year_basis      year_basis NOT NULL,
  -- true = เปลี่ยนแล้วตัวเลขในรายงานเปลี่ยน ต้องคำนวณใหม่และแจ้งผู้ใช้
  affects_numbers boolean NOT NULL DEFAULT true,
  CHECK (value_type <> 'enum' OR allowed_values IS NOT NULL),
  CHECK (allowed_values IS NULL OR default_value = ANY (allowed_values))
);

-- ค่าที่ตั้งจริง แยกตามช่วงปีและหน่วยงาน + ต้องอนุมัติเหมือนกติกาอื่น
CREATE TABLE system_setting (
  system_setting_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  setting_key         varchar(60) NOT NULL REFERENCES system_setting_def(setting_key),
  org_unit_id         bigint REFERENCES org_unit(org_unit_id),  -- NULL = ใช้ทั้งมหาวิทยาลัย
  effective_from_year integer NOT NULL CHECK (effective_from_year BETWEEN 2500 AND 2700),
  effective_to_year   integer          CHECK (effective_to_year   BETWEEN 2500 AND 2700),
  setting_value       text NOT NULL,
  status              master_status NOT NULL DEFAULT 'DRAFT',
  approved_by         varchar(100),
  approved_at         timestamptz,
  note                text,
  CHECK (effective_to_year IS NULL OR effective_to_year >= effective_from_year),
  CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

ALTER TABLE system_setting ADD CONSTRAINT system_setting_no_overlap
  EXCLUDE USING gist (
    setting_key WITH =,
    COALESCE(org_unit_id, -1) WITH =,
    int4range(effective_from_year, effective_to_year, '[]') WITH &&
  ) WHERE (status = 'APPROVED');

-- ════════════════ ชั้น 2 — Rates ════════════════
CREATE TABLE fee_schedule (
  fee_schedule_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_version_id bigint NOT NULL REFERENCES program_version(program_version_id),
  period_id          bigint NOT NULL REFERENCES dim_period(period_id),
  student_type_id    bigint NOT NULL REFERENCES student_type(student_type_id),
  fee_rate           numeric(20,2) NOT NULL CHECK (fee_rate >= 0),
  approval_status    master_status NOT NULL DEFAULT 'DRAFT',
  approved_by        varchar(100),
  approved_at        timestamptz,
  CHECK (approval_status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  UNIQUE (program_version_id, period_id, student_type_id)
);

CREATE TABLE fee_approval_log (
  fee_approval_log_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fee_schedule_id     bigint NOT NULL REFERENCES fee_schedule(fee_schedule_id),
  acted_by            varchar(100) NOT NULL,
  action              approval_action NOT NULL,
  note                text,
  acted_at            timestamptz NOT NULL DEFAULT now()
);

-- เงินสมทบ + ค่าใช้จ่าย GE — คิดเป็นอัตรา × จำนวนนิสิต จึงเป็น direct variable cost ไม่ต้องปันส่วน
CREATE TABLE per_student_charge (
  per_student_charge_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  charge_type           charge_type NOT NULL,
  org_unit_id           bigint REFERENCES org_unit(org_unit_id),  -- NULL = ระดับมหาวิทยาลัย
  period_id             bigint NOT NULL REFERENCES dim_period(period_id),
  student_type_id       bigint REFERENCES student_type(student_type_id),
  rate_per_student      numeric(20,2) NOT NULL,
  rate_basis            varchar(20) NOT NULL DEFAULT 'per_term'
                        CHECK (rate_basis IN ('per_term','per_year'))
);

CREATE TABLE budget_allocation (
  budget_allocation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_version_id   bigint NOT NULL REFERENCES program_version(program_version_id),
  period_id            bigint NOT NULL REFERENCES dim_period(period_id),
  category             budget_category NOT NULL,
  approved_amount      numeric(20,2) NOT NULL,
  source               varchar(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('api','manual')),
  synced_at            timestamptz,
  UNIQUE (program_version_id, period_id, category)
);

-- ════════════════ ชั้น 3 — Source ════════════════
CREATE TABLE cost_source (
  cost_source_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_batch_id    bigint NOT NULL REFERENCES import_batch(import_batch_id),
  source_record_id   text   NOT NULL,
  source_type        cost_source_type NOT NULL DEFAULT 'ERP',
  period_id          bigint NOT NULL REFERENCES dim_period(period_id),
  org_unit_id        bigint NOT NULL REFERENCES org_unit(org_unit_id),
  erp_account_id     bigint REFERENCES erp_account(erp_account_id),      -- NULL เมื่อเป็นค่าเสื่อม
  program_version_id bigint REFERENCES program_version(program_version_id), -- มีค่า = direct cost
  -- แก้ #6: ไม่บังคับ amount >= 0 เพราะ ERP มีรายการคืนเงิน/ปรับปรุงติดลบจริง
  amount             numeric(20,2) NOT NULL,
  basis              amount_basis NOT NULL DEFAULT 'ACTUAL',
  loaded_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (source_type <> 'ERP' OR erp_account_id IS NOT NULL),
  UNIQUE (import_batch_id, source_record_id)
);

CREATE TABLE registration_snapshot (
  registration_snapshot_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_batch_id          bigint NOT NULL REFERENCES import_batch(import_batch_id),
  period_id                bigint NOT NULL REFERENCES dim_period(period_id),
  program_version_id       bigint NOT NULL REFERENCES program_version(program_version_id),
  student_type_id          bigint NOT NULL REFERENCES student_type(student_type_id),
  snapshot_date            date NOT NULL,
  student_count            integer NOT NULL CHECK (student_count >= 0),
  UNIQUE (period_id, program_version_id, student_type_id, snapshot_date)
);

-- ════════════════ ชั้น 4 — Allocation ════════════════
-- ─────────── นโยบายจัดสรรต้นทุนคงที่รายคณะ (มติที่ประชุม · FIXED-COST-WORKFLOW.md) ───────────
-- เดิมวิธีหารต้นทุนคงที่เป็นกติกากลางใน account_behavior_rule ที่กองแผนงานตั้งให้ทั้งระบบ
-- มติย้ายการตัดสินใจมาที่คณะ แต่ยังต้องผ่านการอนุมัติและตรวจสอบย้อนหลังได้
-- จึงเก็บเป็น master ที่มีเวอร์ชันรายปี ไม่ใช่ค่าคงที่ในโค้ดและไม่ใช่การแก้ตัวเลขผลลัพธ์

-- จับคู่ผังบัญชีกับกลุ่มต้นทุนคงที่ — ไม่จับคู่ = 'OTHER' ซึ่งตกไปใช้ฉบับ ALL
CREATE TABLE fixed_cost_pool_rule (
  pool_rule_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  erp_account_id bigint NOT NULL REFERENCES erp_account(erp_account_id),
  cost_pool      fixed_cost_pool NOT NULL CHECK (cost_pool <> 'ALL'),
  note           text,
  UNIQUE (erp_account_id)
);

CREATE TABLE fixed_cost_policy (
  policy_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_unit_id     bigint NOT NULL REFERENCES org_unit(org_unit_id),   -- ระดับ FACULTY
  academic_year   integer NOT NULL CHECK (academic_year BETWEEN 2500 AND 2700),
  cost_pool       fixed_cost_pool NOT NULL DEFAULT 'ALL',
  method          alloc_method NOT NULL
                  CHECK (method IN ('PER_HEAD_FTES','EQUAL_PROGRAM','CUSTOM_PCT')),
  -- ใช้เมื่อ method = CUSTOM_PCT เท่านั้น — ชั้นที่ 2 ของการแบ่ง (ภายใน bucket)
  sub_method      alloc_method CHECK (sub_method IN ('PER_HEAD_FTES','EQUAL_PROGRAM')),
  bucket_level    bucket_level,
  status          master_status NOT NULL DEFAULT 'DRAFT',
  -- V4: กำหนดสัดส่วนเองต้องอ้างมติและเหตุผลเสมอ — ดุลพินิจที่ไม่มีหลักฐานคือช่องโหว่ธรรมาภิบาล
  meeting_ref     text,
  rationale       text,
  submitted_by    varchar(100),
  submitted_at    timestamptz,
  approved_by     varchar(100),
  approved_at     timestamptz,
  reject_reason   text,
  supersedes_policy_id bigint REFERENCES fixed_cost_policy(policy_id),
  created_by      varchar(100) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((method = 'CUSTOM_PCT') = (bucket_level IS NOT NULL)),
  CHECK (method = 'CUSTOM_PCT' OR sub_method IS NULL),
  CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  -- V5 maker-checker: ผู้เสนออนุมัติฉบับของตัวเองไม่ได้ (กติกาเดียวกับ allocation_run)
  CHECK (approved_by IS NULL OR submitted_by IS NULL OR approved_by <> submitted_by),
  CHECK (method <> 'CUSTOM_PCT' OR status NOT IN ('PENDING_APPROVAL','APPROVED')
         OR (meeting_ref IS NOT NULL AND rationale IS NOT NULL))
);

-- หนึ่งปี หนึ่งคณะ หนึ่งกลุ่มต้นทุน มีฉบับที่อนุมัติได้ครั้งละหนึ่งเท่านั้น
-- ฉบับใหม่ต้องชี้ supersedes_policy_id และผลักฉบับเก่าเป็น RETIRED
CREATE UNIQUE INDEX ux_fixed_cost_policy_approved
  ON fixed_cost_policy (org_unit_id, academic_year, cost_pool) WHERE status = 'APPROVED';

CREATE TABLE fixed_cost_policy_line (
  policy_line_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  policy_id      bigint NOT NULL REFERENCES fixed_cost_policy(policy_id) ON DELETE CASCADE,
  -- ระดับการศึกษา (degree_level) หรือ program_version_id ตาม bucket_level ของฉบับนั้น
  bucket_key     text NOT NULL,
  pct            numeric(7,4) NOT NULL CHECK (pct >= 0 AND pct <= 100),
  UNIQUE (policy_id, bucket_key)   -- V1: กันกำหนดกลุ่มเดียวซ้ำสองบรรทัด
);

CREATE TABLE allocation_driver_value (
  driver_value_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_id          bigint NOT NULL REFERENCES dim_period(period_id),
  org_unit_id        bigint NOT NULL REFERENCES org_unit(org_unit_id),  -- ขอบเขต pool
  program_version_id bigint NOT NULL REFERENCES program_version(program_version_id),
  driver_code        alloc_method NOT NULL,
  -- กลุ่มต้นทุนที่ค่า driver ชุดนี้ใช้กับ — คณะเดียวกันอาจตั้งสัดส่วนเงินเดือนกับค่าเสื่อมต่างกัน
  -- ค่า 'ALL' คือชุดที่ใช้กับต้นทุนทั่วไป (driver เดิมทั้งหมดอยู่ในชุดนี้)
  cost_pool          fixed_cost_pool NOT NULL DEFAULT 'ALL',
  driver_value       numeric(20,8) NOT NULL CHECK (driver_value >= 0),
  -- 'policy:<id>' เมื่อค่านี้ถูกสร้างจากนโยบายต้นทุนคงที่ — ตามรอยกลับไปยังฉบับที่อนุมัติได้
  source_reference   text,
  UNIQUE (period_id, org_unit_id, program_version_id, driver_code, cost_pool)
);

CREATE TABLE allocation_run (
  allocation_run_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_id         bigint NOT NULL REFERENCES dim_period(period_id),
  org_unit_id       bigint NOT NULL REFERENCES org_unit(org_unit_id),
  basis             amount_basis NOT NULL,
  rule_version      varchar(50) NOT NULL,
  status            run_status NOT NULL DEFAULT 'DRAFT',
  supersedes_run_id bigint REFERENCES allocation_run(allocation_run_id),
  tolerance         numeric(20,2) NOT NULL DEFAULT 0.00 CHECK (tolerance >= 0),
  created_by        varchar(100) NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  approved_by       varchar(100),
  approved_at       timestamptz,
  error_message     text,
  CHECK (status NOT IN ('APPROVED') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  -- maker-checker: ผู้สร้างอนุมัติผลของตัวเองไม่ได้
  CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE allocation_result (
  allocation_result_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id    bigint NOT NULL REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  cost_source_id       bigint NOT NULL REFERENCES cost_source(cost_source_id),
  -- NULL = ปันส่วนไม่ได้ (ไม่มี driver) — แก้ #4: ยอดไม่หายเงียบ
  program_version_id   bigint REFERENCES program_version(program_version_id),
  behavior             result_behavior NOT NULL,   -- MIXED ถูกแตกเป็น 2 แถวแล้ว (แก้ #2)
  allocation_method    alloc_method NOT NULL,
  driver_value         numeric(20,8) NOT NULL DEFAULT 0,
  driver_total         numeric(20,8) NOT NULL DEFAULT 0,
  allocated_amount     numeric(20,2) NOT NULL,
  flag                 quality_flag NOT NULL DEFAULT 'PASS',
  UNIQUE (allocation_run_id, cost_source_id, program_version_id, behavior)
);

CREATE TABLE reconciliation_control (
  reconciliation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id bigint NOT NULL UNIQUE REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  source_total      numeric(20,2) NOT NULL,
  allocated_total   numeric(20,2) NOT NULL,
  difference        numeric(20,2) GENERATED ALWAYS AS (source_total - allocated_total) STORED,
  tolerance         numeric(20,2) NOT NULL,
  status            varchar(10) NOT NULL CHECK (status IN ('PASS','FAIL')),
  checked_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE data_quality_issue (
  issue_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id bigint REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  issue_type        quality_flag NOT NULL,
  severity          varchar(10) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH')),
  entity_ref        text,
  amount_impact     numeric(20,2),
  detail            text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ════════════════ ชั้น 5 — Analytics ════════════════
CREATE TABLE program_cost_summary (
  summary_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id      bigint NOT NULL REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  program_version_id     bigint NOT NULL REFERENCES program_version(program_version_id),
  direct_fixed_cost      numeric(20,2) NOT NULL DEFAULT 0,
  allocated_fixed_cost   numeric(20,2) NOT NULL DEFAULT 0,
  direct_variable_cost   numeric(20,2) NOT NULL DEFAULT 0,
  allocated_variable_cost numeric(20,2) NOT NULL DEFAULT 0,
  -- เงินสมทบ + GE (อัตรา × จำนวนนิสิต) — ไม่ผ่านการปันส่วน จึงไม่อยู่ในขอบเขต reconciliation
  per_student_variable_cost numeric(20,2) NOT NULL DEFAULT 0,
  unclassified_cost      numeric(20,2) NOT NULL DEFAULT 0,
  flagged_rows           integer NOT NULL DEFAULT 0,
  UNIQUE (allocation_run_id, program_version_id)
);

CREATE TABLE program_revenue_summary (
  revenue_summary_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id  bigint NOT NULL REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  program_version_id bigint NOT NULL REFERENCES program_version(program_version_id),
  q_actual           integer NOT NULL DEFAULT 0 CHECK (q_actual >= 0),
  fee_revenue        numeric(20,2) NOT NULL DEFAULT 0,
  government_budget  numeric(20,2) NOT NULL DEFAULT 0,   -- หมวด 10
  income_budget      numeric(20,2) NOT NULL DEFAULT 0,   -- หมวด 20
  UNIQUE (allocation_run_id, program_version_id)
);

CREATE TABLE break_even_result (
  break_even_result_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_run_id    bigint NOT NULL REFERENCES allocation_run(allocation_run_id) ON DELETE CASCADE,
  scope               scope_level  NOT NULL,
  scope_id            bigint,                    -- NULL เมื่อ scope = university
  revenue_mode        revenue_mode NOT NULL,
  q_actual            integer       NOT NULL,
  tr                  numeric(20,2) NOT NULL,
  tc                  numeric(20,2) NOT NULL,
  tfc                 numeric(20,2) NOT NULL,
  tvc                 numeric(20,2) NOT NULL,
  direct_cost         numeric(20,2) NOT NULL DEFAULT 0,
  allocated_cost      numeric(20,2) NOT NULL DEFAULT 0,
  r_per_head          numeric(20,4),
  avc                 numeric(20,4),
  atc                 numeric(20,4),
  cm                  numeric(20,4),
  q_star              numeric(20,2),
  q_star_status       qstar_status NOT NULL,
  q_star_method       qstar_method,              -- ใช้เฉพาะ scope สูงกว่า program
  be_revenue          numeric(20,2),
  margin_of_safety    numeric(20,2),
  profit_loss         numeric(20,2) NOT NULL,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allocation_run_id, scope, scope_id, revenue_mode, q_star_method)
);

-- ════════════════ ชั้น 6 — Scenario / Access ════════════════
CREATE TABLE app_user (
  app_user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_role_id bigint NOT NULL REFERENCES app_role(app_role_id),
  org_unit_id bigint REFERENCES org_unit(org_unit_id),   -- จำกัดขอบเขตเจ้าหน้าที่คณะ
  full_name   text NOT NULL,
  email       varchar(255) NOT NULL UNIQUE
);

CREATE TABLE scenario_plan (
  scenario_plan_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_by            bigint NOT NULL REFERENCES app_user(app_user_id),
  based_on_pv_id        bigint REFERENCES program_version(program_version_id), -- NULL = หลักสูตรใหม่
  based_on_run_id       bigint REFERENCES allocation_run(allocation_run_id),
  plan_name             text NOT NULL,
  plan_type             varchar(10) NOT NULL CHECK (plan_type IN ('existing','new')),
  period_id             bigint NOT NULL REFERENCES dim_period(period_id),
  revenue_mode          revenue_mode NOT NULL,
  q_input               integer NOT NULL CHECK (q_input >= 0),
  government_budget_in  numeric(20,2) NOT NULL DEFAULT 0,
  income_budget_in      numeric(20,2) NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK ((plan_type = 'existing') = (based_on_pv_id IS NOT NULL))
);

CREATE TABLE scenario_cost_item (
  scenario_cost_item_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scenario_plan_id      bigint NOT NULL REFERENCES scenario_plan(scenario_plan_id) ON DELETE CASCADE,
  behavior              result_behavior NOT NULL,
  label                 text NOT NULL,
  amount                numeric(20,2) NOT NULL,
  is_per_student        boolean NOT NULL DEFAULT false   -- true = amount คือบาท/คน ต้องคูณ Q
);

CREATE TABLE scenario_result (
  scenario_result_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scenario_plan_id   bigint NOT NULL UNIQUE REFERENCES scenario_plan(scenario_plan_id) ON DELETE CASCADE,
  tr                 numeric(20,2) NOT NULL,
  tc                 numeric(20,2) NOT NULL,
  tfc                numeric(20,2) NOT NULL,
  tvc                numeric(20,2) NOT NULL,
  r_per_head         numeric(20,4),
  avc                numeric(20,4),
  cm                 numeric(20,4),
  q_star             numeric(20,2),
  q_star_status      qstar_status NOT NULL,
  profit_loss        numeric(20,2) NOT NULL,
  computed_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────── indexes ───────────────────────────────
CREATE INDEX ix_cost_source_scope   ON cost_source(period_id, org_unit_id, basis);
CREATE INDEX ix_driver_lookup       ON allocation_driver_value(period_id, org_unit_id, driver_code, cost_pool);
CREATE INDEX ix_fixed_policy_lookup ON fixed_cost_policy(org_unit_id, academic_year, cost_pool, status);
CREATE INDEX ix_result_run_program  ON allocation_result(allocation_run_id, program_version_id);
CREATE INDEX ix_bep_lookup          ON break_even_result(allocation_run_id, scope, revenue_mode);
CREATE INDEX ix_audit_entity        ON audit_event(entity_type, entity_id, event_time);

-- ─────────────────────────── seed: allocation methods ───────────────────────────
INSERT INTO allocation_method_def (allocation_method_code, method_name, reliability_rank, default_quality_flag) VALUES
  ('DIRECT',            'ผูกกับหลักสูตรโดยตรง',        1, 'PASS'),
  ('ACTUAL_USAGE',      'ตามการใช้จริง',               2, 'PASS'),
  ('STUDENT_HEADCOUNT', 'ตามจำนวนนิสิต',               3, 'PASS'),
  -- วิธีที่ 1 ตามมติ — เหมือน STUDENT_HEADCOUNT แต่ถ่วงน้ำหนักด้วย student_type.ftes_weight
  ('PER_HEAD_FTES',     'ตามรายหัวนิสิต (FTES)',       4, 'PASS'),
  ('PROGRAM_SHARE',     'ตามสัดส่วนหลักสูตร (ประมาณการ)', 5, 'ESTIMATED'),
  -- วิธีที่ 2 — ไม่พึ่งข้อมูลนิสิต จึงไม่มีทางขาด driver แต่ไม่สะท้อนขนาดหลักสูตร
  ('EQUAL_PROGRAM',     'หารเท่ากันทุกหลักสูตรในคณะ',   6, 'PASS'),
  -- วิธีที่ 3 — มาจากดุลพินิจของคณะ ไม่ใช่ข้อมูลจริง จึงติดธง MANUAL_OVERRIDE เสมอ
  ('CUSTOM_PCT',        'กำหนดสัดส่วนเปอร์เซ็นต์เอง',   7, 'MANUAL_OVERRIDE');

INSERT INTO app_role (role_name) VALUES ('admin'),('budget_office'),('faculty_officer'),('viewer');

-- ─────────────────── seed: catalog ค่าตั้งระบบ (แก้ #9) ───────────────────
-- ทุก key ที่นี่คือค่าที่ prototype เคยฝังไว้ในโค้ด
INSERT INTO system_setting_def
  (setting_key, setting_group, display_name, description, value_type, allowed_values, default_value, year_basis, affects_numbers) VALUES
  ('qstar_primary_method','calculation',
   'วิธีคำนวณ Q* ระดับคณะ/มหาวิทยาลัย',
   'sum_of_programs = รวม Q* รายหลักสูตร (เข้มงวด ชดเชยข้ามหลักสูตรไม่ได้) · pooled = คำนวณจากยอดรวมครั้งเดียว. ระบบเก็บผลทั้งสองวิธีเสมอ ค่านี้เลือกว่าค่าไหนเป็นตัวหลักที่แสดงในรายงาน',
   'enum', ARRAY['sum_of_programs','pooled'], 'sum_of_programs', 'ACADEMIC', true),

  ('cm_le_zero_policy','calculation',
   'เมื่อ CM ≤ 0 (AVC สูงกว่า R)',
   'full_cost_recovery = รายงานเป้าหมายขั้นต่ำ Q* = TC ÷ R (สูตร 7) · not_computable = รายงานว่าไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน. ต้องเลือกอย่างใดอย่างหนึ่งให้ทั้งระบบใช้ตรงกัน',
   'enum', ARRAY['full_cost_recovery','not_computable'], 'full_cost_recovery', 'ACADEMIC', true),

  ('qstar_rounding','calculation',
   'การปัดเศษ Q*',
   'ceil = ปัดขึ้นเสมอ (รับนิสิต 238.4 คนไม่ได้ ต้องรับ 239) · round = ปัดตามหลักคณิตศาสตร์ (ตรงกับ prototype เดิม)',
   'enum', ARRAY['ceil','round'], 'ceil', 'ACADEMIC', true),

  ('profit_pct_basis','calculation',
   'ตัวหารของ "กำไร %"',
   'TC = π ÷ ต้นทุนรวม (โค้ด prototype ส่วนใหญ่ใช้แบบนี้) · TR = π ÷ รายได้รวม. v8 ใช้ทั้งสองแบบปนกัน — หน้าภาพรวมใช้ TR แต่ Cross Analysis และเครื่องคำนวณใช้ TC ทำให้ผู้ใช้เห็นกำไร % ไม่ตรงกันระหว่างหน้า',
   'enum', ARRAY['TC','TR'], 'TC', 'ACADEMIC', true),

  ('default_revenue_mode','calculation',
   'ฐานรายได้ตั้งต้นของรายงาน',
   'ระบบคำนวณทั้งสองฐานเสมอ ค่านี้กำหนดว่าเปิดหน้าจอมาแล้วเห็นฐานไหนก่อน',
   'enum', ARRAY['with_government','without_government'], 'with_government', 'ACADEMIC', false),

  ('default_allocation_method','allocation',
   'วิธีปันส่วนเมื่อกติกาไม่ได้ระบุ',
   'ใช้เมื่อ account_behavior_rule ไม่ได้กำหนด allocation_method_code ไว้',
   'enum', ARRAY['DIRECT','ACTUAL_USAGE','STUDENT_HEADCOUNT','PROGRAM_SHARE'], 'STUDENT_HEADCOUNT', 'FISCAL', true),

  ('depreciation_behavior','allocation',
   'ประเภทต้นทุนของค่าเสื่อมราคา',
   'ค่าเสื่อมราคาไม่มีรหัสผังบัญชี จึงหากติกาปกติไม่เจอ ต้องกำหนดแยก',
   'enum', ARRAY['FIXED','VARIABLE'], 'FIXED', 'FISCAL', true),

  ('reconciliation_tolerance','allocation',
   'ส่วนต่างที่ยอมรับได้ในการตรวจยอด (บาท)',
   'ยอดปันส่วนรวมต่างจากยอดต้นทางเกินค่านี้ → run จะเป็น FAILED. ตั้ง 0 = ต้องตรงพอดี',
   'numeric', NULL, '0.00', 'FISCAL', false),

  ('outlier_min_q','presentation',
   'จำนวนนิสิตขั้นต่ำที่นำขึ้นกราฟ',
   'หน่วยที่มีนิสิตน้อยกว่านี้จะมีต้นทุน/หัวสูงจนบิดเบือนแกนกราฟ จึงกันออกจากกราฟแต่ยังคงอยู่ในตารางและยอดรวม',
   'integer', NULL, '30', 'ACADEMIC', false),

  ('non_academic_unit_in_total','presentation',
   'นับหน่วยที่ไม่ผลิตบัณฑิตในยอดรวมหรือไม่',
   'หน่วยที่ is_academic = false (เช่น สถาบันวิจัย) มีต้นทุนแต่แทบไม่มีนิสิต — เลือกว่าจะรวมในยอดมหาวิทยาลัยหรือรายงานแยก',
   'boolean', NULL, 'true', 'ACADEMIC', true);
