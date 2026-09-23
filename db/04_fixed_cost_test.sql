-- ============================================================================
-- ชุดทดสอบนโยบายจัดสรรต้นทุนคงที่รายคณะ (มติที่ประชุม · ../FIXED-COST-WORKFLOW.md)
--
-- ต้องรันต่อจาก 03_test.sql (ใช้คณะ F01 · งวด 2568 · หลักสูตร P01–P03 ชุดเดิม)
-- รันด้วย:  psql -v ON_ERROR_STOP=1 -f 04_fixed_cost_test.sql
--
-- ตัวเลขทุกข้อคำนวณมือไว้ในคอมเมนต์ และต้องตรงกับฝั่ง TypeScript
-- (packages/calc-engine/src/fixed-cost-policy.test.ts) ซึ่งใช้ตรรกะเดียวกัน
-- ============================================================================
SET search_path TO beps, public;

-- ─────────────────────────── seed เพิ่ม: หลักสูตร ป.โท ───────────────────────────
-- คณะทดสอบเดิมมีแต่ ป.ตรี จึงยังไม่เห็นปัญหาที่มติกำลังแก้ (หลักสูตรเล็กรับภาระเกินจริง)
INSERT INTO org_unit (parent_org_unit_id, org_code, org_name, org_level, valid_from)
  SELECT org_unit_id, 'F01-GR', 'คณะทดสอบ / บัณฑิตศึกษา', 'EDUCATION_LEVEL', '2500-01-01'
    FROM org_unit WHERE org_code='F01';

INSERT INTO program (program_code, program_name, org_unit_id, degree_level)
  SELECT 'P04', 'หลักสูตรปริญญาโท', org_unit_id, 'ปริญญาโท' FROM org_unit WHERE org_code='F01-GR';

INSERT INTO program_version (program_id, curriculum_version, valid_from)
  SELECT program_id, '2565', '2565-01-01' FROM program WHERE program_code='P04';

-- ภาคพิเศษถ่วงน้ำหนัก 0.5 → นิสิต 20 คน = FTES 10 (พิสูจน์ว่า FTES ≠ การนับหัว)
INSERT INTO student_type (student_type_code, student_group, nationality, ftes_weight)
VALUES ('TH-SPECIAL','ภาคพิเศษ','ไทย', 0.5);

INSERT INTO registration_snapshot
  (import_batch_id, period_id, program_version_id, student_type_id, snapshot_date, student_count)
SELECT b.import_batch_id, p.period_id, pv.program_version_id, st.student_type_id, '2568-07-01', 20
  FROM import_batch b, dim_period p, student_type st, program_version pv
  JOIN program pr USING (program_id)
 WHERE pr.program_code='P04' AND st.student_type_code='TH-SPECIAL';

INSERT INTO budget_allocation (program_version_id, period_id, category, approved_amount)
SELECT pv.program_version_id, p.period_id, v.cat, v.amt
  FROM dim_period p, program_version pv JOIN program pr USING (program_id),
  LATERAL (VALUES ('10_govt'::budget_category, 200000), ('20_income'::budget_category, 400000)) v(cat, amt)
 WHERE pr.program_code='P04';

\echo ''
\echo '=============== ทดสอบนโยบายต้นทุนคงที่ ==============='

-- ─────────────────── 1. FTES ถ่วงน้ำหนักถูกต้อง ───────────────────
DO $$
DECLARE v_org bigint := (SELECT org_unit_id FROM org_unit WHERE org_code='F01');
        v_per bigint := (SELECT period_id FROM dim_period LIMIT 1);
        n int; v_gr numeric; v_total numeric;
BEGIN
  SELECT count(*), sum(ftes) INTO n, v_total FROM program_ftes(v_per, v_org);
  SELECT f.ftes INTO v_gr
    FROM program_ftes(v_per, v_org) f
    JOIN program_version pv USING (program_version_id)
    JOIN program pr USING (program_id) WHERE pr.program_code='P04';

  IF n <> 4 THEN RAISE EXCEPTION 'FAIL: program_ftes ได้ % หลักสูตร (คาด 4)', n; END IF;
  -- 100 + 50 + 10 (ภาคปกติ น้ำหนัก 1) + 20×0.5 = 170
  IF v_total <> 170 THEN RAISE EXCEPTION 'FAIL: FTES รวม = % (คาด 170)', v_total; END IF;
  IF v_gr <> 10 THEN RAISE EXCEPTION 'FAIL: FTES ของ ป.โท = % (คาด 10 จากนิสิต 20 คน × 0.5)', v_gr; END IF;
  RAISE NOTICE 'PASS  FTES ถ่วงน้ำหนักตามประเภทนิสิต — ป.โท 20 คน = FTES 10 (ไม่ใช่ 20)';
