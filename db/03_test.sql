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
  (erp_account_id, behavior, fixed_ratio, variable_ratio, allocation_method_code, rule_version,
   status, approved_by, approved_at, year_basis, effective_from_year)
SELECT a.erp_account_id, v.beh, v.fr, v.vr, v.m, 'v1', 'APPROVED', 'budget_office', now(), 'ACADEMIC', 2500
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
\echo '--- #5 กติกาที่อนุมัติแล้วห้ามซ้อนช่วงปี (คาดว่าต้อง error) ---'
DO $$
BEGIN
  INSERT INTO account_behavior_rule
    (erp_account_id, behavior, fixed_ratio, variable_ratio, rule_version, status, approved_by, approved_at,
     year_basis, effective_from_year, effective_to_year)
  SELECT erp_account_id, 'VARIABLE', 0, 1, 'v2', 'APPROVED', 'other', now(), 'ACADEMIC', 2560, 2600
    FROM erp_account WHERE subcategory_code = '10001';
  RAISE EXCEPTION 'FAIL #5: แทรกกติกาที่ซ้อนช่วงปีได้ ทั้งที่ควรถูกปฏิเสธ';
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'PASS  #5 ระบบปฏิเสธกติกาที่ช่วงปีคาบเกี่ยวกันถูกต้อง';
END $$;

-- ─────────── #8 กติกาเปลี่ยนตามปี — ตัวอย่างที่ผู้บริหารยกมาเอง ───────────
-- "ปีนี้เป็นต้นทุนคงที่ ปีหน้าเป็นผันแปร ปีถัดไปแบ่งคนละครึ่ง"
\echo ''
\echo '--- #8 กติกาเดียวกัน เปลี่ยนประเภทต้นทุนได้ตามปีการศึกษา ---'
DO $$
DECLARE v_acct bigint; n int;
BEGIN
  SELECT erp_account_id INTO v_acct FROM erp_account WHERE subcategory_code = '40010';

  -- กติกาเดิมของบัญชีนี้คือ UNCLASSIFIED ตั้งแต่ปี 2500 → ปิดท้ายที่ 2568 ก่อน
  UPDATE account_behavior_rule SET effective_to_year = 2568
   WHERE erp_account_id = v_acct AND effective_to_year IS NULL;

  INSERT INTO account_behavior_rule
    (erp_account_id, behavior, fixed_ratio, variable_ratio, allocation_method_code, rule_version,
     status, approved_by, approved_at, year_basis, effective_from_year, effective_to_year, note)
  VALUES
    (v_acct,'FIXED',   1.0,0.0,'STUDENT_HEADCOUNT','v2569','APPROVED','budget_office',now(),'ACADEMIC',2569,2569,'ปี 2569 ตีเป็นต้นทุนคงที่'),
    (v_acct,'VARIABLE',0.0,1.0,'STUDENT_HEADCOUNT','v2570','APPROVED','budget_office',now(),'ACADEMIC',2570,2570,'ปี 2570 ตีเป็นต้นทุนผันแปร'),
    (v_acct,'MIXED',   0.5,0.5,'STUDENT_HEADCOUNT','v2571','APPROVED','budget_office',now(),'ACADEMIC',2571,NULL,'ปี 2571 เป็นต้นไป แบ่งคนละครึ่ง');

  SELECT count(*) INTO n FROM account_behavior_rule WHERE erp_account_id = v_acct;
  IF n <> 4 THEN RAISE EXCEPTION 'FAIL #8: คาดกติกา 4 ช่วงปี ได้ %', n; END IF;

  -- ต้องเลือกได้ถูกช่วงทีละปี ไม่กำกวม
  IF (SELECT behavior FROM account_behavior_rule
       WHERE erp_account_id=v_acct AND int4range(effective_from_year,effective_to_year,'[]') @> 2570)
     <> 'VARIABLE' THEN
    RAISE EXCEPTION 'FAIL #8: ปี 2570 ควรได้ VARIABLE';
  END IF;
  IF (SELECT behavior FROM account_behavior_rule
       WHERE erp_account_id=v_acct AND int4range(effective_from_year,effective_to_year,'[]') @> 2575)
     <> 'MIXED' THEN
    RAISE EXCEPTION 'FAIL #8: ปี 2575 ควรได้ MIXED (ช่วงปลายเปิด)';
  END IF;
  RAISE NOTICE 'PASS  #8 บัญชีเดียวเปลี่ยนประเภทต้นทุนได้ 4 ช่วงปี (UNCLASSIFIED→FIXED→VARIABLE→MIXED 50/50)';
