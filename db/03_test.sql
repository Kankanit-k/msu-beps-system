-- ============================================================================
-- ชุดทดสอบเครื่องปันส่วน + การคำนวณจุดคุ้มทุน
-- ทดสอบข้อบกพร่องทั้ง 6 จุดที่พบใน MANUS/*.sql ว่าแก้แล้วจริง
-- รันด้วย:  psql -v ON_ERROR_STOP=1 -f 03_test.sql
-- ============================================================================
SET search_path TO beps, public;

-- ─────────────────────────── seed ───────────────────────────
INSERT INTO dim_period (fiscal_year, academic_year, semester, period_start, period_end, q_snapshot_date)
VALUES (2568, 2568, '1', '2567-10-01', '2568-09-30', '2568-07-01');

INSERT INTO org_unit (parent_org_unit_id, org_code, org_name, org_level, valid_from) VALUES
  (NULL, 'MSU', 'มหาวิทยาลัยมหาสารคาม', 'UNIVERSITY', '2500-01-01');
INSERT INTO org_unit (parent_org_unit_id, org_code, org_name, org_level, valid_from)
  SELECT org_unit_id, 'F01', 'คณะทดสอบ', 'FACULTY', '2500-01-01' FROM org_unit WHERE org_code='MSU';
INSERT INTO org_unit (parent_org_unit_id, org_code, org_name, org_level, valid_from)
  SELECT org_unit_id, 'F01-UG', 'คณะทดสอบ / ปริญญาตรี', 'EDUCATION_LEVEL', '2500-01-01'
    FROM org_unit WHERE org_code='F01';

INSERT INTO program (program_code, program_name, org_unit_id, degree_level)
SELECT c.code, c.nm, o.org_unit_id, 'ปริญญาตรี'
  FROM org_unit o, (VALUES ('P01','หลักสูตรใหญ่'),('P02','หลักสูตรกลาง'),('P03','หลักสูตรต้นทุนสูง')) c(code,nm)
 WHERE o.org_code='F01-UG';

INSERT INTO program_version (program_id, curriculum_version, valid_from)
SELECT program_id, '2565', '2565-01-01' FROM program;

INSERT INTO student_type (student_type_code, student_group, nationality)
VALUES ('TH-REG','ภาคปกติ','ไทย');

INSERT INTO import_batch (source_system, source_file_name, source_file_hash, record_count, received_by)
VALUES ('TEST','seed.csv', repeat('a',64), 9, 'tester');

-- จำนวนนิสิต 100 / 50 / 10
INSERT INTO registration_snapshot (import_batch_id, period_id, program_version_id, student_type_id, snapshot_date, student_count)
SELECT b.import_batch_id, p.period_id, pv.program_version_id, st.student_type_id, '2568-07-01',
       CASE pr.program_code WHEN 'P01' THEN 100 WHEN 'P02' THEN 50 ELSE 10 END
  FROM import_batch b, dim_period p, student_type st, program_version pv JOIN program pr USING (program_id);

INSERT INTO fee_schedule (program_version_id, period_id, student_type_id, fee_rate, approval_status, approved_by, approved_at)
SELECT pv.program_version_id, p.period_id, st.student_type_id, 20000, 'APPROVED', 'budget_office', now()
  FROM dim_period p, student_type st, program_version pv;

-- งบประมาณ: P03 ตั้งใจให้ต้นทุนผันแปรต่อหัวสูงกว่ารายได้ต่อหัว → ทดสอบสูตร 7
INSERT INTO budget_allocation (program_version_id, period_id, category, approved_amount)
SELECT pv.program_version_id, p.period_id, v.cat, v.amt
  FROM dim_period p, program_version pv JOIN program pr USING (program_id),
  LATERAL (VALUES
    ('10_govt'::budget_category,   CASE pr.program_code WHEN 'P01' THEN 500000 WHEN 'P02' THEN 100000 ELSE 50000 END),
    ('20_income'::budget_category, CASE pr.program_code WHEN 'P01' THEN 800000 WHEN 'P02' THEN 300000 ELSE 20000 END)
  ) v(cat, amt);

-- ผังบัญชี 4 ระดับ
INSERT INTO erp_account (plan_code, budget_category_code, expenditure_category_code, subcategory_code, account_name, valid_from) VALUES
  ('1','1','100','10001','เงินเดือน',                 '2500-01-01'),  -- A1
  ('2','2','410','41001','ค่าสาธารณูปโภค',            '2500-01-01'),  -- A2
  ('2','4','800','80001','เงินอุดหนุนทั่วไป',          '2500-01-01'),  -- A3  MIXED 50/50
  ('2','2','400','40010','ค่าจดลิขสิทธิ์',             '2500-01-01'),  -- A4  UNCLASSIFIED
  ('3','2','400','40099','รายการที่ยังไม่มีกติกา',      '2500-01-01');  -- A5  ไม่มี rule

INSERT INTO account_behavior_rule
  (erp_account_id, behavior, fixed_ratio, variable_ratio, allocation_method_code, rule_version, status, approved_by, approved_at, valid_from)
SELECT a.erp_account_id, v.beh, v.fr, v.vr, v.m, 'v1', 'APPROVED', 'budget_office', now(), '2500-01-01'
  FROM erp_account a
  JOIN (VALUES
    ('10001','FIXED'::cost_behavior,        1.0, 0.0, 'STUDENT_HEADCOUNT'::alloc_method),
    ('41001','VARIABLE'::cost_behavior,     0.0, 1.0, 'ACTUAL_USAGE'::alloc_method),
    ('80001','MIXED'::cost_behavior,        0.5, 0.5, 'STUDENT_HEADCOUNT'::alloc_method),
    -- ★ แก้ #1: เดิม CHECK ของ MANUS ทำให้แถวนี้แทรกไม่ได้เลย
    ('40010','UNCLASSIFIED'::cost_behavior, 0.0, 0.0, 'PROGRAM_SHARE'::alloc_method)
  ) v(sub, beh, fr, vr, m) ON v.sub = a.subcategory_code;

-- เงินสมทบรายหัว 100 บาท/คน
INSERT INTO per_student_charge (charge_type, period_id, rate_per_student, rate_basis)
SELECT 'university_contribution', period_id, 100, 'per_term' FROM dim_period;

-- driver: headcount 100/50/10 · actual usage 1/1/1 · program_share ไม่มีเลย (ทดสอบ #4)
INSERT INTO allocation_driver_value (period_id, org_unit_id, program_version_id, driver_code, driver_value)
SELECT p.period_id, f.org_unit_id, pv.program_version_id, d.code,
       CASE d.code WHEN 'STUDENT_HEADCOUNT'
            THEN CASE pr.program_code WHEN 'P01' THEN 100 WHEN 'P02' THEN 50 ELSE 10 END
            ELSE 1 END
  FROM dim_period p, org_unit f, program_version pv JOIN program pr USING (program_id),
       (VALUES ('STUDENT_HEADCOUNT'::alloc_method),('ACTUAL_USAGE'::alloc_method)) d(code)
 WHERE f.org_code = 'F01';

-- ต้นทุนต้นทาง
INSERT INTO cost_source (import_batch_id, source_record_id, source_type, period_id, org_unit_id, erp_account_id, program_version_id, amount)
SELECT b.import_batch_id, v.rec, 'ERP', p.period_id, f.org_unit_id, a.erp_account_id,
       CASE WHEN v.direct_to IS NULL THEN NULL
            ELSE (SELECT pv.program_version_id FROM program_version pv JOIN program pr USING (program_id)
                   WHERE pr.program_code = v.direct_to) END,
       v.amt
  FROM import_batch b, dim_period p, org_unit f,
  LATERAL (VALUES
    ('C1','10001','P01', 1000000.00),   -- direct fixed
    ('C2','10001', NULL,     100.00),   -- ปันส่วนลงตัวพอดี
    ('C3','41001', NULL,      10.00),   -- 10 ÷ 3 → ทดสอบการปัดเศษ (#3)
    ('C4','80001', NULL,    1000.01),   -- MIXED 50/50 → ต้องได้ 2 แถว (#2)
    ('C5','10001', NULL,    -250.00),   -- ยอดติดลบ (#6)
    ('C6','40010', NULL,      77.77),   -- UNCLASSIFIED + ไม่มี driver (#1, #4)
    ('C7','40099', NULL,      50.00),   -- ไม่มีกติกาเลย → UNCLASSIFIED
    ('C8','41001','P03',  100000.00)    -- direct variable ก้อนใหญ่ → ทำให้ P03 มี CM < 0
  ) v(rec, sub, direct_to, amt)
  JOIN erp_account a ON a.subcategory_code = v.sub
 WHERE f.org_code = 'F01';

INSERT INTO allocation_run (period_id, org_unit_id, basis, rule_version, created_by, tolerance)
SELECT p.period_id, f.org_unit_id, 'ACTUAL', 'v1', 'analyst', 0.00
  FROM dim_period p, org_unit f WHERE f.org_code='F01';

-- ─────────────────────────── รัน ───────────────────────────
-- CALL ไม่รับ subquery เป็นอาร์กิวเมนต์ ต้องผ่านตัวแปรใน DO block
DO $$
DECLARE v_run bigint := (SELECT max(allocation_run_id) FROM allocation_run);
BEGIN
  CALL run_cost_allocation(v_run, 'analyst');
  CALL compute_break_even(v_run);
END $$;

-- ─────────────────────────── ตรวจผล ───────────────────────────
\echo ''
\echo '=============== ผลการทดสอบ ==============='

DO $$
DECLARE
  v_run bigint := (SELECT max(allocation_run_id) FROM allocation_run);
  v_status run_status;
  v_recon record;
  n int; a numeric; b numeric;
BEGIN
  SELECT status INTO v_status FROM allocation_run WHERE allocation_run_id = v_run;
  IF v_status <> 'CALCULATED' THEN
    RAISE EXCEPTION 'FAIL: run status = % (คาดว่า CALCULATED)', v_status;
  END IF;
  RAISE NOTICE 'PASS  run สถานะ CALCULATED';

  -- #3 reconciliation ต้องตรงพอดี ไม่ใช่แค่อยู่ใน tolerance
  SELECT * INTO v_recon FROM reconciliation_control WHERE allocation_run_id = v_run;
  IF v_recon.status <> 'PASS' OR v_recon.difference <> 0 THEN
    RAISE EXCEPTION 'FAIL #3: reconciliation % ต่าง % (ต้นทาง % / ปันส่วน %)',
      v_recon.status, v_recon.difference, v_recon.source_total, v_recon.allocated_total;
  END IF;
  RAISE NOTICE 'PASS  #3 ปัดเศษ — ยอดปันส่วน % ตรงกับต้นทาง % พอดี (ต่าง 0.00)',
    v_recon.allocated_total, v_recon.source_total;

  -- #2 MIXED ต้องแตกเป็น FIXED + VARIABLE และรวมได้เท่ายอดเดิม
  SELECT count(DISTINCT behavior), sum(allocated_amount) INTO n, a
    FROM allocation_result r JOIN cost_source c USING (cost_source_id)
   WHERE r.allocation_run_id = v_run AND c.source_record_id = 'C4';
  IF n <> 2 OR a <> 1000.01 THEN
    RAISE EXCEPTION 'FAIL #2: MIXED แตกเป็น % ประเภท รวม % (คาด 2 ประเภท รวม 1000.01)', n, a;
  END IF;
  RAISE NOTICE 'PASS  #2 MIXED 50/50 แตกเป็น 2 pool รวม % ตรงยอดเดิม', a;

  -- #4 ไม่มี driver → ต้องมีแถว MISSING_DRIVER และยอดไม่หาย
  SELECT count(*), COALESCE(sum(allocated_amount),0) INTO n, a
    FROM allocation_result WHERE allocation_run_id = v_run AND flag = 'MISSING_DRIVER';
  IF n = 0 OR a <> 77.77 THEN
    RAISE EXCEPTION 'FAIL #4: MISSING_DRIVER % แถว ยอด % (คาด 1 แถว 77.77)', n, a;
  END IF;
  RAISE NOTICE 'PASS  #4 ต้นทุนที่ไม่มี driver ถูกเก็บเป็น MISSING_DRIVER % บาท ไม่หายเงียบ', a;

  -- #6 ยอดติดลบปันส่วนได้และรวมตรง
  SELECT sum(allocated_amount) INTO a
    FROM allocation_result r JOIN cost_source c USING (cost_source_id)
   WHERE r.allocation_run_id = v_run AND c.source_record_id = 'C5';
  IF a <> -250.00 THEN RAISE EXCEPTION 'FAIL #6: ยอดติดลบรวม % (คาด -250.00)', a; END IF;
  RAISE NOTICE 'PASS  #6 รายการติดลบปันส่วนได้ รวม % ตรงยอดเดิม', a;

  -- ทุก cost_source ต้องมีผลรวมตรงกับยอดตั้งต้นของตัวเอง
  SELECT count(*) INTO n FROM (
    SELECT c.cost_source_id
      FROM cost_source c
      JOIN allocation_result r USING (cost_source_id)
     WHERE r.allocation_run_id = v_run
     GROUP BY c.cost_source_id, c.amount
    HAVING sum(r.allocated_amount) <> c.amount
  ) x;
  IF n > 0 THEN RAISE EXCEPTION 'FAIL: มี % รายการที่ผลรวมปันส่วนไม่ตรงยอดตั้งต้น', n; END IF;
  RAISE NOTICE 'PASS  ทุกรายการต้นทุนปันส่วนแล้วรวมตรงยอดตั้งต้นรายตัว';

  -- BEP: P01 ฐานรวมเงินแผ่นดิน
  SELECT q_star INTO a FROM break_even_result r
    JOIN program_version pv ON pv.program_version_id = r.scope_id
    JOIN program pr USING (program_id)
   WHERE r.allocation_run_id = v_run AND r.scope='program'
     AND pr.program_code='P01' AND r.revenue_mode='with_government';
  IF a <> 78 THEN RAISE EXCEPTION 'FAIL: Q* ของ P01 = % (คำนวณมือได้ 78)', a; END IF;
  RAISE NOTICE 'PASS  สูตร 1 — Q* ของ P01 = % ตรงกับที่คำนวณมือ', a;

  -- สูตร 7: P03 ต้อง CM <= 0 ทั้งสองฐานรายได้
  SELECT count(*) INTO n FROM break_even_result r
    JOIN program_version pv ON pv.program_version_id = r.scope_id
    JOIN program pr USING (program_id)
   WHERE r.allocation_run_id = v_run AND r.scope='program'
     AND pr.program_code='P03' AND r.q_star_status='full_cost_recovery';
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL: P03 ควรเป็น full_cost_recovery ทั้ง 2 ฐานรายได้ แต่ได้ % แถว', n; END IF;
  RAISE NOTICE 'PASS  สูตร 7 — P03 (AVC > R) ได้สถานะ full_cost_recovery ทั้ง 2 ฐานรายได้';

  -- ต้องมีผลครบ 2 ฐานรายได้ทุกหลักสูตร
  SELECT count(*) INTO n FROM break_even_result
   WHERE allocation_run_id = v_run AND scope='program';
  IF n <> 6 THEN RAISE EXCEPTION 'FAIL: ผลระดับหลักสูตร % แถว (คาด 3 หลักสูตร × 2 ฐานรายได้ = 6)', n; END IF;
  RAISE NOTICE 'PASS  สูตร 5a/5b — ได้ผลครบ 2 ฐานรายได้ทุกหลักสูตร (% แถว)', n;

  -- สูตร 6a/6b: ระดับคณะต้องมีทั้ง 2 วิธี และให้ผลต่างกัน
  SELECT max(q_star) FILTER (WHERE q_star_method='sum_of_programs'),
         max(q_star) FILTER (WHERE q_star_method='pooled')
    INTO a, b
    FROM break_even_result
   WHERE allocation_run_id = v_run AND scope='faculty' AND revenue_mode='with_government';
  IF a IS NULL OR b IS NULL THEN
    RAISE EXCEPTION 'FAIL: ระดับคณะต้องมี Q* ทั้ง 2 วิธี (ได้ sum=% pooled=%)', a, b;
  END IF;
  RAISE NOTICE 'PASS  สูตร 6a/6b — ระดับคณะ Q* แบบรวมรายหลักสูตร = % · แบบยอดรวม = %', a, b;

  RAISE NOTICE '';
  RAISE NOTICE 'ผ่านทั้งหมด';
END $$;

-- #1 และ #5 ทดสอบแยก เพราะต้องดูว่า constraint ทำงานถูกทาง
\echo ''
\echo '--- #1 แทรกกติกา UNCLASSIFIED (MANUS เดิมทำไม่ได้) ---'
SELECT CASE WHEN count(*) = 1 THEN 'PASS  แทรก UNCLASSIFIED สำเร็จ'
            ELSE 'FAIL  ไม่พบกติกา UNCLASSIFIED' END AS result
  FROM account_behavior_rule WHERE behavior = 'UNCLASSIFIED';

\echo ''
\echo '--- #5 กติกาที่อนุมัติแล้วห้ามซ้อนช่วงเวลา (คาดว่าต้อง error) ---'
DO $$
BEGIN
  INSERT INTO account_behavior_rule
    (erp_account_id, behavior, fixed_ratio, variable_ratio, rule_version, status, approved_by, approved_at, valid_from, valid_to)
  SELECT erp_account_id, 'VARIABLE', 0, 1, 'v2', 'APPROVED', 'other', now(), '2560-01-01', '2600-01-01'
    FROM erp_account WHERE subcategory_code = '10001';
  RAISE EXCEPTION 'FAIL #5: แทรกกติกาที่ซ้อนช่วงเวลาได้ ทั้งที่ควรถูกปฏิเสธ';
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'PASS  #5 ระบบปฏิเสธกติกาที่ช่วงเวลาคาบเกี่ยวกันถูกต้อง';
END $$;

\echo ''
\echo '=============== สรุปตัวเลข ==============='
SELECT c.source_record_id AS "รายการ", c.amount AS "ยอดตั้งต้น",
       sum(r.allocated_amount) AS "ปันส่วนรวม",
       count(*) AS "แถว",
       string_agg(DISTINCT r.flag::text, ',') AS "ธง"
  FROM cost_source c JOIN allocation_result r USING (cost_source_id)
 WHERE r.allocation_run_id = (SELECT max(allocation_run_id) FROM allocation_run)
 GROUP BY c.source_record_id, c.amount ORDER BY c.source_record_id;

SELECT pr.program_code AS "หลักสูตร", r.revenue_mode AS "ฐานรายได้",
       r.q_actual AS "Q", r.tr AS "TR", r.tc AS "TC",
       round(r.r_per_head,2) AS "R/หัว", round(r.avc,2) AS "AVC",
       r.q_star AS "Q*", r.q_star_status AS "สถานะ"
  FROM break_even_result r
  JOIN program_version pv ON pv.program_version_id = r.scope_id
  JOIN program pr USING (program_id)
 WHERE r.allocation_run_id = (SELECT max(allocation_run_id) FROM allocation_run)
   AND r.scope = 'program'
 ORDER BY pr.program_code, r.revenue_mode;