END $$;

-- ─────────────────── 2. ค่า driver ของทั้ง 3 วิธี ───────────────────
-- สร้างนโยบาย 3 ฉบับ (ยังเป็น DRAFT — ตรวจค่า driver ได้โดยไม่ต้องอนุมัติ)
INSERT INTO fixed_cost_policy (org_unit_id, academic_year, cost_pool, method, created_by)
SELECT org_unit_id, 2568, 'ALL', 'PER_HEAD_FTES', 'faculty_officer' FROM org_unit WHERE org_code='F01';

INSERT INTO fixed_cost_policy (org_unit_id, academic_year, cost_pool, method, created_by)
SELECT org_unit_id, 2568, 'ALL', 'EQUAL_PROGRAM', 'faculty_officer' FROM org_unit WHERE org_code='F01';

INSERT INTO fixed_cost_policy
  (org_unit_id, academic_year, cost_pool, method, sub_method, bucket_level,
   meeting_ref, rationale, created_by)
SELECT org_unit_id, 2568, 'ALL', 'CUSTOM_PCT', 'PER_HEAD_FTES', 'EDUCATION_LEVEL',
       'มติที่ประชุม 9/2568', 'ป.โท มีนิสิตน้อยแต่ใช้ทรัพยากรร่วม จึงรับภาระคงที่ 10%',
       'faculty_officer'
  FROM org_unit WHERE org_code='F01';

INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct)
SELECT policy_id, v.k, v.p
  FROM fixed_cost_policy, LATERAL (VALUES ('ปริญญาตรี', 90.0), ('ปริญญาโท', 10.0)) v(k,p)
 WHERE method='CUSTOM_PCT';

DO $$
DECLARE v_per bigint := (SELECT period_id FROM dim_period LIMIT 1);
        v_p1 bigint; v_p2 bigint; v_p3 bigint; v_sum numeric; v_val numeric; v_flag quality_flag;
BEGIN
  SELECT policy_id INTO v_p1 FROM fixed_cost_policy WHERE method='PER_HEAD_FTES';
  SELECT policy_id INTO v_p2 FROM fixed_cost_policy WHERE method='EQUAL_PROGRAM';
  SELECT policy_id INTO v_p3 FROM fixed_cost_policy WHERE method='CUSTOM_PCT';

  -- วิธีที่ 1 — ป.โท ได้ 10/170 = 5.88% ทั้งที่มีนิสิต 20 คน
  SELECT d.driver_value INTO v_val FROM fixed_cost_driver_values(v_p1, v_per) d
    JOIN program_version pv USING (program_version_id) JOIN program pr USING (program_id)
   WHERE pr.program_code='P04';
  IF round(v_val, 8) <> round(10.0/170, 8) THEN
    RAISE EXCEPTION 'FAIL: PER_HEAD_FTES ของ ป.โท = % (คาด 10/170)', v_val; END IF;

  SELECT sum(driver_value) INTO v_sum FROM fixed_cost_driver_values(v_p1, v_per);
  IF round(v_sum, 6) <> 1 THEN RAISE EXCEPTION 'FAIL: สัดส่วนรวม = % (คาด 1)', v_sum; END IF;
  RAISE NOTICE 'PASS  วิธีที่ 1 PER_HEAD_FTES — ป.โท ได้ 5.88%% ตาม FTES · รวมทุกหลักสูตร = 1';

  -- วิธีที่ 2 — ทุกหลักสูตรเท่ากัน 25% ไม่ว่ามีนิสิตกี่คน
  SELECT count(DISTINCT driver_value) INTO v_sum FROM fixed_cost_driver_values(v_p2, v_per);
  IF v_sum <> 1 THEN RAISE EXCEPTION 'FAIL: EQUAL_PROGRAM ให้ค่าไม่เท่ากันทุกหลักสูตร'; END IF;
  SELECT driver_value INTO v_val FROM fixed_cost_driver_values(v_p2, v_per) LIMIT 1;
  IF round(v_val, 6) <> 0.25 THEN RAISE EXCEPTION 'FAIL: EQUAL_PROGRAM = % (คาด 0.25)', v_val; END IF;
  RAISE NOTICE 'PASS  วิธีที่ 2 EQUAL_PROGRAM — ทุกหลักสูตรได้ 25%% เท่ากัน';

  -- วิธีที่ 3 — ป.ตรี 90% แบ่งต่อตาม FTES (100:50:10 จาก 160) · ป.โท ได้ 10% เต็ม
  SELECT d.driver_value, d.flag INTO v_val, v_flag FROM fixed_cost_driver_values(v_p3, v_per) d
    JOIN program_version pv USING (program_version_id) JOIN program pr USING (program_id)
   WHERE pr.program_code='P04';
  IF round(v_val, 8) <> 0.1 THEN RAISE EXCEPTION 'FAIL: CUSTOM_PCT ป.โท = % (คาด 0.10)', v_val; END IF;
  IF v_flag <> 'MANUAL_OVERRIDE' THEN
    RAISE EXCEPTION 'FAIL: CUSTOM_PCT ต้องติดธง MANUAL_OVERRIDE ได้ %', v_flag; END IF;

  SELECT d.driver_value INTO v_val FROM fixed_cost_driver_values(v_p3, v_per) d
    JOIN program_version pv USING (program_version_id) JOIN program pr USING (program_id)
   WHERE pr.program_code='P01';
  -- 0.90 × (100/160) = 0.5625
  IF round(v_val, 8) <> 0.5625 THEN
    RAISE EXCEPTION 'FAIL: CUSTOM_PCT P01 = % (คาด 0.5625)', v_val; END IF;

  SELECT sum(driver_value) INTO v_sum FROM fixed_cost_driver_values(v_p3, v_per);
  IF round(v_sum, 6) <> 1 THEN RAISE EXCEPTION 'FAIL: CUSTOM_PCT รวม = % (คาด 1)', v_sum; END IF;
  RAISE NOTICE 'PASS  วิธีที่ 3 CUSTOM_PCT 2 ชั้น — ป.ตรี 90%% แบ่งต่อตาม FTES · ป.โท 10%% เต็ม';