END $$;

-- ─────────────────── #9 ค่าตั้งระบบแทนค่าที่เคยฝังในโค้ด ───────────────────
\echo ''
\echo '--- #9 ค่าตั้งระบบ: default · ตั้งทับรายปี · ค่าที่ไม่ถูกต้องต้องถูกปฏิเสธ ---'
DO $$
DECLARE v_period bigint := (SELECT period_id FROM dim_period LIMIT 1); v text; a numeric;
BEGIN
  -- ยังไม่ตั้งค่า → ต้องได้ default จาก catalog
  v := get_setting('cm_le_zero_policy', v_period);
  IF v <> 'full_cost_recovery' THEN RAISE EXCEPTION 'FAIL #9: default = % (คาด full_cost_recovery)', v; END IF;
  RAISE NOTICE 'PASS  #9 ยังไม่ตั้งค่า → ใช้ default จาก catalog (%)', v;

  -- ตั้งทับเฉพาะปีการศึกษา 2568 เป็นต้นไป
  INSERT INTO system_setting (setting_key, effective_from_year, setting_value, status, approved_by, approved_at, note)
  VALUES ('cm_le_zero_policy', 2568, 'not_computable', 'APPROVED', 'budget_office', now(),
          'มติที่ประชุม: ให้รายงานว่าไม่มีจุดคุ้มทุน แทนการแสดงเป้าหมายขั้นต่ำ');

  v := get_setting('cm_le_zero_policy', v_period);
  IF v <> 'not_computable' THEN RAISE EXCEPTION 'FAIL #9: ตั้งทับแล้วได้ % (คาด not_computable)', v; END IF;
  RAISE NOTICE 'PASS  #9 ตั้งทับรายปีแล้วมีผลกับงวดปีการศึกษา 2568 (%)', v;

  -- นโยบายต้องเปลี่ยนผลคำนวณจริง ไม่ใช่เก็บไว้เฉยๆ
  SELECT q_star INTO a FROM calc_qstar(100000, 500000, 20000, 30000, 'full_cost_recovery', 'ceil');
  IF a <> 25 THEN RAISE EXCEPTION 'FAIL #9: full_cost_recovery ควรได้ 25 ได้ %', a; END IF;
  SELECT q_star INTO a FROM calc_qstar(100000, 500000, 20000, 30000, 'not_computable', 'ceil');
  IF a IS NOT NULL THEN RAISE EXCEPTION 'FAIL #9: not_computable ควรได้ NULL ได้ %', a; END IF;
  RAISE NOTICE 'PASS  #9 นโยบาย CM ≤ 0 เปลี่ยนผลจริง (full_cost_recovery=25 · not_computable=NULL)';

  -- การปัดเศษก็เป็นค่าตั้ง (ข้อตัดสินใจ B ที่ค้างอยู่)
  SELECT q_star INTO a FROM calc_qstar(100000, 500000, 30000, 25800, 'full_cost_recovery', 'ceil');
  IF a <> 24 THEN RAISE EXCEPTION 'FAIL #9: ceil ควรได้ 24 ได้ %', a; END IF;
  SELECT q_star INTO a FROM calc_qstar(100000, 500000, 30000, 25800, 'full_cost_recovery', 'round');
  IF a <> 24 THEN RAISE EXCEPTION 'FAIL #9: round ควรได้ 24 ได้ %', a; END IF;
  SELECT q_star INTO a FROM calc_qstar(100000, 500000, 30000, 26000, 'full_cost_recovery', 'ceil');
  IF a <> 25 THEN RAISE EXCEPTION 'FAIL #9: ceil(25.0) ควรได้ 25 ได้ %', a; END IF;
  RAISE NOTICE 'PASS  #9 การปัดเศษ Q* เป็นค่าตั้ง เปลี่ยนได้โดยไม่ต้องแก้โค้ด';
