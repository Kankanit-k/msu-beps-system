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
-- คำนวณจุดคุ้มทุนจากตัวเลขสรุป — สูตร 1 และสูตร 7 (SA.md หัวข้อ 7.1)
--   คืน (q_star, q_star_status)
--   ปัดขึ้นเสมอ เพราะรับนิสิต 238.4 คนไม่ได้ ต้องรับ 239 คนจึงคุ้ม
--   (ยังเป็นข้อตัดสินใจ B ที่รอยืนยัน — prototype เดิมใช้ round)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calc_qstar(
  p_tfc numeric, p_tc numeric, p_r numeric, p_avc numeric
) RETURNS TABLE (q_star numeric, q_star_status qstar_status)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_cm numeric;
BEGIN
  IF p_r IS NULL OR p_avc IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, 'not_computable'::qstar_status; RETURN;
  END IF;
  v_cm := p_r - p_avc;
  IF v_cm > 0 THEN
    RETURN QUERY SELECT ceil(p_tfc / v_cm)::numeric, 'normal'::qstar_status;
  ELSIF p_r > 0 THEN
    -- สูตร 7: AVC สูงกว่า R → ไม่มีจุดคุ้มทุนจริง ใช้เป้าหมายขั้นต่ำแบบ Full-Cost Recovery
    RETURN QUERY SELECT ceil(p_tc / p_r)::numeric, 'full_cost_recovery'::qstar_status;
  ELSE
    RETURN QUERY SELECT NULL::numeric, 'not_computable'::qstar_status;
  END IF;
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

  DELETE FROM allocation_result       WHERE allocation_run_id = p_run_id;
  DELETE FROM reconciliation_control  WHERE allocation_run_id = p_run_id;
  DELETE FROM data_quality_issue      WHERE allocation_run_id = p_run_id;
  DELETE FROM program_cost_summary    WHERE allocation_run_id = p_run_id;

  -- ── ขั้น 1: หากติกา behavior ของแต่ละรายการต้นทุน ─────────────────────────
  CREATE TEMP TABLE _cost ON COMMIT DROP AS
  SELECT c.cost_source_id,
         c.program_version_id,
         c.amount,
         COALESCE(r.behavior, CASE WHEN c.source_type='DEPRECIATION' THEN 'FIXED'::cost_behavior
                                   ELSE 'UNCLASSIFIED'::cost_behavior END)              AS behavior,
         COALESCE(r.fixed_ratio,    CASE WHEN c.source_type='DEPRECIATION' THEN 1 ELSE 0 END) AS fixed_ratio,
         COALESCE(r.variable_ratio, 0)                                                   AS variable_ratio,
         COALESCE(r.allocation_method_code, 'STUDENT_HEADCOUNT'::alloc_method)           AS method,
         (r.behavior IS NULL AND c.source_type <> 'DEPRECIATION')                        AS is_unclassified
    FROM cost_source c
    JOIN dim_period p ON p.period_id = c.period_id
    LEFT JOIN LATERAL (
      SELECT abr.*
        FROM account_behavior_rule abr
       WHERE abr.erp_account_id = c.erp_account_id
         AND abr.status = 'APPROVED'
         AND (abr.org_unit_id IS NULL OR abr.org_unit_id = c.org_unit_id)
         AND daterange(abr.valid_from, abr.valid_to, '[]') @> p.period_start
       ORDER BY abr.priority ASC, abr.org_unit_id NULLS LAST, abr.valid_from DESC
       LIMIT 1
    ) r ON TRUE
   WHERE c.period_id = v_period AND c.org_unit_id = v_org AND c.basis = v_basis;

  -- ── ขั้น 2: แตกเป็น leg (แก้ #2 — MIXED กลายเป็น 2 pool จริง) ─────────────
  --    ปัดเศษระดับ leg ด้วย largest-remainder เพื่อให้ผลรวม leg = amount ของรายการนั้นพอดี
  CREATE TEMP TABLE _leg ON COMMIT DROP AS
  WITH raw AS (
    SELECT c.cost_source_id, c.program_version_id, c.amount, c.method, c.is_unclassified,
           l.behavior, c.amount * l.ratio AS raw_amt
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
  CREATE TEMP TABLE _pool ON COMMIT DROP AS
  SELECT l.*,
         COALESCE(t.driver_total, 0) AS driver_total
    FROM _leg l
    LEFT JOIN LATERAL (
      SELECT sum(d.driver_value) AS driver_total
        FROM allocation_driver_value d
       WHERE d.period_id = v_period AND d.org_unit_id = v_org AND d.driver_code = l.method
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
           d.program_version_id, d.driver_value, p.driver_total,
           p.leg_amount * d.driver_value / p.driver_total AS raw_amt
      FROM _pool p
      JOIN allocation_driver_value d
        ON d.period_id = v_period AND d.org_unit_id = v_org AND d.driver_code = p.method
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
         CASE WHEN is_unclassified               THEN 'UNCLASSIFIED'::quality_flag
              WHEN method = 'PROGRAM_SHARE'      THEN 'ESTIMATED'::quality_flag
              ELSE 'PASS'::quality_flag END
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
DECLARE v_period bigint;
BEGIN
  SELECT period_id INTO v_period FROM allocation_run WHERE allocation_run_id = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบ run %', p_run_id; END IF;

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
    CROSS JOIN LATERAL calc_qstar(b.tfc, b.tc, b.r, b.avc) k;

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
    CROSS JOIN LATERAL calc_qstar(g.tfc, g.tc, g.r, g.avc) k;
END; $$;