END $$;

-- ─────────────────── 3. กติกาตรวจสอบ V1–V4 ───────────────────
DO $$
DECLARE v_org bigint := (SELECT org_unit_id FROM org_unit WHERE org_code='F01');
        v_per bigint := (SELECT period_id FROM dim_period LIMIT 1);
        v_pol bigint; v_codes text;
BEGIN
  -- V1 — ผลรวมไม่ถึง 100
  INSERT INTO fixed_cost_policy
    (org_unit_id, academic_year, cost_pool, method, bucket_level, meeting_ref, rationale, created_by)
  VALUES (v_org, 2569, 'ALL', 'CUSTOM_PCT', 'EDUCATION_LEVEL', 'ทดสอบ', 'ทดสอบ', 'faculty_officer')
  RETURNING policy_id INTO v_pol;
  INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct)
  VALUES (v_pol, 'ปริญญาตรี', 90), (v_pol, 'ปริญญาโท', 5);

  SELECT string_agg(code, ',' ORDER BY code) INTO v_codes
    FROM fixed_cost_policy_issues(v_pol, v_per);
  IF position('PCT_SUM_NOT_100' in v_codes) = 0 THEN
    RAISE EXCEPTION 'FAIL: V1 ไม่ตรวจจับผลรวม 95%% — ได้ %', v_codes; END IF;
  RAISE NOTICE 'PASS  V1 ผลรวมสัดส่วนไม่ถึง 100%% ถูกปฏิเสธ';

  -- V2 — หลักสูตรที่ไม่อยู่ในกลุ่มใดเลย (ลบบรรทัด ป.โท ออกแล้วตั้ง ป.ตรี = 100)
  DELETE FROM fixed_cost_policy_line WHERE policy_id = v_pol;
  INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct) VALUES (v_pol, 'ปริญญาตรี', 100);
  SELECT string_agg(code, ',' ORDER BY code) INTO v_codes
    FROM fixed_cost_policy_issues(v_pol, v_per);
  IF position('PROGRAM_NOT_COVERED' in v_codes) = 0 THEN
    RAISE EXCEPTION 'FAIL: V2 ไม่ตรวจจับหลักสูตรที่ตกหล่น — ได้ %', v_codes; END IF;
  RAISE NOTICE 'PASS  V2 หลักสูตรที่ไม่ได้อยู่ในกลุ่มใดถูกชี้ออกมา';

  -- V3 — กลุ่มที่ได้สัดส่วนแต่ไม่มีหลักสูตร (ปริญญาเอก)
  DELETE FROM fixed_cost_policy_line WHERE policy_id = v_pol;
  INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct)
  VALUES (v_pol, 'ปริญญาตรี', 85), (v_pol, 'ปริญญาโท', 10), (v_pol, 'ปริญญาเอก', 5);
  SELECT string_agg(code, ',' ORDER BY code) INTO v_codes
    FROM fixed_cost_policy_issues(v_pol, v_per);
  IF position('BUCKET_EMPTY' in v_codes) = 0 THEN
    RAISE EXCEPTION 'FAIL: V3 ไม่ตรวจจับกลุ่มที่ไม่มีหลักสูตร — ได้ %', v_codes; END IF;
  RAISE NOTICE 'PASS  V3 กลุ่มที่ได้สัดส่วนแต่ไม่มีหลักสูตรถูกปฏิเสธ';

  -- V4 — กำหนดสัดส่วนเองแต่ไม่อ้างมติ
  UPDATE fixed_cost_policy SET meeting_ref = NULL WHERE policy_id = v_pol;
  DELETE FROM fixed_cost_policy_line WHERE policy_id = v_pol;
  INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct)
  VALUES (v_pol, 'ปริญญาตรี', 90), (v_pol, 'ปริญญาโท', 10);
  SELECT string_agg(code, ',' ORDER BY code) INTO v_codes
    FROM fixed_cost_policy_issues(v_pol, v_per);
  IF position('POLICY_INCOMPLETE' in v_codes) = 0 THEN
    RAISE EXCEPTION 'FAIL: V4 ไม่บังคับให้อ้างมติ — ได้ %', v_codes; END IF;
  RAISE NOTICE 'PASS  V4 วิธีกำหนดสัดส่วนเองต้องอ้างเลขที่มติและเหตุผล';

  -- นโยบายที่ถูกต้องครบต้องไม่มีข้อทักท้วงเลย
  UPDATE fixed_cost_policy SET meeting_ref='มติที่ประชุม 9/2568' WHERE policy_id = v_pol;
  SELECT count(*) INTO v_pol FROM fixed_cost_policy_issues(v_pol, v_per) WHERE severity='error';
  IF v_pol <> 0 THEN RAISE EXCEPTION 'FAIL: นโยบายที่ถูกต้องยังมี error % ข้อ', v_pol; END IF;
  RAISE NOTICE 'PASS  นโยบายที่กรอกครบผ่านการตรวจทุกข้อ';