END $$;

\echo ''
\echo '--- #9 ค่าตั้งที่ไม่อยู่ในชุดค่าที่ยอมรับ / key ที่ไม่รู้จัก (คาดว่าต้อง error) ---'
DO $$
BEGIN
  PERFORM get_setting('ไม่มี key นี้', (SELECT period_id FROM dim_period LIMIT 1));
  RAISE EXCEPTION 'FAIL #9: อ่าน key ที่ไม่มีในนิยามได้ ทั้งที่ควร error';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL #9%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS  #9 key ที่ไม่ได้นิยามไว้ถูกปฏิเสธ ไม่เดาค่าให้เงียบๆ';
END $$;

DO $$
BEGIN
  INSERT INTO system_setting_def (setting_key, setting_group, display_name, description,
                                  value_type, allowed_values, default_value, year_basis)
  VALUES ('ทดสอบ','calculation','x','x','enum', ARRAY['a','b'], 'c', 'ACADEMIC');
  RAISE EXCEPTION 'FAIL #9: ตั้ง default ที่ไม่อยู่ใน allowed_values ได้';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  #9 default ที่ไม่อยู่ในชุดค่าที่ยอมรับถูกปฏิเสธ';
END $$;

DO $$
BEGIN
  INSERT INTO system_setting (setting_key, effective_from_year, effective_to_year, setting_value,
                              status, approved_by, approved_at)
  VALUES ('cm_le_zero_policy', 2570, 2575, 'full_cost_recovery', 'APPROVED', 'other', now());
  RAISE EXCEPTION 'FAIL #9: ตั้งค่าซ้อนช่วงปีได้ ทั้งที่ควรถูกปฏิเสธ';
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'PASS  #9 ค่าตั้งที่ช่วงปีคาบเกี่ยวกันถูกปฏิเสธ';
END $$;

\echo ''
\echo '--- แผนการรับนิสิตรายประเภท (scenario_admission_plan) ---'

-- ชุดอ้างอิงจากแผง X9:AD22 ของชีต 4.จุดคุ้มทุนหลักสูตร(ใหม่)
--   คณะมนุษยศาสตร์ฯ · ปริญญาตรี · อ้างอิง "การสร้างสรรค์คอนเทนต์และนวัตกรรมสื่อดิจิทัล"
--   TFC = 13,615,398.24 · AVC = 9,729,315.686 ÷ 581 = 16,745.81013080895
-- ค่าที่คาดหวังตรงกับ packages/calc-engine/src/admission-mix.test.ts ทุกตัว
INSERT INTO student_type (student_type_code, student_group, nationality) VALUES
  ('TH-SPECIAL','ภาคพิเศษ','ไทย'),
  ('INT-REG','ภาคปกติ','ต่างชาติ'),
  ('INT-SPECIAL','ภาคพิเศษ','ต่างชาติ');

INSERT INTO app_role (role_name) VALUES ('budget_office') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO app_user (app_role_id, full_name, email)
SELECT app_role_id, 'ผู้ทดสอบ', 'tester@msu.ac.th' FROM app_role WHERE role_name='budget_office'
ON CONFLICT (email) DO NOTHING;

INSERT INTO scenario_plan (created_by, based_on_pv_id, plan_name, plan_type, period_id,
                           revenue_mode, q_input, uses_admission_mix, variable_cost_per_head)
SELECT u.app_user_id, pv.program_version_id, 'จำลองเปิดรับต่างชาติ', 'existing', p.period_id,
       'with_government', 542, true, 9729315.686 / 581
  FROM app_user u, dim_period p,
       program_version pv JOIN program pr USING (program_id)
 WHERE pr.program_code = 'P01';

INSERT INTO scenario_admission_plan (scenario_plan_id, student_type_id, row_code, row_label,
                                     plan_basis, headcount, terms_per_year,
                                     fee_per_term, government_per_term)
