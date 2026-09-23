-- ============================================================================
-- BEPS-SYSTEM — เครื่องปันส่วนต้นทุนและการคำนวณจุดคุ้มทุน
--
-- แก้ข้อบกพร่องจาก MANUS/*.sql ทั้ง 4 จุดที่อยู่ในชั้น logic:
--   #2 แตก MIXED เป็น 2 pool ตามสัดส่วนก่อนปันส่วน (เดิมนิยาม ratio ไว้แต่ไม่เคยใช้)
--   #3 largest-remainder + แถว ROUNDING_ADJUSTMENT → ผลรวมตรงกับต้นทางพอดี (เดิม run FAIL แทบทุกครั้ง)
--   #4 LEFT JOIN driver + แถว MISSING_DRIVER → ยอดไม่หายเงียบ (เดิม INNER JOIN ทำให้ต้นทุนหาย)
--   + เพิ่มการคำนวณ BEP ซึ่ง MANUS ไม่มีเลย
-- ============================================================================

SET search_path TO beps, public;

-- ────────────────────────────────────────────────────────────────────────────
-- อ่านค่าตั้งระบบที่มีผลกับงวดหนึ่ง (แก้ #9)
--   ลำดับความสำคัญ: ค่าที่ตั้งเจาะจงหน่วยงาน > ค่าระดับมหาวิทยาลัย > ค่า default ใน catalog
--   ปีที่ใช้เทียบมาจาก system_setting_def.year_basis (ปีการศึกษา หรือ ปีงบประมาณ)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_setting(
  p_key varchar, p_period_id bigint, p_org_unit_id bigint DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE v_val text; v_basis year_basis; v_year integer; v_default text;
BEGIN
  SELECT year_basis, default_value INTO v_basis, v_default
    FROM system_setting_def WHERE setting_key = p_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่รู้จักค่าตั้งระบบ "%" — ต้องนิยามใน system_setting_def ก่อน', p_key;
  END IF;

  SELECT CASE v_basis WHEN 'ACADEMIC' THEN academic_year ELSE fiscal_year END
    INTO v_year FROM dim_period WHERE period_id = p_period_id;
  IF v_year IS NULL THEN RETURN v_default; END IF;

  SELECT s.setting_value INTO v_val
    FROM system_setting s
   WHERE s.setting_key = p_key
     AND s.status = 'APPROVED'
     AND (s.org_unit_id IS NULL OR s.org_unit_id = p_org_unit_id)
     AND int4range(s.effective_from_year, s.effective_to_year, '[]') @> v_year
   ORDER BY s.org_unit_id NULLS LAST, s.effective_from_year DESC
   LIMIT 1;

  RETURN COALESCE(v_val, v_default);
END; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- คำนวณจุดคุ้มทุนจากตัวเลขสรุป — สูตร 1 และสูตร 7 (SA.md หัวข้อ 7.1)
--   คืน (q_star, q_star_status)
--   นโยบาย 2 ข้อไม่ฝังในโค้ดแล้ว ผู้เรียกต้องส่งมาจาก get_setting() (แก้ #9):
--     p_cm_policy  — CM ≤ 0 จะใช้ full_cost_recovery หรือรายงาน not_computable
--     p_rounding   — ปัด Q* แบบ ceil หรือ round
--   default ของพารามิเตอร์ตรงกับ default_value ใน catalog เพื่อให้เรียกมือได้
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calc_qstar(
  p_tfc numeric, p_tc numeric, p_r numeric, p_avc numeric,
  p_cm_policy text DEFAULT 'full_cost_recovery',
  p_rounding  text DEFAULT 'ceil'
) RETURNS TABLE (q_star numeric, q_star_status qstar_status)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_cm numeric; v_raw numeric;
BEGIN
  IF p_r IS NULL OR p_avc IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, 'not_computable'::qstar_status; RETURN;
  END IF;
  v_cm := p_r - p_avc;

  IF v_cm > 0 THEN
    v_raw := p_tfc / v_cm;
  ELSIF p_r > 0 AND p_cm_policy = 'full_cost_recovery' THEN
    -- สูตร 7: AVC สูงกว่า R → ไม่มีจุดคุ้มทุนจริง ใช้เป้าหมายขั้นต่ำแบบ Full-Cost Recovery
    RETURN QUERY SELECT
      CASE p_rounding WHEN 'round' THEN round(p_tc / p_r) ELSE ceil(p_tc / p_r) END::numeric,
      'full_cost_recovery'::qstar_status;
    RETURN;
  ELSE
    RETURN QUERY SELECT NULL::numeric, 'not_computable'::qstar_status; RETURN;
  END IF;

  RETURN QUERY SELECT
    CASE p_rounding WHEN 'round' THEN round(v_raw) ELSE ceil(v_raw) END::numeric,
    'normal'::qstar_status;
END; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- นโยบายจัดสรรต้นทุนคงที่รายคณะ (มติที่ประชุม · ../FIXED-COST-WORKFLOW.md)
--
-- แนวคิด: ทั้ง 3 วิธีถูกแปลงเป็นค่า driver ก่อนรัน เครื่องปันส่วนจึงไม่ต้องรู้จัก
--          วิธีเป็นรายตัว และกติกาการปัดเศษ/การ reconcile เดิมยังใช้ได้ทั้งหมด
-- คู่ขนานฝั่ง TypeScript: packages/calc-engine/src/fixed-cost-policy.ts
--          (ตัวเลขทั้งสองฝั่งต้องตรงกันเป๊ะ มิฉะนั้นผลจำลองบนหน้าจอจะต่างจากที่บันทึกลง DB)
-- ────────────────────────────────────────────────────────────────────────────

-- หน่วยงานลูกทั้งหมดของหน่วยหนึ่ง รวมตัวมันเอง — หลักสูตรผูกกับ org ระดับ EDUCATION_LEVEL
-- ไม่ใช่ระดับคณะ จึงต้องไล่ลงไปทั้งกิ่ง
CREATE OR REPLACE FUNCTION org_descendants(p_org_unit_id bigint)
RETURNS TABLE (org_unit_id bigint)
LANGUAGE sql STABLE AS $$
  -- พก path มาด้วยเพื่อกัน recursion ไม่รู้จบ ถ้าข้อมูล org_unit เกิดวนลูป
  -- (schema กันพ่อเป็นตัวเองไม่ได้ และการปรับโครงสร้างองค์กรผิดพลาดเกิดขึ้นได้จริง)
  WITH RECURSIVE t AS (
    SELECT o.org_unit_id, ARRAY[o.org_unit_id] AS path
      FROM org_unit o WHERE o.org_unit_id = p_org_unit_id
    UNION ALL
    SELECT c.org_unit_id, t.path || c.org_unit_id
      FROM org_unit c JOIN t ON c.parent_org_unit_id = t.org_unit_id
     WHERE NOT c.org_unit_id = ANY (t.path)
  )
  SELECT t.org_unit_id FROM t;
$$;

-- หลักสูตรที่เปิดสอนในงวดนั้นของคณะหนึ่ง พร้อม FTES
--   FTES = Σ (จำนวนนิสิตแต่ละประเภท × student_type.ftes_weight)
--   ตั้งน้ำหนักทุกประเภท = 1 → กลายเป็นการนับหัวตรงๆ (ทางเลือกที่ยังเปิดไว้ในมติ)
--   ใช้ snapshot ของวันที่ q_snapshot_date ถ้ากำหนดไว้ ไม่งั้นใช้วันล่าสุดของงวด
CREATE OR REPLACE FUNCTION program_ftes(p_period_id bigint, p_org_unit_id bigint)
RETURNS TABLE (program_version_id bigint, degree_level text, ftes numeric)
LANGUAGE sql STABLE AS $$
  WITH p AS (SELECT * FROM dim_period WHERE period_id = p_period_id),
  snap_date AS (
    SELECT COALESCE(
      (SELECT q_snapshot_date FROM p),
      (SELECT max(rs.snapshot_date) FROM registration_snapshot rs WHERE rs.period_id = p_period_id)
    ) AS d
  )
  SELECT pv.program_version_id,
         pr.degree_level::text,
         COALESCE(sum(rs.student_count * st.ftes_weight), 0)::numeric AS ftes
    FROM program_version pv
    JOIN program pr ON pr.program_id = pv.program_id
    JOIN p ON TRUE
    JOIN snap_date sd ON TRUE
    LEFT JOIN registration_snapshot rs
           ON rs.program_version_id = pv.program_version_id
          AND rs.period_id = p_period_id
          AND rs.snapshot_date = sd.d
    LEFT JOIN student_type st ON st.student_type_id = rs.student_type_id
   WHERE pr.org_unit_id IN (SELECT org_descendants(p_org_unit_id))
     AND pv.valid_from <= p.period_end
     AND (pv.valid_to IS NULL OR pv.valid_to >= p.period_start)
   GROUP BY pv.program_version_id, pr.degree_level;
$$;

-- ตรวจนโยบายหนึ่งฉบับตามกติกา V1–V4 (FIXED-COST-WORKFLOW.md หัวข้อ 7)
--   คืนรายการปัญหา — ไม่มีแถว severity='error' = เสนอขออนุมัติได้
--   ชั้นบริการต้องเรียกก่อนเปลี่ยนสถานะเป็น PENDING_APPROVAL เสมอ
-- รับ "แถวนโยบาย" ไม่ใช่ id เพื่อให้ trigger ตรวจแถวที่ยังไม่ถูกเขียนลงตารางได้ด้วย
CREATE OR REPLACE FUNCTION fixed_cost_policy_issues(v fixed_cost_policy, p_period_id bigint)
RETURNS TABLE (code text, severity text, detail text)
LANGUAGE plpgsql STABLE AS $$
DECLARE p_policy_id bigint := v.policy_id;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM program_ftes(p_period_id, v.org_unit_id)) THEN
    RETURN QUERY SELECT 'NO_PROGRAM', 'error',
                        'ไม่มีหลักสูตรที่เปิดสอนในงวดนี้ จึงปันส่วนต้นทุนคงที่ไม่ได้';
    RETURN;
  END IF;

  IF v.method <> 'CUSTOM_PCT' THEN
    -- วิธีที่ 1/2 ไม่ต้องกรอกอะไร จึงไม่มีอะไรให้ตรวจนอกจากมีหลักสูตรอยู่จริง
    IF v.method = 'PER_HEAD_FTES'
       AND (SELECT COALESCE(sum(f.ftes),0) FROM program_ftes(p_period_id, v.org_unit_id) f) <= 0 THEN
      RETURN QUERY SELECT 'FTES_UNAVAILABLE', 'warning',
                          'ทั้งคณะไม่มี FTES ในงวดนี้ — จะถอยไปหารเท่ากันทุกหลักสูตร';
    END IF;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM fixed_cost_policy_line WHERE policy_id = p_policy_id) THEN
    RETURN QUERY SELECT 'POLICY_INCOMPLETE', 'error',
                        'เลือกวิธีกำหนดสัดส่วนเอง แต่ยังไม่ได้กรอกสัดส่วนของกลุ่มใดเลย';
    RETURN;
  END IF;

  -- V1 — ผลรวมต้องเท่ากับ 100 พอดี ไม่มี tolerance
  RETURN QUERY
  SELECT 'PCT_SUM_NOT_100', 'error',
         format('ผลรวมสัดส่วนต้องเท่ากับ 100%% พอดี — ขณะนี้ %s%%', sum(l.pct))
    FROM fixed_cost_policy_line l WHERE l.policy_id = p_policy_id
   HAVING sum(l.pct) <> 100;

  -- V3 — กลุ่มที่ได้สัดส่วนแต่ไม่มีหลักสูตรอยู่เลย → ต้นทุนก้อนนั้นไม่มีเจ้าภาพ
  RETURN QUERY
  SELECT 'BUCKET_EMPTY', 'error',
         'กลุ่มที่ได้รับสัดส่วนแต่ไม่มีหลักสูตรอยู่เลย: ' || string_agg(l.bucket_key, ', ')
    FROM fixed_cost_policy_line l
   WHERE l.policy_id = p_policy_id AND l.pct > 0
     AND NOT EXISTS (
       SELECT 1 FROM program_ftes(p_period_id, v.org_unit_id) p
        WHERE l.bucket_key = CASE v.bucket_level
                               WHEN 'PROGRAM' THEN p.program_version_id::text
                               ELSE p.degree_level END)
  HAVING count(*) > 0;

  -- V2 — หลักสูตรที่ไม่ได้อยู่ในกลุ่มใดเลย จะไม่ได้รับส่วนแบ่ง
  RETURN QUERY
  SELECT 'PROGRAM_NOT_COVERED', 'error',
         'หลักสูตรที่ยังไม่ได้อยู่ในกลุ่มใด: ' || string_agg(p.program_version_id::text, ', ')
    FROM program_ftes(p_period_id, v.org_unit_id) p
   WHERE NOT EXISTS (
     SELECT 1 FROM fixed_cost_policy_line l
      WHERE l.policy_id = p_policy_id
        AND l.bucket_key = CASE v.bucket_level
                             WHEN 'PROGRAM' THEN p.program_version_id::text
                             ELSE p.degree_level END)
  HAVING count(*) > 0;

  -- V4 — ดุลพินิจต้องมีหลักฐานกำกับ
  IF v.meeting_ref IS NULL OR v.rationale IS NULL THEN
    RETURN QUERY SELECT 'POLICY_INCOMPLETE', 'error',
                        'วิธีกำหนดสัดส่วนเองต้องระบุเลขที่มติและเหตุผลประกอบ';
  END IF;
END; $$;

-- รูปแบบที่ชั้นแอปเรียก — ตรวจนโยบายที่บันทึกไว้แล้วด้วย policy_id
CREATE OR REPLACE FUNCTION fixed_cost_policy_issues(p_policy_id bigint, p_period_id bigint)
RETURNS TABLE (code text, severity text, detail text)
LANGUAGE plpgsql STABLE AS $$
DECLARE v fixed_cost_policy;
BEGIN
  SELECT * INTO v FROM fixed_cost_policy WHERE policy_id = p_policy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนโยบาย %', p_policy_id; END IF;

  RETURN QUERY SELECT * FROM fixed_cost_policy_issues(v, p_period_id);
END; $$;

-- กันไม่ให้นโยบายที่ยังไม่ผ่านการตรวจถูกอนุมัติ (V1–V4 · FIXED-COST-WORKFLOW.md หัวข้อ 7)
--   บังคับที่ระดับฐานข้อมูล เพราะการตรวจที่ชั้น UI อย่างเดียวคือช่องโหว่ —
--   นโยบายเสียที่ถูกอนุมัติจะทำให้ต้นทุนคงที่ตกค้างเป็น MISSING_DRIVER โดย reconciliation ยัง PASS
CREATE OR REPLACE FUNCTION fixed_cost_policy_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_period bigint; v_msg text;
BEGIN
  IF NEW.status <> 'APPROVED' THEN RETURN NEW; END IF;

  SELECT period_id INTO v_period
    FROM dim_period WHERE academic_year = NEW.academic_year ORDER BY period_id LIMIT 1;

  -- ยังไม่มีงวดของปีนั้น = ยังไม่รู้ว่ามีหลักสูตรใดบ้าง ตรวจเนื้อหาไม่ได้ จึงปล่อยผ่าน
  -- (ถึงเวลารันจริงจะถูกตรวจซ้ำอยู่ดี และ run จะติดธงถ้าปันส่วนไม่ลงหลักสูตร)
  IF v_period IS NULL THEN RETURN NEW; END IF;

  SELECT string_agg(i.code || ': ' || i.detail, ' · ') INTO v_msg
    FROM fixed_cost_policy_issues(NEW, v_period) i WHERE i.severity = 'error';

  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'อนุมัตินโยบายต้นทุนคงที่ไม่ได้ — %', v_msg;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS fixed_cost_policy_guard ON fixed_cost_policy;
CREATE TRIGGER fixed_cost_policy_guard
  BEFORE INSERT OR UPDATE ON fixed_cost_policy
  FOR EACH ROW EXECUTE FUNCTION fixed_cost_policy_guard();

-- แปลงนโยบาย 1 ฉบับ → ค่า driver ต่อหลักสูตร (สัดส่วนรวมกันได้ 1)
--   CUSTOM_PCT ทำงาน 2 ชั้น: แบ่งก้อนตาม % แล้วแบ่งต่อภายในกลุ่มด้วยวิธีที่ 1 หรือ 2
--   ตัวอย่างในมติ "ป.ตรี 90% · ป.โท-เอก 10%" กำหนดถึงระดับการศึกษา ไม่ใช่รายหลักสูตร
CREATE OR REPLACE FUNCTION fixed_cost_driver_values(p_policy_id bigint, p_period_id bigint)
RETURNS TABLE (program_version_id bigint, driver_value numeric, flag quality_flag)
LANGUAGE plpgsql STABLE AS $$
DECLARE v fixed_cost_policy; v_sub alloc_method; v_ftes_total numeric;
BEGIN
  SELECT * INTO v FROM fixed_cost_policy WHERE policy_id = p_policy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนโยบาย %', p_policy_id; END IF;
  v_sub := COALESCE(v.sub_method, 'PER_HEAD_FTES');

  IF v.method = 'EQUAL_PROGRAM' THEN
    RETURN QUERY
    SELECT p.program_version_id, (1.0 / count(*) OVER ())::numeric, 'PASS'::quality_flag
      FROM program_ftes(p_period_id, v.org_unit_id) p;
    RETURN;
  END IF;

  IF v.method = 'PER_HEAD_FTES' THEN
    SELECT sum(ftes) INTO v_ftes_total FROM program_ftes(p_period_id, v.org_unit_id);

    -- V8 — ไม่มี FTES ให้หารทั้งคณะ → หารเท่ากันแทน ไม่ปล่อยให้ยอดค้างเป็น MISSING_DRIVER ทั้งก้อน
    IF COALESCE(v_ftes_total, 0) <= 0 THEN
      RETURN QUERY
      SELECT p.program_version_id, (1.0 / count(*) OVER ())::numeric, 'MISSING_DRIVER'::quality_flag
        FROM program_ftes(p_period_id, v.org_unit_id) p;
    ELSE
      RETURN QUERY
      SELECT p.program_version_id, (p.ftes / v_ftes_total)::numeric, 'PASS'::quality_flag
        FROM program_ftes(p_period_id, v.org_unit_id) p;
    END IF;
    RETURN;
  END IF;

  -- ── CUSTOM_PCT ────────────────────────────────────────────────────────────
  RETURN QUERY
  WITH prog AS (SELECT * FROM program_ftes(p_period_id, v.org_unit_id)),
  joined AS (
    SELECT p.program_version_id, p.ftes, l.bucket_key, l.pct
      FROM prog p
      JOIN fixed_cost_policy_line l
        ON l.policy_id = p_policy_id
       AND l.bucket_key = CASE v.bucket_level
                            WHEN 'PROGRAM' THEN p.program_version_id::text
                            ELSE p.degree_level END
     WHERE l.pct > 0
  ),
  -- นับเฉพาะกลุ่มที่มีหลักสูตรอยู่จริง แล้ว normalize ใหม่ เพื่อให้ยอดรวมยังเท่าต้นทาง
  -- (กลุ่มที่ว่างเป็น error ตาม V3 อยู่แล้ว — ที่นี่แค่ไม่ปล่อยให้เงินหายไปเงียบๆ)
  usable AS (SELECT sum(b.bucket_pct) AS total FROM (
      SELECT j.bucket_key, max(j.pct) AS bucket_pct FROM joined j GROUP BY j.bucket_key
    ) b),
  w AS (
    SELECT j.*,
           sum(j.ftes) OVER (PARTITION BY j.bucket_key) AS bucket_ftes,
           count(*)    OVER (PARTITION BY j.bucket_key) AS bucket_n
      FROM joined j
  )
  SELECT w.program_version_id,
         ((w.pct / u.total) *
          CASE WHEN v_sub = 'PER_HEAD_FTES' AND w.bucket_ftes > 0
               THEN w.ftes / w.bucket_ftes
               ELSE 1.0 / w.bucket_n END)::numeric,
         CASE WHEN v_sub = 'PER_HEAD_FTES' AND w.bucket_ftes <= 0
              THEN 'MISSING_DRIVER'::quality_flag
              ELSE 'MANUAL_OVERRIDE'::quality_flag END
    FROM w CROSS JOIN usable u
   WHERE u.total > 0;
END; $$;

-- เขียนค่า driver ของทุกนโยบายที่อนุมัติแล้วของคณะหนึ่งลง allocation_driver_value
--   เรียกอัตโนมัติตอนต้น run_cost_allocation — ไม่ต้องให้ผู้ใช้กดเอง
--   ลบเฉพาะแถวที่มาจากนโยบาย (source_reference LIKE 'policy:%') จึงไม่แตะ driver อื่น
CREATE OR REPLACE PROCEDURE materialize_fixed_cost_drivers(p_period_id bigint, p_org_unit_id bigint)
LANGUAGE plpgsql AS $$
DECLARE v_year integer; r record;
BEGIN
  SELECT academic_year INTO v_year FROM dim_period WHERE period_id = p_period_id;

  DELETE FROM allocation_driver_value
   WHERE period_id = p_period_id AND org_unit_id = p_org_unit_id
     AND source_reference LIKE 'policy:%';

  FOR r IN
    SELECT * FROM fixed_cost_policy
     WHERE org_unit_id = p_org_unit_id AND academic_year = v_year AND status = 'APPROVED'
  LOOP
    INSERT INTO allocation_driver_value
      (period_id, org_unit_id, program_version_id, driver_code, cost_pool, driver_value, source_reference)
    SELECT p_period_id, p_org_unit_id, d.program_version_id, r.method, r.cost_pool,
           d.driver_value, 'policy:' || r.policy_id
      FROM fixed_cost_driver_values(r.policy_id, p_period_id) d
     WHERE d.driver_value > 0;
  END LOOP;
END; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- ปันส่วนต้นทุนของ run หนึ่ง
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE run_cost_allocation(p_run_id bigint, p_actor varchar)
LANGUAGE plpgsql AS $$
DECLARE
  v_period      bigint;
  v_org         bigint;
  v_basis       amount_basis;
  v_tol         numeric(20,2);
  v_status      run_status;
  v_src_total   numeric(20,2);
  v_alloc_total numeric(20,2);
  v_diff        numeric(20,2);
  v_default_method alloc_method;
  v_dep_behavior   cost_behavior;
  v_year           integer;
  v_no_policy_amt  numeric(20,2);
BEGIN
  SELECT period_id, org_unit_id, basis, tolerance, status
    INTO v_period, v_org, v_basis, v_tol, v_status
    FROM allocation_run WHERE allocation_run_id = p_run_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบ allocation run %', p_run_id; END IF;
  IF v_status NOT IN ('DRAFT','FAILED') THEN
    RAISE EXCEPTION 'run % อยู่สถานะ % จึงคำนวณซ้ำไม่ได้ (run ที่อนุมัติแล้วเปลี่ยนไม่ได้ ต้องสร้าง run ใหม่)',
                    p_run_id, v_status;
  END IF;

  UPDATE allocation_run
     SET status='RUNNING', started_at=now(), completed_at=NULL, error_message=NULL
   WHERE allocation_run_id = p_run_id;

  -- แปลงนโยบายต้นทุนคงที่รายคณะที่อนุมัติแล้ว → ค่า driver ก่อนเสมอ
  -- ทำที่นี่ไม่ใช่ให้ผู้ใช้กดเอง เพื่อไม่ให้มี run ที่ใช้สัดส่วนรุ่นเก่าค้างอยู่
  CALL materialize_fixed_cost_drivers(v_period, v_org);
  SELECT academic_year INTO v_year FROM dim_period WHERE period_id = v_period;

  DELETE FROM allocation_result       WHERE allocation_run_id = p_run_id;
  DELETE FROM reconciliation_control  WHERE allocation_run_id = p_run_id;
  DELETE FROM data_quality_issue      WHERE allocation_run_id = p_run_id;
  DELETE FROM program_cost_summary    WHERE allocation_run_id = p_run_id;

  -- ── ขั้น 1: หากติกา behavior ของแต่ละรายการต้นทุน ─────────────────────────
  --    แก้ #8: เทียบด้วย "ปี" ของงวดตาม year_basis ของกติกา ไม่ใช่ period_start
  --    แก้ #9: วิธีปันส่วนตั้งต้นและประเภทของค่าเสื่อมราคาอ่านจากค่าตั้งระบบ
  v_default_method := get_setting('default_allocation_method', v_period, v_org)::alloc_method;
  v_dep_behavior   := get_setting('depreciation_behavior',     v_period, v_org)::cost_behavior;

  CREATE TEMP TABLE _cost ON COMMIT DROP AS
  SELECT c.cost_source_id,
         c.program_version_id,
         c.amount,
         COALESCE(r.behavior, CASE WHEN c.source_type='DEPRECIATION' THEN v_dep_behavior
                                   ELSE 'UNCLASSIFIED'::cost_behavior END)              AS behavior,
         COALESCE(r.fixed_ratio,
                  CASE WHEN c.source_type='DEPRECIATION' AND v_dep_behavior='FIXED' THEN 1
                       ELSE 0 END)                                                       AS fixed_ratio,
         COALESCE(r.variable_ratio,
                  CASE WHEN c.source_type='DEPRECIATION' AND v_dep_behavior='VARIABLE' THEN 1
                       ELSE 0 END)                                                       AS variable_ratio,
         COALESCE(r.allocation_method_code, v_default_method)                            AS method,
         (r.behavior IS NULL AND c.source_type <> 'DEPRECIATION')                        AS is_unclassified,
         -- ต้นทุนที่ยังจำแนกประเภทไม่ได้ ไม่ว่าจะเพราะไม่มีกติกา หรือกติการะบุ UNCLASSIFIED ไว้
         -- ใช้กันไม่ให้นโยบายต้นทุนคงที่ของคณะไปกลืนรายการที่ยังต้องตามแก้ (SA.md 5.4 ข้อ 6)
         (COALESCE(r.behavior, 'UNCLASSIFIED') = 'UNCLASSIFIED'
          AND c.source_type <> 'DEPRECIATION')                                           AS unclassified_behavior,
         -- กลุ่มต้นทุนคงที่ของรายการนี้ ใช้หานโยบายของคณะในขั้น 3b
         CASE WHEN c.source_type = 'DEPRECIATION' THEN 'DEPRECIATION'::fixed_cost_pool
              ELSE COALESCE(fpr.cost_pool, 'OTHER'::fixed_cost_pool) END                  AS cost_pool
    FROM cost_source c
    JOIN dim_period p ON p.period_id = c.period_id
    LEFT JOIN LATERAL (
      SELECT abr.*
        FROM account_behavior_rule abr
       WHERE abr.erp_account_id = c.erp_account_id
         AND abr.status = 'APPROVED'
         AND (abr.org_unit_id IS NULL OR abr.org_unit_id = c.org_unit_id)
         AND int4range(abr.effective_from_year, abr.effective_to_year, '[]')
             @> (CASE abr.year_basis WHEN 'ACADEMIC' THEN p.academic_year ELSE p.fiscal_year END)
       -- ลำดับตัดสินเมื่อมีหลายกติกาเข้าเงื่อนไข: เจาะจงหน่วยงานก่อน แล้ว priority
       -- แล้วปีที่เริ่มมีผลล่าสุด สุดท้ายกันเสมอกันด้วย year_basis (ACADEMIC มาก่อน)
       ORDER BY abr.priority ASC, abr.org_unit_id NULLS LAST,
                abr.effective_from_year DESC, abr.year_basis ASC
       LIMIT 1
    ) r ON TRUE
    LEFT JOIN fixed_cost_pool_rule fpr ON fpr.erp_account_id = c.erp_account_id
   WHERE c.period_id = v_period AND c.org_unit_id = v_org AND c.basis = v_basis;

  -- ── ขั้น 2: แตกเป็น leg (แก้ #2 — MIXED กลายเป็น 2 pool จริง) ─────────────
  --    ปัดเศษระดับ leg ด้วย largest-remainder เพื่อให้ผลรวม leg = amount ของรายการนั้นพอดี
  CREATE TEMP TABLE _leg ON COMMIT DROP AS
  WITH raw AS (
    SELECT c.cost_source_id, c.program_version_id, c.amount, c.method, c.is_unclassified,
           c.unclassified_behavior, c.cost_pool, l.behavior, c.amount * l.ratio AS raw_amt
      FROM _cost c
      CROSS JOIN LATERAL (
        VALUES
          ('FIXED'::result_behavior,    CASE c.behavior WHEN 'MIXED' THEN c.fixed_ratio
                                                        WHEN 'VARIABLE' THEN 0 ELSE 1 END),
          ('VARIABLE'::result_behavior, CASE c.behavior WHEN 'MIXED' THEN c.variable_ratio
                                                        WHEN 'VARIABLE' THEN 1 ELSE 0 END)
      ) AS l(behavior, ratio)
     WHERE l.ratio > 0
  ), f AS (
    SELECT *, floor(raw_amt * 100) / 100 AS amt_floor,
              raw_amt * 100 - floor(raw_amt * 100) AS frac
      FROM raw
  ), c AS (
    SELECT *,
           round((amount - sum(amt_floor) OVER (PARTITION BY cost_source_id)) * 100)::int AS cents_left,
           row_number() OVER (PARTITION BY cost_source_id ORDER BY frac DESC, behavior) AS rn
      FROM f
  )
  SELECT row_number() OVER ()                    AS leg_id,
         cost_source_id, program_version_id, behavior, method, is_unclassified,
         unclassified_behavior, cost_pool,
         (amt_floor + CASE WHEN rn <= cents_left THEN 0.01 ELSE 0 END)::numeric(20,2) AS leg_amount
    FROM c;

  -- ── ขั้น 3a: direct cost — ERP ผูกหลักสูตรได้อยู่แล้ว ─────────────────────
  INSERT INTO allocation_result
    (allocation_run_id, cost_source_id, program_version_id, behavior, allocation_method,
     driver_value, driver_total, allocated_amount, flag)
  SELECT p_run_id, l.cost_source_id, l.program_version_id, l.behavior, 'DIRECT',
         1, 1, l.leg_amount,
         CASE WHEN l.is_unclassified THEN 'UNCLASSIFIED'::quality_flag ELSE 'PASS'::quality_flag END
    FROM _leg l
   WHERE l.program_version_id IS NOT NULL AND l.leg_amount <> 0;

  -- ── ขั้น 3b: ปันส่วน — แก้ #3 (largest remainder) และ #4 (ไม่ทิ้งยอด) ──────
  --   ลำดับการตัดสินวิธีปันส่วน: direct (ขั้น 3a) → นโยบายคณะ → กติกาบัญชี → ค่าตั้งระบบ
  --   นโยบายคณะมีผลเฉพาะ leg ที่เป็น FIXED เท่านั้น ต้นทุนผันแปรไม่ถูกแตะ (หลักการข้อ 2)
  CREATE TEMP TABLE _pool ON COMMIT DROP AS
  SELECT l.leg_id, l.cost_source_id, l.program_version_id, l.behavior, l.is_unclassified,
         l.unclassified_behavior, l.leg_amount,
         COALESCE(pol.method, l.method)            AS method,
         COALESCE(pol.cost_pool, 'ALL')            AS driver_pool,
         pol.policy_id                             AS policy_id,
         COALESCE(t.driver_total, 0)               AS driver_total
    FROM _leg l
    -- หานโยบายของคณะ: ฉบับที่ตรงกลุ่มต้นทุนก่อน ถ้าไม่มีจึงใช้ฉบับที่คุมทั้งก้อน (ALL)
    LEFT JOIN LATERAL (
      SELECT fp.policy_id, fp.method, fp.cost_pool
        FROM fixed_cost_policy fp
       -- ใช้เฉพาะ leg ที่เป็นต้นทุนคงที่จริง — รายการ UNCLASSIFIED ต้องคงเส้นทางเดิม
       -- (ข้อ 6 ของ SA.md 5.4: ไม่เดาให้ แต่ติดธงและเข้าคิวข้อยกเว้น)
       WHERE l.behavior = 'FIXED' AND NOT l.unclassified_behavior
         AND fp.org_unit_id = v_org AND fp.academic_year = v_year AND fp.status = 'APPROVED'
         AND fp.cost_pool IN (l.cost_pool, 'ALL')
       ORDER BY (fp.cost_pool = 'ALL')   -- false มาก่อน = ฉบับที่เจาะจงกลุ่มชนะ
       LIMIT 1
    ) pol ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(d.driver_value) AS driver_total
        FROM allocation_driver_value d
       WHERE d.period_id = v_period AND d.org_unit_id = v_org
         AND d.driver_code = COALESCE(pol.method, l.method)
         AND d.cost_pool   = COALESCE(pol.cost_pool, 'ALL')
    ) t ON TRUE
   WHERE l.program_version_id IS NULL AND l.leg_amount <> 0;

  -- ไม่มี driver เลย หรือผลรวม driver = 0 → เก็บเป็นแถวที่ยังไม่ผูกหลักสูตร ไม่ให้ยอดหาย
  INSERT INTO allocation_result
    (allocation_run_id, cost_source_id, program_version_id, behavior, allocation_method,
     driver_value, driver_total, allocated_amount, flag)
  SELECT p_run_id, p.cost_source_id, NULL, p.behavior, p.method, 0, 0, p.leg_amount, 'MISSING_DRIVER'
    FROM _pool p
   WHERE p.driver_total = 0;

  INSERT INTO allocation_result
    (allocation_run_id, cost_source_id, program_version_id, behavior, allocation_method,
     driver_value, driver_total, allocated_amount, flag)
  WITH base AS (
    SELECT p.leg_id, p.cost_source_id, p.behavior, p.method, p.leg_amount, p.is_unclassified,
           md.default_quality_flag,
           d.program_version_id, d.driver_value, p.driver_total,
           p.leg_amount * d.driver_value / p.driver_total AS raw_amt
      FROM _pool p
      JOIN allocation_method_def md ON md.allocation_method_code = p.method
      JOIN allocation_driver_value d
        ON d.period_id = v_period AND d.org_unit_id = v_org
       AND d.driver_code = p.method AND d.cost_pool = p.driver_pool
     WHERE p.driver_total > 0
  ), f AS (
    SELECT *, floor(raw_amt * 100) / 100 AS amt_floor,
              raw_amt * 100 - floor(raw_amt * 100) AS frac
      FROM base
  ), c AS (
    SELECT *,
           round((leg_amount - sum(amt_floor) OVER (PARTITION BY leg_id)) * 100)::int AS cents_left,
           row_number() OVER (PARTITION BY leg_id ORDER BY frac DESC, program_version_id) AS rn
      FROM f
  )
  SELECT p_run_id, cost_source_id, program_version_id, behavior, method,
         driver_value, driver_total,
         (amt_floor + CASE WHEN rn <= cents_left THEN 0.01 ELSE 0 END)::numeric(20,2),
         -- ธงคุณภาพมาจาก catalog ของ "วิธีที่ใช้จริง" ไม่ใช่ CASE ที่ฝังในโค้ด
         --   PROGRAM_SHARE → ESTIMATED · CUSTOM_PCT → MANUAL_OVERRIDE · ที่เหลือ → PASS
         -- เมื่อนโยบายคณะทับวิธีของกติกาบัญชี ธงจะสะท้อนวิธีใหม่ (เช่น ประมาณการ → ตาม FTES
         -- ได้ธง PASS) ซึ่งถูกต้องเพราะฐานการปันส่วนเปลี่ยนจริง และยังตามรอยกลับไปยังฉบับ
         -- นโยบายได้จาก allocation_driver_value.source_reference
         CASE WHEN is_unclassified THEN 'UNCLASSIFIED'::quality_flag
              ELSE default_quality_flag END
    FROM c
   WHERE (amt_floor + CASE WHEN rn <= cents_left THEN 0.01 ELSE 0 END) <> 0;

  -- ── ขั้น 4: reconcile กลับยอดต้นทาง ───────────────────────────────────────
  SELECT COALESCE(sum(amount),0) INTO v_src_total
    FROM cost_source
   WHERE period_id = v_period AND org_unit_id = v_org AND basis = v_basis;

  SELECT COALESCE(sum(allocated_amount),0) INTO v_alloc_total
    FROM allocation_result WHERE allocation_run_id = p_run_id;

  v_diff := round(v_src_total - v_alloc_total, 2);

  INSERT INTO reconciliation_control
    (allocation_run_id, source_total, allocated_total, tolerance, status)
  VALUES (p_run_id, v_src_total, v_alloc_total, v_tol,
          CASE WHEN abs(v_diff) <= v_tol THEN 'PASS' ELSE 'FAIL' END);

  -- ไม่ใช้ RAISE EXCEPTION ที่นี่ เพราะจะ rollback การบันทึกสถานะ FAILED ไปด้วย
  -- (ข้อบกพร่องเดียวกันนี้มีใน MANUS/*.sql) — บันทึกหลักฐานไว้แล้วหยุด ให้ผู้เรียกตรวจสถานะเอง
  IF abs(v_diff) > v_tol THEN
    INSERT INTO data_quality_issue (allocation_run_id, issue_type, severity, amount_impact, detail)
    VALUES (p_run_id, 'MANUAL_OVERRIDE', 'HIGH', v_diff,
            format('reconciliation ไม่ผ่าน: ต้นทาง %s / ปันส่วน %s', v_src_total, v_alloc_total));
    UPDATE allocation_run
       SET status='FAILED', completed_at=now(),
           error_message = format('ยอดปันส่วนไม่ตรงต้นทาง ต่างกัน %s บาท', v_diff)
     WHERE allocation_run_id = p_run_id;
    RETURN;
  END IF;

  -- ── ขั้น 5: บันทึกข้อยกเว้นให้ตามแก้ ──────────────────────────────────────
  INSERT INTO data_quality_issue (allocation_run_id, issue_type, severity, entity_ref, amount_impact, detail)
  SELECT p_run_id, flag,
         CASE WHEN flag IN ('MISSING_DRIVER','UNCLASSIFIED') THEN 'HIGH' ELSE 'MEDIUM' END,
         'cost_source_id=' || cost_source_id, sum(allocated_amount),
         'พบ ' || count(*) || ' แถวที่ต้องตามแก้'
    FROM allocation_result
   WHERE allocation_run_id = p_run_id AND flag <> 'PASS'
   GROUP BY flag, cost_source_id;

  -- V6 — คณะที่ยังไม่มีนโยบายต้นทุนคงที่ที่อนุมัติ ยังคำนวณต่อได้ด้วยกติกาเดิม
  --      แต่ต้องขึ้นคิว Exceptions ไม่ใช่เงียบ ไม่งั้นจะไม่มีใครรู้ว่าคณะไหนยังไม่ส่งมติ
  SELECT COALESCE(sum(leg_amount), 0) INTO v_no_policy_amt
    FROM _pool WHERE behavior = 'FIXED' AND NOT unclassified_behavior AND policy_id IS NULL;

  IF v_no_policy_amt <> 0 THEN
    INSERT INTO data_quality_issue
      (allocation_run_id, issue_type, severity, entity_ref, amount_impact, detail)
    VALUES (p_run_id, 'POLICY_DEFAULTED', 'MEDIUM', 'org_unit_id=' || v_org, v_no_policy_amt,
            format('ยังไม่มีนโยบายต้นทุนคงที่ที่อนุมัติสำหรับปีการศึกษา %s — ใช้กติกาเดิมไปก่อน', v_year));
  END IF;

  -- ── ขั้น 6: สรุปต้นทุนรายหลักสูตร ─────────────────────────────────────────
  INSERT INTO program_cost_summary
    (allocation_run_id, program_version_id,
     direct_fixed_cost, allocated_fixed_cost, direct_variable_cost, allocated_variable_cost,
     per_student_variable_cost, unclassified_cost, flagged_rows)
  SELECT p_run_id, r.program_version_id,
         COALESCE(sum(r.allocated_amount) FILTER (WHERE r.behavior='FIXED'    AND r.allocation_method='DIRECT' AND r.flag<>'UNCLASSIFIED'),0),
         COALESCE(sum(r.allocated_amount) FILTER (WHERE r.behavior='FIXED'    AND r.allocation_method<>'DIRECT' AND r.flag<>'UNCLASSIFIED'),0),
         COALESCE(sum(r.allocated_amount) FILTER (WHERE r.behavior='VARIABLE' AND r.allocation_method='DIRECT' AND r.flag<>'UNCLASSIFIED'),0),
         COALESCE(sum(r.allocated_amount) FILTER (WHERE r.behavior='VARIABLE' AND r.allocation_method<>'DIRECT' AND r.flag<>'UNCLASSIFIED'),0),
         0,
         COALESCE(sum(r.allocated_amount) FILTER (WHERE r.flag='UNCLASSIFIED'),0),
         count(*) FILTER (WHERE r.flag <> 'PASS')
    FROM allocation_result r
   WHERE r.allocation_run_id = p_run_id AND r.program_version_id IS NOT NULL
   GROUP BY r.program_version_id;

  -- เงินสมทบ + GE = อัตรา × จำนวนนิสิต (ไม่ผ่านการปันส่วน จึงไม่อยู่ในขอบเขต reconciliation)
  UPDATE program_cost_summary s
     SET per_student_variable_cost = COALESCE(x.amt, 0)
    FROM (
      SELECT rs.program_version_id, sum(rs.student_count * ch.rate_per_student) AS amt
        FROM registration_snapshot rs
        JOIN program_version pv ON pv.program_version_id = rs.program_version_id
        JOIN program pr         ON pr.program_id = pv.program_id
        JOIN per_student_charge ch
          ON ch.period_id = rs.period_id
         AND (ch.student_type_id IS NULL OR ch.student_type_id = rs.student_type_id)
         AND (ch.org_unit_id     IS NULL OR ch.org_unit_id     = pr.org_unit_id)
       WHERE rs.period_id = v_period
       GROUP BY rs.program_version_id
    ) x
   WHERE s.allocation_run_id = p_run_id AND s.program_version_id = x.program_version_id;

  UPDATE allocation_run SET status='CALCULATED', completed_at=now()
   WHERE allocation_run_id = p_run_id;
END; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- คำนวณจุดคุ้มทุนทุกระดับ × 2 ฐานรายได้ (MANUS ไม่มีส่วนนี้เลย)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE compute_break_even(p_run_id bigint)
LANGUAGE plpgsql AS $$
DECLARE
  v_period    bigint;
  v_org       bigint;
  v_cm_policy text;
  v_rounding  text;
BEGIN
  SELECT period_id, org_unit_id INTO v_period, v_org
    FROM allocation_run WHERE allocation_run_id = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบ run %', p_run_id; END IF;

  -- แก้ #9: นโยบายการคำนวณมาจากค่าตั้งระบบของงวดนั้น ไม่ใช่ค่าฝังในโค้ด
  v_cm_policy := get_setting('cm_le_zero_policy', v_period, v_org);
  v_rounding  := get_setting('qstar_rounding',    v_period, v_org);

  DELETE FROM break_even_result       WHERE allocation_run_id = p_run_id;
  DELETE FROM program_revenue_summary WHERE allocation_run_id = p_run_id;

  -- รายได้: เก็บองค์ประกอบแยกกัน เพื่อสลับฐานรายได้ได้โดยไม่ต้องคำนวณใหม่ (สูตร 5a/5b)
  INSERT INTO program_revenue_summary
    (allocation_run_id, program_version_id, q_actual, fee_revenue, government_budget, income_budget)
  SELECT p_run_id, pv.program_version_id,
         COALESCE(q.cnt, 0),
         COALESCE(q.fee, 0),
         COALESCE(b.govt, 0),
         COALESCE(b.income, 0)
    FROM program_version pv
    LEFT JOIN LATERAL (
      SELECT sum(rs.student_count) AS cnt,
             sum(rs.student_count * COALESCE(fs.fee_rate,0)) AS fee
        FROM registration_snapshot rs
        LEFT JOIN fee_schedule fs
               ON fs.program_version_id = rs.program_version_id
              AND fs.period_id = rs.period_id
              AND fs.student_type_id = rs.student_type_id
              AND fs.approval_status = 'APPROVED'
       WHERE rs.program_version_id = pv.program_version_id AND rs.period_id = v_period
    ) q ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(ba.approved_amount) FILTER (WHERE ba.category='10_govt')   AS govt,
             sum(ba.approved_amount) FILTER (WHERE ba.category='20_income') AS income
        FROM budget_allocation ba
       WHERE ba.program_version_id = pv.program_version_id AND ba.period_id = v_period
    ) b ON TRUE
   WHERE EXISTS (SELECT 1 FROM program_cost_summary s
                  WHERE s.allocation_run_id = p_run_id AND s.program_version_id = pv.program_version_id);

  -- ── ระดับหลักสูตร ────────────────────────────────────────────────────────
  INSERT INTO break_even_result
    (allocation_run_id, scope, scope_id, revenue_mode, q_actual, tr, tc, tfc, tvc,
     direct_cost, allocated_cost, r_per_head, avc, atc, cm,
     q_star, q_star_status, q_star_method, be_revenue, margin_of_safety, profit_loss)
  SELECT p_run_id, 'program', b.program_version_id, b.mode, b.q, b.tr, b.tc, b.tfc, b.tvc,
         b.direct_cost, b.allocated_cost, b.r, b.avc,
         CASE WHEN b.q > 0 THEN b.tc / b.q END,
         CASE WHEN b.q > 0 THEN b.r - b.avc END,
         k.q_star, k.q_star_status, NULL,
         CASE WHEN k.q_star IS NOT NULL THEN round(k.q_star * b.r, 2) END,
         CASE WHEN k.q_star IS NOT NULL THEN round(b.tr - k.q_star * b.r, 2) END,
         b.tr - b.tc
    FROM (
      SELECT s.program_version_id, m.mode,
             rv.q_actual AS q,
             CASE m.mode WHEN 'with_government' THEN rv.government_budget + rv.income_budget
                         ELSE rv.income_budget END::numeric(20,2) AS tr,
             (s.direct_fixed_cost + s.allocated_fixed_cost + s.unclassified_cost) AS tfc,
             (s.direct_variable_cost + s.allocated_variable_cost + s.per_student_variable_cost) AS tvc,
             (s.direct_fixed_cost + s.allocated_fixed_cost + s.unclassified_cost
              + s.direct_variable_cost + s.allocated_variable_cost + s.per_student_variable_cost) AS tc,
             (s.direct_fixed_cost + s.direct_variable_cost + s.per_student_variable_cost) AS direct_cost,
             (s.allocated_fixed_cost + s.allocated_variable_cost + s.unclassified_cost) AS allocated_cost,
             CASE WHEN rv.q_actual > 0 THEN
               (CASE m.mode WHEN 'with_government' THEN rv.government_budget + rv.income_budget
                            ELSE rv.income_budget END)::numeric / rv.q_actual END AS r,
             CASE WHEN rv.q_actual > 0 THEN
               (s.direct_variable_cost + s.allocated_variable_cost + s.per_student_variable_cost)::numeric
               / rv.q_actual END AS avc
        FROM program_cost_summary s
        JOIN program_revenue_summary rv
          ON rv.allocation_run_id = s.allocation_run_id
         AND rv.program_version_id = s.program_version_id
        CROSS JOIN (VALUES ('with_government'::revenue_mode),('without_government'::revenue_mode)) m(mode)
       WHERE s.allocation_run_id = p_run_id
    ) b
    CROSS JOIN LATERAL calc_qstar(b.tfc, b.tc, b.r, b.avc, v_cm_policy, v_rounding) k;

  -- ── ระดับคณะ และมหาวิทยาลัย × 2 วิธีคำนวณ Q* (สูตร 6a / 6b) ───────────────
  --    sum_of_programs = ผลรวม Q* รายหลักสูตร (ค่าหลัก) · pooled = คำนวณจากยอดรวม (ค่าเทียบ)
  INSERT INTO break_even_result
    (allocation_run_id, scope, scope_id, revenue_mode, q_actual, tr, tc, tfc, tvc,
     direct_cost, allocated_cost, r_per_head, avc, atc, cm,
     q_star, q_star_status, q_star_method, be_revenue, margin_of_safety, profit_loss)
  SELECT p_run_id, g.scope, g.scope_id, g.mode, g.q, g.tr, g.tc, g.tfc, g.tvc,
         g.direct_cost, g.allocated_cost, g.r, g.avc,
         CASE WHEN g.q > 0 THEN g.tc / g.q END,
         CASE WHEN g.q > 0 THEN g.r - g.avc END,
         CASE meth.m WHEN 'sum_of_programs' THEN g.q_star_sum ELSE k.q_star END,
         CASE meth.m WHEN 'sum_of_programs'
              THEN (CASE WHEN g.q_star_sum IS NULL THEN 'not_computable'::qstar_status
                         ELSE 'normal'::qstar_status END)
              ELSE k.q_star_status END,
         meth.m,
         CASE WHEN (CASE meth.m WHEN 'sum_of_programs' THEN g.q_star_sum ELSE k.q_star END) IS NOT NULL
              THEN round((CASE meth.m WHEN 'sum_of_programs' THEN g.q_star_sum ELSE k.q_star END) * g.r, 2) END,
         CASE WHEN (CASE meth.m WHEN 'sum_of_programs' THEN g.q_star_sum ELSE k.q_star END) IS NOT NULL
              THEN round(g.tr - (CASE meth.m WHEN 'sum_of_programs' THEN g.q_star_sum ELSE k.q_star END) * g.r, 2) END,
         g.tr - g.tc
    FROM (
      SELECT sc.scope, sc.scope_id, r.revenue_mode AS mode,
             sum(r.q_actual)::int AS q,
             sum(r.tr)::numeric(20,2) AS tr, sum(r.tc)::numeric(20,2) AS tc,
             sum(r.tfc)::numeric(20,2) AS tfc, sum(r.tvc)::numeric(20,2) AS tvc,
             sum(r.direct_cost)::numeric(20,2) AS direct_cost,
             sum(r.allocated_cost)::numeric(20,2) AS allocated_cost,
             CASE WHEN sum(r.q_actual) > 0 THEN sum(r.tr) / sum(r.q_actual) END AS r,
             CASE WHEN sum(r.q_actual) > 0 THEN sum(r.tvc) / sum(r.q_actual) END AS avc,
             CASE WHEN count(*) FILTER (WHERE r.q_star IS NULL) > 0 THEN NULL
                  ELSE sum(r.q_star) END AS q_star_sum
        FROM break_even_result r
        JOIN program_version pv ON pv.program_version_id = r.scope_id
        JOIN program pr         ON pr.program_id = pv.program_id
        JOIN org_unit lvl       ON lvl.org_unit_id = pr.org_unit_id
        CROSS JOIN LATERAL (VALUES
            ('education_level'::scope_level, lvl.org_unit_id),
            ('faculty'::scope_level,         lvl.parent_org_unit_id),
            ('university'::scope_level,      NULL::bigint)
        ) sc(scope, scope_id)
       WHERE r.allocation_run_id = p_run_id AND r.scope = 'program'
       GROUP BY sc.scope, sc.scope_id, r.revenue_mode
    ) g
    CROSS JOIN (VALUES ('sum_of_programs'::qstar_method),('pooled'::qstar_method)) meth(m)
    CROSS JOIN LATERAL calc_qstar(g.tfc, g.tc, g.r, g.avc, v_cm_policy, v_rounding) k;
END; $$;