END $$;

-- ─────────────────── 4. ธรรมาภิบาล: maker-checker และฉบับซ้อน ───────────────────
DO $$
DECLARE v_org bigint := (SELECT org_unit_id FROM org_unit WHERE org_code='F01'); v_ok bool := false;
BEGIN
  BEGIN
    INSERT INTO fixed_cost_policy
      (org_unit_id, academic_year, cost_pool, method, status,
       submitted_by, submitted_at, approved_by, approved_at, created_by)
    VALUES (v_org, 2570, 'ALL', 'EQUAL_PROGRAM', 'APPROVED',
            'somchai', now(), 'somchai', now(), 'somchai');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: V5 ยอมให้ผู้เสนออนุมัติฉบับของตัวเอง'; END IF;
  RAISE NOTICE 'PASS  V5 ผู้เสนออนุมัติฉบับของตัวเองไม่ได้ (maker-checker)';
END $$;

UPDATE fixed_cost_policy
   SET status='APPROVED', submitted_by='faculty_officer', submitted_at=now(),
       approved_by='budget_office', approved_at=now()
 WHERE method='CUSTOM_PCT' AND academic_year=2568;

DO $$
DECLARE v_org bigint := (SELECT org_unit_id FROM org_unit WHERE org_code='F01'); v_ok bool := false;
BEGIN
  BEGIN
    UPDATE fixed_cost_policy
       SET status='APPROVED', submitted_by='faculty_officer', approved_by='budget_office',
           approved_at=now()
     WHERE method='EQUAL_PROGRAM' AND academic_year=2568;
  EXCEPTION WHEN unique_violation THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: ยอมให้มีนโยบายที่อนุมัติซ้อนกันในปี+คณะ+กลุ่มเดียวกัน'; END IF;
  RAISE NOTICE 'PASS  หนึ่งปี หนึ่งคณะ หนึ่งกลุ่มต้นทุน มีฉบับที่อนุมัติได้ครั้งละหนึ่ง';