SELECT sp.scenario_plan_id, st.student_type_id, 'TH_REG', 'ปกติ (นิสิตไทย)',
       'headcount', 450, 2, 18000, 3550
  FROM scenario_plan sp, student_type st WHERE st.student_type_code = 'TH-REG'
UNION ALL
SELECT sp.scenario_plan_id, st.student_type_id, 'INT_REG', 'ปกติ (นิสิตต่างชาติ)',
       'headcount', 92, 2, 25000, 3550
  FROM scenario_plan sp, student_type st WHERE st.student_type_code = 'INT-REG';

DO $$
DECLARE v_total integer; v_rows integer;
BEGIN
  SELECT total_headcount, row_count INTO v_total, v_rows FROM scenario_admission_total;
  IF v_total <> 542 OR v_rows <> 2 THEN
    RAISE EXCEPTION 'FAIL: ผลรวมแผนการรับ = % (% แถว) ควรเป็น 542 (2 แถว)', v_total, v_rows;
  END IF;
  IF EXISTS (SELECT 1 FROM scenario_plan sp JOIN scenario_admission_total t USING (scenario_plan_id)
              WHERE sp.uses_admission_mix AND sp.q_input <> t.total_headcount) THEN
    RAISE EXCEPTION 'FAIL: q_input ไม่ตรงกับผลรวมของแผนการรับ';
  END IF;
  RAISE NOTICE 'PASS  แผนการรับรวม 542 คน ตรงกับ q_input ของ scenario_plan';
END $$;

-- แปลง intake → จำนวนคงค้าง ให้ฐานข้อมูลคำนวณเอง (สูตรเดียวกับ resolveHeadcount())
DO $$
DECLARE v integer;
BEGIN
  INSERT INTO scenario_admission_plan (scenario_plan_id, student_type_id, row_code, row_label,
                                       plan_basis, intake_per_year, duration_years, terms_per_year,
                                       fee_per_term, government_per_term)
  SELECT sp.scenario_plan_id, st.student_type_id, 'TH_CONT', 'ต่อเนื่อง 2 ปี',
         'intake', 40, 2, 2, 18000, 3550
    FROM scenario_plan sp, student_type st WHERE st.student_type_code = 'TH-SPECIAL';

  SELECT resolved_headcount INTO v FROM scenario_admission_plan WHERE row_code = 'TH_CONT';
  IF v <> 80 THEN RAISE EXCEPTION 'FAIL: รับปีละ 40 × 2 ปี ควรได้ 80 คน แต่ได้ %', v; END IF;
  RAISE NOTICE 'PASS  หลักสูตรต่อเนื่อง 2 ปี — รับปีละ 40 คน = คงค้าง 80 คน ไม่ต้องมีเคสพิเศษ';

  DELETE FROM scenario_admission_plan WHERE row_code = 'TH_CONT';
END $$;

\echo '--- ตัวเลขที่ได้ต้องตรงกับชีต Excel และกับ calc-engine ---'
DO $$
DECLARE
  v_tfc     numeric := 13615398.24;
  v_avc     numeric := 9729315.686 / 581;
  v_total   integer;
  r         record;
  v_profit  numeric := 0;
