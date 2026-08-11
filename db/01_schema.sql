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
CREATE TYPE alloc_method      AS ENUM ('DIRECT','ACTUAL_USAGE','STUDENT_HEADCOUNT','PROGRAM_SHARE');
CREATE TYPE quality_flag      AS ENUM ('PASS','ESTIMATED','UNCLASSIFIED','MISSING_DRIVER','ROUNDING_ADJUSTMENT','MANUAL_OVERRIDE');
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
  academic_year        integer          CHECK (academic_year BETWEEN 2500 AND 2700),
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
  nationality       varchar(30) NOT NULL CHECK (nationality  IN ('ไทย','ต่างชาติ'))
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
  reliability_rank       smallint NOT NULL UNIQUE CHECK (reliability_rank BETWEEN 1 AND 4),
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
  valid_from             date NOT NULL,
  valid_to               date,
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
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
ALTER TABLE account_behavior_rule ADD CONSTRAINT behavior_rule_no_overlap
  EXCLUDE USING gist (
    erp_account_id WITH =,
    COALESCE(org_unit_id, -1) WITH =,
    priority WITH =,
    daterange(valid_from, valid_to, '[]') WITH &&
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
CREATE TABLE allocation_driver_value (
  driver_value_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_id          bigint NOT NULL REFERENCES dim_period(period_id),
  org_unit_id        bigint NOT NULL REFERENCES org_unit(org_unit_id),  -- ขอบเขต pool
  program_version_id bigint NOT NULL REFERENCES program_version(program_version_id),
  driver_code        alloc_method NOT NULL,
  driver_value       numeric(20,8) NOT NULL CHECK (driver_value >= 0),
  source_reference   text,
  UNIQUE (period_id, org_unit_id, program_version_id, driver_code)
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
CREATE INDEX ix_driver_lookup       ON allocation_driver_value(period_id, org_unit_id, driver_code);
CREATE INDEX ix_result_run_program  ON allocation_result(allocation_run_id, program_version_id);
CREATE INDEX ix_bep_lookup          ON break_even_result(allocation_run_id, scope, revenue_mode);
CREATE INDEX ix_audit_entity        ON audit_event(entity_type, entity_id, event_time);

-- ─────────────────────────── seed: allocation methods ───────────────────────────
INSERT INTO allocation_method_def (allocation_method_code, method_name, reliability_rank, default_quality_flag) VALUES
  ('DIRECT',            'ผูกกับหลักสูตรโดยตรง',        1, 'PASS'),
  ('ACTUAL_USAGE',      'ตามการใช้จริง',               2, 'PASS'),
  ('STUDENT_HEADCOUNT', 'ตามจำนวนนิสิต',               3, 'PASS'),
  ('PROGRAM_SHARE',     'ตามสัดส่วนหลักสูตร (ประมาณการ)', 4, 'ESTIMATED');

INSERT INTO app_role (role_name) VALUES ('admin'),('budget_office'),('faculty_officer'),('viewer');