END $$;

-- นโยบายที่ยังไม่ผ่านการตรวจต้องอนุมัติไม่ได้ ไม่ใช่แค่เตือนบนหน้าจอ
DO $$
DECLARE v_org bigint := (SELECT org_unit_id FROM org_unit WHERE org_code='F01');
        v_pol bigint; v_ok bool := false;
BEGIN
  INSERT INTO fixed_cost_policy
    (org_unit_id, academic_year, cost_pool, method, bucket_level, meeting_ref, rationale, created_by)
  VALUES (v_org, 2568, 'OFFICE_OVERHEAD', 'CUSTOM_PCT', 'EDUCATION_LEVEL',
          'มติทดสอบ', 'ทดสอบ', 'faculty_officer')
  RETURNING policy_id INTO v_pol;
  -- ผลรวมแค่ 90% และไม่ครอบคลุม ป.โท
  INSERT INTO fixed_cost_policy_line (policy_id, bucket_key, pct) VALUES (v_pol, 'ปริญญาตรี', 90);

  BEGIN
    UPDATE fixed_cost_policy
       SET status='APPROVED', submitted_by='faculty_officer', submitted_at=now(),
           approved_by='budget_office', approved_at=now()
     WHERE policy_id = v_pol;
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;

  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: นโยบายที่ไม่ผ่าน V1/V2 ถูกอนุมัติได้'; END IF;
  DELETE FROM fixed_cost_policy WHERE policy_id = v_pol;
  RAISE NOTICE 'PASS  นโยบายที่ยังไม่ผ่านการตรวจถูกกันไม่ให้อนุมัติที่ระดับฐานข้อมูล';
END $$;

-- ─────────────────── 5. รันจริง: นโยบายมีผลกับ run ───────────────────
INSERT INTO allocation_run (period_id, org_unit_id, basis, rule_version, created_by, tolerance)
SELECT p.period_id, f.org_unit_id, 'ACTUAL', 'v1', 'analyst', 0.00
  FROM dim_period p, org_unit f WHERE f.org_code='F01';

DO $$
DECLARE v_run bigint := (SELECT max(allocation_run_id) FROM allocation_run);
BEGIN
  CALL run_cost_allocation(v_run, 'analyst');
END $$;

DO $$
DECLARE
  v_run   bigint := (SELECT max(allocation_run_id) FROM allocation_run);
  v_prev  bigint := (SELECT max(allocation_run_id) FROM allocation_run
                      WHERE allocation_run_id < (SELECT max(allocation_run_id) FROM allocation_run));
  v_status run_status; v_recon record;
  v_pool numeric; v_gr numeric; n int;