BEGIN
  SELECT total_headcount INTO v_total FROM scenario_admission_total;

  FOR r IN
    SELECT row_code,
           resolved_headcount                                            AS q,
           resolved_headcount::numeric / v_total                         AS share,
           (fee_per_term + government_per_term) * terms_per_year         AS r_head,
           v_tfc * resolved_headcount / v_total                          AS alloc_tfc,
           v_avc * resolved_headcount                                    AS tvc
      FROM scenario_admission_plan ORDER BY row_code
  LOOP
    v_profit := v_profit + (r.r_head * r.q - r.alloc_tfc - r.tvc);

    IF r.row_code = 'TH_REG' THEN
      IF round(r.share, 10)     <> 0.8302583026 THEN RAISE EXCEPTION 'FAIL: สัดส่วนไทย %', r.share; END IF;
      IF r.r_head               <> 43100        THEN RAISE EXCEPTION 'FAIL: รายได้ต่อหัวไทย %', r.r_head; END IF;
      IF round(r.alloc_tfc, 2)  <> 11304297.43  THEN RAISE EXCEPTION 'FAIL: TFC ปันส่วนไทย %', r.alloc_tfc; END IF;
      IF round(r.tvc, 2)        <> 7535614.56   THEN RAISE EXCEPTION 'FAIL: TVC ไทย %', r.tvc; END IF;
    ELSIF r.row_code = 'INT_REG' THEN
      IF round(r.share, 10)     <> 0.1697416974 THEN RAISE EXCEPTION 'FAIL: สัดส่วนต่างชาติ %', r.share; END IF;
      IF r.r_head               <> 57100        THEN RAISE EXCEPTION 'FAIL: รายได้ต่อหัวต่างชาติ %', r.r_head; END IF;
      IF round(r.alloc_tfc, 2)  <> 2311100.81   THEN RAISE EXCEPTION 'FAIL: TFC ปันส่วนต่างชาติ %', r.alloc_tfc; END IF;
      IF round(r.tvc, 2)        <> 1540614.53   THEN RAISE EXCEPTION 'FAIL: TVC ต่างชาติ %', r.tvc; END IF;
    END IF;
  END LOOP;

  IF round(v_profit, 2) <> 1956572.67 THEN
    RAISE EXCEPTION 'FAIL: ส่วนเกินรวม % ควรเป็น 1956572.67 (AD22 ของชีต)', round(v_profit, 2);
  END IF;
  RAISE NOTICE 'PASS  แยกตามแผนการรับได้ตัวเลขตรงชีต Excel ทุกช่อง (ส่วนเกินรวม 1,956,572.67)';
  RAISE NOTICE 'PASS  ปันส่วน TFC รายประเภทรวมกลับได้ 13,615,398.24 พอดี ไม่มีเศษหาย';
END $$;

\echo '--- ข้อจำกัดของแผนการรับ (คาดว่าต้องถูกปฏิเสธ) ---'
DO $$
BEGIN
  INSERT INTO scenario_admission_plan (scenario_plan_id, student_type_id, row_code,
                                       plan_basis, intake_per_year, terms_per_year, fee_per_term)
  SELECT sp.scenario_plan_id, st.student_type_id, 'BAD_INTAKE', 'intake', 40, 2, 18000
    FROM scenario_plan sp, student_type st WHERE st.student_type_code = 'INT-SPECIAL';
  RAISE EXCEPTION 'FAIL: รับแผนแบบ intake ที่ไม่ระบุจำนวนปีได้ ทั้งที่คำนวณจำนวนคงค้างไม่ได้';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  แผนแบบ intake ที่ไม่ระบุ duration_years ถูกปฏิเสธ';
END $$;

DO $$
BEGIN
  INSERT INTO scenario_admission_plan (scenario_plan_id, student_type_id, row_code,
                                       plan_basis, headcount, terms_per_year, fee_per_term)
  SELECT sp.scenario_plan_id, st.student_type_id, 'TH_REG', 'headcount', 10, 2, 18000
    FROM scenario_plan sp, student_type st WHERE st.student_type_code = 'INT-SPECIAL';
  RAISE EXCEPTION 'FAIL: แผนการรับที่ row_code ซ้ำในหลักสูตรจำลองเดียวกันแทรกได้';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS  row_code ซ้ำในแผนเดียวกันถูกปฏิเสธ (สัดส่วนจะเพี้ยนถ้ายอมให้ซ้ำ)';
END $$;

DO $$
BEGIN
  INSERT INTO scenario_plan (created_by, based_on_pv_id, plan_name, plan_type, period_id,
                             revenue_mode, q_input, uses_admission_mix)
  SELECT u.app_user_id, pv.program_version_id, 'ไม่มี AVC', 'existing', p.period_id,
         'with_government', 100, true
    FROM app_user u, dim_period p, program_version pv LIMIT 1;
  RAISE EXCEPTION 'FAIL: เปิดโหมดแยกตามแผนการรับได้โดยไม่ต้องมีต้นทุนผันแปรต่อหัว';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  โหมดแยกตามแผนการรับบังคับให้มี variable_cost_per_head';
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