BEGIN
  SELECT status INTO v_status FROM allocation_run WHERE allocation_run_id = v_run;
  IF v_status <> 'CALCULATED' THEN RAISE EXCEPTION 'FAIL: run สถานะ %', v_status; END IF;

  SELECT * INTO v_recon FROM reconciliation_control WHERE allocation_run_id = v_run;
  IF v_recon.status <> 'PASS' OR v_recon.difference <> 0 THEN
    RAISE EXCEPTION 'FAIL: reconcile ไม่ผ่าน ต่าง %', v_recon.difference; END IF;
  RAISE NOTICE 'PASS  เปลี่ยนวิธีหารแล้วยอดรวมยังตรงต้นทางพอดี (ต่าง 0.00)';

  -- ยอดรวมของ run ใหม่ต้องเท่ากับ run เดิมเป๊ะ — เปลี่ยนแค่การกระจายภายในคณะ
  IF (SELECT sum(allocated_amount) FROM allocation_result WHERE allocation_run_id=v_run)
   <> (SELECT sum(allocated_amount) FROM allocation_result WHERE allocation_run_id=v_prev) THEN
    RAISE EXCEPTION 'FAIL: ยอดรวมเปลี่ยนไปหลังใช้นโยบาย'; END IF;
  RAISE NOTICE 'PASS  ยอดรวมต้นทุนของคณะเท่าเดิมทุกบาท — เปลี่ยนเฉพาะการกระจาย';

  -- ต้นทุนคงที่ที่ปันส่วนต้องใช้วิธี CUSTOM_PCT และติดธง MANUAL_OVERRIDE
  SELECT count(*) INTO n FROM allocation_result
   WHERE allocation_run_id=v_run AND behavior='FIXED' AND allocation_method='CUSTOM_PCT';
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: นโยบายไม่ถูกนำมาใช้กับต้นทุนคงที่'; END IF;

  SELECT count(*) INTO n FROM allocation_result
   WHERE allocation_run_id=v_run AND allocation_method='CUSTOM_PCT' AND flag <> 'MANUAL_OVERRIDE';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: มี % แถวที่ใช้สัดส่วนของคณะแต่ไม่ติดธง', n; END IF;
  RAISE NOTICE 'PASS  ต้นทุนคงที่ใช้วิธีตามนโยบายคณะ และติดธง MANUAL_OVERRIDE ทุกแถว';

  -- ต้นทุนผันแปรต้องไม่ถูกแตะ (ยังใช้ ACTUAL_USAGE ตามกติกาบัญชี)
  SELECT count(*) INTO n FROM allocation_result
   WHERE allocation_run_id=v_run AND behavior='VARIABLE' AND allocation_method='CUSTOM_PCT';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: นโยบายต้นทุนคงที่ไปเปลี่ยนวิธีของต้นทุนผันแปร % แถว', n; END IF;
  RAISE NOTICE 'PASS  ต้นทุนผันแปรไม่ถูกนโยบายต้นทุนคงที่แตะต้อง';

  -- รายการ UNCLASSIFIED ต้องคงเส้นทางเดิม ไม่ถูกนโยบายกลืนไป
  SELECT count(*) INTO n FROM allocation_result
   WHERE allocation_run_id=v_run AND flag='MISSING_DRIVER';
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: รายการที่ไม่มี driver หายไปจากคิวข้อยกเว้น'; END IF;
  RAISE NOTICE 'PASS  รายการ UNCLASSIFIED/ไม่มี driver ยังคงเข้าคิวข้อยกเว้นเหมือนเดิม';

  -- ธงคุณภาพต้องมาจาก catalog ของวิธีที่ใช้จริง — วิธีประมาณการยังต้องได้ ESTIMATED
  SELECT count(*) INTO n
    FROM allocation_result r JOIN allocation_method_def md
      ON md.allocation_method_code = r.allocation_method
   WHERE r.allocation_run_id=v_run AND r.program_version_id IS NOT NULL
     AND r.allocation_method <> 'DIRECT' AND r.flag NOT IN ('UNCLASSIFIED', md.default_quality_flag);
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: มี % แถวที่ธงไม่ตรงกับ catalog ของวิธีปันส่วน', n; END IF;
  RAISE NOTICE 'PASS  ธงคุณภาพทุกแถวตรงกับ catalog ของวิธีที่ใช้จริง';

  -- ป.โท ต้องได้ 10% ของก้อนที่ปันส่วนตามนโยบาย (±1 สตางค์ต่อ leg จากการปัดเศษ)
  SELECT sum(allocated_amount) INTO v_pool FROM allocation_result
   WHERE allocation_run_id=v_run AND allocation_method='CUSTOM_PCT';
  SELECT sum(r.allocated_amount) INTO v_gr FROM allocation_result r
    JOIN program_version pv USING (program_version_id) JOIN program pr USING (program_id)
   WHERE r.allocation_run_id=v_run AND r.allocation_method='CUSTOM_PCT' AND pr.program_code='P04';
  IF abs(v_gr - v_pool * 0.1) > 0.05 THEN
    RAISE EXCEPTION 'FAIL: ป.โท ได้ % จากก้อน % (คาด 10%%)', v_gr, v_pool; END IF;
  RAISE NOTICE 'PASS  ป.โท รับภาระต้นทุนคงที่ 10%% ตามมติ (% จาก %)', round(v_gr,2), round(v_pool,2);
END $$;

-- ─────────────────── 6. คณะที่ยังไม่มีนโยบาย → POLICY_DEFAULTED ───────────────────
DO $$
DECLARE v_run bigint; n int;
BEGIN
  -- run ก่อนหน้า (03_test.sql) รันตอนยังไม่มีนโยบาย จึงต้องมีธงนี้
  SELECT count(*) INTO n FROM data_quality_issue
   WHERE issue_type='POLICY_DEFAULTED'
     AND allocation_run_id = (SELECT min(allocation_run_id) FROM allocation_run);
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: run ที่ไม่มีนโยบายไม่ถูกติดธง POLICY_DEFAULTED'; END IF;

  SELECT count(*) INTO n FROM data_quality_issue
   WHERE issue_type='POLICY_DEFAULTED'
     AND allocation_run_id = (SELECT max(allocation_run_id) FROM allocation_run);
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: run ที่มีนโยบายแล้วยังถูกติดธง POLICY_DEFAULTED'; END IF;
  RAISE NOTICE 'PASS  คณะที่ยังไม่ส่งนโยบายขึ้นคิวข้อยกเว้น ไม่ใช่เงียบหาย';
END $$;

-- ─────────────────── 7. ฉบับเจาะจงกลุ่มต้นทุนชนะฉบับ ALL ───────────────────
INSERT INTO fixed_cost_pool_rule (erp_account_id, cost_pool, note)
SELECT erp_account_id, 'SALARY', 'เงินเดือนและค่าจ้าง'
  FROM erp_account WHERE subcategory_code='10001';

INSERT INTO fixed_cost_policy
  (org_unit_id, academic_year, cost_pool, method, status, submitted_by, submitted_at,
   approved_by, approved_at, created_by)
SELECT org_unit_id, 2568, 'SALARY', 'EQUAL_PROGRAM', 'APPROVED', 'faculty_officer', now(),
       'budget_office', now(), 'faculty_officer'
  FROM org_unit WHERE org_code='F01';

INSERT INTO allocation_run (period_id, org_unit_id, basis, rule_version, created_by, tolerance)
SELECT p.period_id, f.org_unit_id, 'ACTUAL', 'v1', 'analyst', 0.00
  FROM dim_period p, org_unit f WHERE f.org_code='F01';

DO $$
DECLARE v_run bigint := (SELECT max(allocation_run_id) FROM allocation_run);
BEGIN
  CALL run_cost_allocation(v_run, 'analyst');
END $$;

DO $$
DECLARE v_run bigint := (SELECT max(allocation_run_id) FROM allocation_run); n int; v_diff numeric;
BEGIN
  -- เงินเดือน (10001) ต้องใช้ฉบับ SALARY = EQUAL_PROGRAM
  SELECT count(*) INTO n
    FROM allocation_result r JOIN cost_source c USING (cost_source_id)
    JOIN erp_account a USING (erp_account_id)
   WHERE r.allocation_run_id=v_run AND a.subcategory_code='10001'
     AND r.program_version_id IS NOT NULL AND r.allocation_method <> 'DIRECT'
     AND r.allocation_method <> 'EQUAL_PROGRAM';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: เงินเดือนไม่ได้ใช้ฉบับที่เจาะจงกลุ่ม SALARY (% แถว)', n; END IF;

  -- ต้นทุนคงที่กลุ่มอื่นยังใช้ฉบับ ALL = CUSTOM_PCT
  SELECT count(*) INTO n FROM allocation_result
   WHERE allocation_run_id=v_run AND allocation_method='CUSTOM_PCT';
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: ต้นทุนคงที่กลุ่มอื่นไม่ได้ใช้ฉบับ ALL'; END IF;

  SELECT difference INTO v_diff FROM reconciliation_control WHERE allocation_run_id=v_run;
  IF v_diff <> 0 THEN RAISE EXCEPTION 'FAIL: reconcile ไม่ตรง ต่าง %', v_diff; END IF;
  RAISE NOTICE 'PASS  ฉบับที่เจาะจงกลุ่มต้นทุนชนะฉบับ ALL และยอดยังตรงพอดี';
END $$;

\echo ''
\echo '=============== ส่วนแบ่งต้นทุนคงที่รายหลักสูตร (run ล่าสุด) ==============='
SELECT pr.program_code AS "หลักสูตร",
       pr.degree_level AS "ระดับ",
       to_char(sum(r.allocated_amount) FILTER (WHERE r.behavior='FIXED'), 'FM999,999,990.00') AS "ต้นทุนคงที่",
       string_agg(DISTINCT r.allocation_method::text, ', ') AS "วิธีปันส่วน"
  FROM allocation_result r
  JOIN program_version pv USING (program_version_id)
  JOIN program pr USING (program_id)
 WHERE r.allocation_run_id = (SELECT max(allocation_run_id) FROM allocation_run)
 GROUP BY pr.program_code, pr.degree_level
 ORDER BY pr.program_code;
