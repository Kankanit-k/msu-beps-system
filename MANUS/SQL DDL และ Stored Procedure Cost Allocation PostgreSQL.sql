-- BEPS Target ER: PostgreSQL reference implementation
-- Assumptions:
-- 1) PostgreSQL 15+; monetary values use numeric(20,2).
-- 2) Source ERP and registration systems are loaded into staging/source tables.
-- 3) Allocation is immutable by run: corrections create a new run, not an overwrite.
-- 4) One allocation run is scoped to fiscal_year, academic_year, and organization.

CREATE SCHEMA IF NOT EXISTS beps;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE beps.cost_behavior AS ENUM ('FIXED','VARIABLE','MIXED','UNCLASSIFIED');
CREATE TYPE beps.mapping_status AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','RETIRED');
CREATE TYPE beps.run_status AS ENUM ('DRAFT','RUNNING','CALCULATED','VALIDATED','APPROVED','POSTED','CANCELLED','FAILED');
CREATE TYPE beps.allocation_method AS ENUM ('DIRECT','ACTUAL_USAGE','STUDENT_HEADCOUNT','PROGRAM_SHARE');

CREATE TABLE beps.import_batch (
    import_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system varchar(50) NOT NULL,
    source_file_name text,
    source_file_hash char(64),
    received_at timestamptz NOT NULL DEFAULT now(),
    received_by varchar(100) NOT NULL,
    record_count integer CHECK (record_count >= 0),
    status varchar(20) NOT NULL DEFAULT 'LOADED' CHECK (status IN ('LOADED','VALIDATED','REJECTED','ARCHIVED')),
    validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_system, source_file_hash)
);

CREATE TABLE beps.dim_period (
    period_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2200),
    academic_year integer CHECK (academic_year BETWEEN 2000 AND 2200),
    semester varchar(20),
    period_start date NOT NULL,
    period_end date NOT NULL,
    CHECK (period_end >= period_start),
    UNIQUE (fiscal_year, academic_year, semester)
);

CREATE TABLE beps.dim_organization (
    organization_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_code varchar(50) NOT NULL,
    organization_name text NOT NULL,
    parent_organization_id bigint REFERENCES beps.dim_organization(organization_id),
    organization_level varchar(30) NOT NULL CHECK (organization_level IN ('UNIVERSITY','FACULTY','DEPARTMENT','COST_CENTER','OTHER')),
    valid_from date NOT NULL,
    valid_to date,
    status beps.mapping_status NOT NULL DEFAULT 'DRAFT',
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    UNIQUE (organization_code, valid_from)
);

CREATE TABLE beps.dim_program (
    program_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    program_code varchar(80) NOT NULL,
    program_name text NOT NULL,
    organization_id bigint NOT NULL REFERENCES beps.dim_organization(organization_id),
    degree_level varchar(30),
    delivery_mode varchar(30),
    valid_from date NOT NULL,
    valid_to date,
    status beps.mapping_status NOT NULL DEFAULT 'DRAFT',
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    UNIQUE (program_code, valid_from)
);

CREATE TABLE beps.dim_student_type (
    student_type_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_type_code varchar(50) NOT NULL UNIQUE,
    student_type_name text NOT NULL,
    nationality_group varchar(50),
    study_mode varchar(50),
    valid_from date NOT NULL,
    valid_to date,
    status beps.mapping_status NOT NULL DEFAULT 'DRAFT',
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE beps.dim_erp_account (
    erp_account_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_code varchar(50) NOT NULL,
    budget_category_code varchar(50) NOT NULL,
    expenditure_category_code varchar(50) NOT NULL,
    subcategory_code varchar(50) NOT NULL,
    account_name text,
    valid_from date NOT NULL,
    valid_to date,
    status beps.mapping_status NOT NULL DEFAULT 'DRAFT',
    UNIQUE (plan_code, budget_category_code, expenditure_category_code, subcategory_code, valid_from),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE beps.account_behavior_rule (
    behavior_rule_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    erp_account_id bigint NOT NULL REFERENCES beps.dim_erp_account(erp_account_id),
    organization_id bigint REFERENCES beps.dim_organization(organization_id),
    period_id bigint REFERENCES beps.dim_period(period_id),
    behavior beps.cost_behavior NOT NULL,
    fixed_ratio numeric(9,8) NOT NULL DEFAULT 0 CHECK (fixed_ratio BETWEEN 0 AND 1),
    variable_ratio numeric(9,8) NOT NULL DEFAULT 0 CHECK (variable_ratio BETWEEN 0 AND 1),
    allocation_method beps.allocation_method,
    priority smallint NOT NULL DEFAULT 100 CHECK (priority >= 0),
    status beps.mapping_status NOT NULL DEFAULT 'DRAFT',
    approved_by varchar(100),
    approved_at timestamptz,
    valid_from date NOT NULL,
    valid_to date,
    CHECK (fixed_ratio + variable_ratio = 1),
    CHECK ((behavior = 'FIXED' AND fixed_ratio = 1 AND variable_ratio = 0)
        OR (behavior = 'VARIABLE' AND fixed_ratio = 0 AND variable_ratio = 1)
        OR (behavior = 'MIXED' AND fixed_ratio > 0 AND variable_ratio > 0)
        OR (behavior = 'UNCLASSIFIED')),
    CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE beps.erp_cost_source (
    erp_cost_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    import_batch_id uuid NOT NULL REFERENCES beps.import_batch(import_batch_id),
    source_record_id text NOT NULL,
    period_id bigint NOT NULL REFERENCES beps.dim_period(period_id),
    organization_id bigint NOT NULL REFERENCES beps.dim_organization(organization_id),
    erp_account_id bigint NOT NULL REFERENCES beps.dim_erp_account(erp_account_id),
    program_id bigint REFERENCES beps.dim_program(program_id),
    amount numeric(20,2) NOT NULL CHECK (amount >= 0),
    currency char(3) NOT NULL DEFAULT 'THB',
    amount_basis varchar(30) NOT NULL DEFAULT 'ACTUAL' CHECK (amount_basis IN ('ACTUAL','COMMITTED','BUDGET')),
    source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    loaded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (import_batch_id, source_record_id)
);

CREATE TABLE beps.registration_snapshot (
    registration_snapshot_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    import_batch_id uuid NOT NULL REFERENCES beps.import_batch(import_batch_id),
    period_id bigint NOT NULL REFERENCES beps.dim_period(period_id),
    program_id bigint NOT NULL REFERENCES beps.dim_program(program_id),
    student_type_id bigint NOT NULL REFERENCES beps.dim_student_type(student_type_id),
    snapshot_date date NOT NULL,
    student_count integer NOT NULL CHECK (student_count >= 0),
    revenue_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (revenue_amount >= 0),
    UNIQUE (import_batch_id, period_id, program_id, student_type_id, snapshot_date)
);

CREATE TABLE beps.allocation_driver_value (
    driver_value_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_id bigint NOT NULL REFERENCES beps.dim_period(period_id),
    organization_id bigint NOT NULL REFERENCES beps.dim_organization(organization_id),
    program_id bigint NOT NULL REFERENCES beps.dim_program(program_id),
    driver_code varchar(40) NOT NULL CHECK (driver_code IN ('STUDENT_HEADCOUNT','ACTUAL_USAGE','PROGRAM_SHARE')),
    driver_value numeric(20,8) NOT NULL CHECK (driver_value >= 0),
    source_reference text,
    UNIQUE (period_id, organization_id, program_id, driver_code)
);

CREATE TABLE beps.allocation_run (
    allocation_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id bigint NOT NULL REFERENCES beps.dim_period(period_id),
    organization_id bigint NOT NULL REFERENCES beps.dim_organization(organization_id),
    source_cost_basis varchar(20) NOT NULL CHECK (source_cost_basis IN ('ACTUAL','COMMITTED','BUDGET')),
    rule_version varchar(50) NOT NULL,
    status beps.run_status NOT NULL DEFAULT 'DRAFT',
    created_by varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    approved_by varchar(100),
    approved_at timestamptz,
    error_message text,
    CHECK (status NOT IN ('APPROVED','POSTED') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE beps.allocation_result (
    allocation_result_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    allocation_run_id uuid NOT NULL REFERENCES beps.allocation_run(allocation_run_id),
    erp_cost_id bigint NOT NULL REFERENCES beps.erp_cost_source(erp_cost_id),
    program_id bigint NOT NULL REFERENCES beps.dim_program(program_id),
    behavior beps.cost_behavior NOT NULL,
    allocation_method beps.allocation_method NOT NULL,
    driver_value numeric(20,8) NOT NULL,
    driver_total numeric(20,8) NOT NULL,
    allocation_ratio numeric(20,12) NOT NULL CHECK (allocation_ratio BETWEEN 0 AND 1),
    allocated_amount numeric(20,2) NOT NULL CHECK (allocated_amount >= 0),
    quality_flag varchar(30) NOT NULL DEFAULT 'PASS' CHECK (quality_flag IN ('PASS','ESTIMATED','UNCLASSIFIED','MISSING_DRIVER','MANUAL_OVERRIDE')),
    calculation_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (allocation_run_id, erp_cost_id, program_id)
);

CREATE TABLE beps.reconciliation_control (
    reconciliation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    allocation_run_id uuid NOT NULL REFERENCES beps.allocation_run(allocation_run_id),
    source_total numeric(20,2) NOT NULL,
    allocated_total numeric(20,2) NOT NULL,
    difference numeric(20,2) GENERATED ALWAYS AS (source_total - allocated_total) STORED,
    tolerance numeric(20,2) NOT NULL DEFAULT 0.01 CHECK (tolerance >= 0),
    status varchar(20) NOT NULL CHECK (status IN ('PASS','FAIL')),
    checked_at timestamptz NOT NULL DEFAULT now(),
    checked_by varchar(100) NOT NULL
);

CREATE TABLE beps.audit_event (
    audit_event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_time timestamptz NOT NULL DEFAULT now(),
    actor varchar(100) NOT NULL,
    action varchar(50) NOT NULL,
    entity_type varchar(80) NOT NULL,
    entity_id text NOT NULL,
    request_id text,
    reason text,
    before_payload jsonb,
    after_payload jsonb,
    source_ip inet,
    event_hash char(64),
    previous_event_hash char(64)
);

CREATE INDEX ix_erp_cost_period_org ON beps.erp_cost_source(period_id, organization_id, erp_account_id);
CREATE INDEX ix_driver_lookup ON beps.allocation_driver_value(period_id, organization_id, program_id, driver_code);
CREATE INDEX ix_result_run_program ON beps.allocation_result(allocation_run_id, program_id);
CREATE INDEX ix_audit_entity ON beps.audit_event(entity_type, entity_id, event_time);

-- Prevent overlapping approved behavior rules for the same account/context.
CREATE UNIQUE INDEX ux_approved_rule_scope
ON beps.account_behavior_rule (erp_account_id, COALESCE(organization_id,0), COALESCE(period_id,0), valid_from)
WHERE status = 'APPROVED';

CREATE OR REPLACE FUNCTION beps.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor text := COALESCE(current_setting('beps.actor', true), current_user);
    v_request text := current_setting('beps.request_id', true);
BEGIN
    INSERT INTO beps.audit_event(actor, action, entity_type, entity_id, request_id, before_payload, after_payload)
    VALUES (
        v_actor,
        TG_OP,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        COALESCE((to_jsonb(NEW)->>TG_ARGV[0]), (to_jsonb(OLD)->>TG_ARGV[0]), '?'),
        v_request,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_behavior_rule
AFTER INSERT OR UPDATE OR DELETE ON beps.account_behavior_rule
FOR EACH ROW EXECUTE FUNCTION beps.audit_row_change('behavior_rule_id');

CREATE TRIGGER trg_audit_allocation_run
AFTER INSERT OR UPDATE OR DELETE ON beps.allocation_run
FOR EACH ROW EXECUTE FUNCTION beps.audit_row_change('allocation_run_id');

CREATE OR REPLACE PROCEDURE beps.run_cost_allocation(
    p_allocation_run_id uuid,
    p_actor varchar,
    p_tolerance numeric DEFAULT 0.01
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_id bigint;
    v_org_id bigint;
    v_basis varchar(20);
    v_source_total numeric(20,2);
    v_allocated_total numeric(20,2);
    v_difference numeric(20,2);
    v_run_status beps.run_status;
BEGIN
    PERFORM set_config('beps.actor', COALESCE(p_actor,current_user), true);
    PERFORM set_config('beps.request_id', p_allocation_run_id::text, true);

    SELECT period_id, organization_id, source_cost_basis, status
      INTO v_period_id, v_org_id, v_basis, v_run_status
      FROM beps.allocation_run
     WHERE allocation_run_id = p_allocation_run_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Allocation run % does not exist', p_allocation_run_id;
    END IF;
    IF v_run_status NOT IN ('DRAFT','FAILED') THEN
        RAISE EXCEPTION 'Allocation run % cannot be recalculated from status %', p_allocation_run_id, v_run_status;
    END IF;

    UPDATE beps.allocation_run
       SET status = 'RUNNING', started_at = now(), completed_at = NULL, error_message = NULL
     WHERE allocation_run_id = p_allocation_run_id;

    DELETE FROM beps.allocation_result WHERE allocation_run_id = p_allocation_run_id;

    -- Direct rows: preserve program assignment when ERP already contains it.
    INSERT INTO beps.allocation_result (
        allocation_run_id, erp_cost_id, program_id, behavior, allocation_method,
        driver_value, driver_total, allocation_ratio, allocated_amount, quality_flag, calculation_payload
    )
    SELECT r.allocation_run_id, c.erp_cost_id, c.program_id,
           COALESCE(rule.behavior, 'UNCLASSIFIED'), 'DIRECT',
           1, 1, 1, c.amount,
           CASE WHEN rule.behavior IS NULL THEN 'UNCLASSIFIED' ELSE 'PASS' END,
           jsonb_build_object('basis', 'direct_trace', 'rule_id', rule.behavior_rule_id)
      FROM beps.erp_cost_source c
      JOIN beps.allocation_run r ON r.allocation_run_id = p_allocation_run_id
      LEFT JOIN LATERAL (
          SELECT abr.*
            FROM beps.account_behavior_rule abr
           WHERE abr.erp_account_id = c.erp_account_id
             AND abr.status = 'APPROVED'
             AND c.period_id = COALESCE(abr.period_id, c.period_id)
             AND c.organization_id = COALESCE(abr.organization_id, c.organization_id)
             AND c.period_id IS NOT NULL
           ORDER BY abr.priority ASC, abr.valid_from DESC
           LIMIT 1
      ) rule ON TRUE
     WHERE c.period_id = v_period_id
       AND c.organization_id = v_org_id
       AND c.amount_basis = v_basis
       AND c.program_id IS NOT NULL;

    -- Allocated rows: only cost without a program assignment is allocated.
    INSERT INTO beps.allocation_result (
        allocation_run_id, erp_cost_id, program_id, behavior, allocation_method,
        driver_value, driver_total, allocation_ratio, allocated_amount, quality_flag, calculation_payload
    )
    SELECT p_allocation_run_id, c.erp_cost_id, d.program_id,
           COALESCE(rule.behavior, 'UNCLASSIFIED'),
           COALESCE(rule.allocation_method, 'STUDENT_HEADCOUNT'),
           d.driver_value, totals.driver_total,
           CASE WHEN totals.driver_total = 0 THEN 0 ELSE d.driver_value / totals.driver_total END,
           CASE WHEN totals.driver_total = 0 THEN 0 ELSE round(c.amount * d.driver_value / totals.driver_total, 2) END,
           CASE WHEN rule.behavior IS NULL THEN 'UNCLASSIFIED'
                WHEN totals.driver_total = 0 THEN 'MISSING_DRIVER'
                WHEN COALESCE(rule.allocation_method, 'STUDENT_HEADCOUNT') = 'PROGRAM_SHARE' THEN 'ESTIMATED'
                ELSE 'PASS' END,
           jsonb_build_object('basis', 'allocated', 'driver_code', d.driver_code,
                              'driver_total', totals.driver_total,
                              'rule_id', rule.behavior_rule_id)
      FROM beps.erp_cost_source c
      JOIN beps.allocation_run r ON r.allocation_run_id = p_allocation_run_id
      LEFT JOIN LATERAL (
          SELECT abr.*
            FROM beps.account_behavior_rule abr
           WHERE abr.erp_account_id = c.erp_account_id
             AND abr.status = 'APPROVED'
             AND c.period_id = COALESCE(abr.period_id, c.period_id)
             AND c.organization_id = COALESCE(abr.organization_id, c.organization_id)
           ORDER BY abr.priority ASC, abr.valid_from DESC
           LIMIT 1
      ) rule ON TRUE
      JOIN beps.allocation_driver_value d
        ON d.period_id = c.period_id
       AND d.organization_id = c.organization_id
       AND d.driver_code = CASE COALESCE(rule.allocation_method, 'STUDENT_HEADCOUNT')
                               WHEN 'ACTUAL_USAGE' THEN 'ACTUAL_USAGE'
                               WHEN 'PROGRAM_SHARE' THEN 'PROGRAM_SHARE'
                               ELSE 'STUDENT_HEADCOUNT' END
      JOIN LATERAL (
          SELECT sum(d2.driver_value) AS driver_total
            FROM beps.allocation_driver_value d2
           WHERE d2.period_id = c.period_id
             AND d2.organization_id = c.organization_id
             AND d2.driver_code = d.driver_code
      ) totals ON TRUE
     WHERE c.period_id = v_period_id
       AND c.organization_id = v_org_id
       AND c.amount_basis = v_basis
       AND c.program_id IS NULL;

    SELECT COALESCE(sum(amount),0)
      INTO v_source_total
      FROM beps.erp_cost_source
     WHERE period_id = v_period_id AND organization_id = v_org_id AND amount_basis = v_basis;

    SELECT COALESCE(sum(allocated_amount),0)
      INTO v_allocated_total
      FROM beps.allocation_result
     WHERE allocation_run_id = p_allocation_run_id;

    v_difference := round(v_source_total - v_allocated_total, 2);

    INSERT INTO beps.reconciliation_control(
        allocation_run_id, source_total, allocated_total, tolerance, status, checked_by
    ) VALUES (
        p_allocation_run_id, v_source_total, v_allocated_total, p_tolerance,
        CASE WHEN abs(v_difference) <= p_tolerance THEN 'PASS' ELSE 'FAIL' END,
        p_actor
    );

    IF abs(v_difference) > p_tolerance THEN
        UPDATE beps.allocation_run
           SET status = 'FAILED', completed_at = now(), error_message = format('Reconciliation failed: difference=%s', v_difference)
         WHERE allocation_run_id = p_allocation_run_id;
        RAISE EXCEPTION 'Reconciliation failed for run %, difference=%', p_allocation_run_id, v_difference;
    END IF;

    UPDATE beps.allocation_run
       SET status = 'CALCULATED', completed_at = now()
     WHERE allocation_run_id = p_allocation_run_id;
END;
$$;

-- Example execution:
-- CALL beps.run_cost_allocation('00000000-0000-0000-0000-000000000000', 'analyst@example.org', 0.01);

-- Recommended approval transition (application should enforce maker-checker):
-- UPDATE beps.allocation_run
--    SET status='APPROVED', approved_by='controller@example.org', approved_at=now()
--  WHERE allocation_run_id = ... AND status='VALIDATED';

-- Recommended reporting view:
CREATE OR REPLACE VIEW beps.v_program_cost_summary AS
SELECT ar.allocation_run_id,
       ar.period_id,
       ar.organization_id,
       r.program_id,
       sum(r.allocated_amount) FILTER (WHERE r.behavior = 'FIXED') AS fixed_cost,
       sum(r.allocated_amount) FILTER (WHERE r.behavior = 'VARIABLE') AS variable_cost,
       sum(r.allocated_amount) FILTER (WHERE r.behavior = 'MIXED') AS mixed_classified_cost,
       sum(r.allocated_amount) AS total_cost,
       count(*) FILTER (WHERE r.quality_flag <> 'PASS') AS flagged_rows
  FROM beps.allocation_run ar
  JOIN beps.allocation_result r ON r.allocation_run_id = ar.allocation_run_id
 GROUP BY ar.allocation_run_id, ar.period_id, ar.organization_id, r.program_id;

-- Production hardening checklist:
-- * Replace the example rule lookup with a temporal exclusion constraint or a validated rule resolver.
-- * Add RLS policies by organization and role.
-- * Move audit_event writes to a controlled SECURITY DEFINER function owned by an audit role.
-- * Add an immutable hash-chain job for audit_event and export signed audit packages.
-- * Add a separate rounding adjustment line so allocation totals reconcile exactly without hidden drift.
-- * Test direct, allocated, mixed, missing-driver, duplicate-import, and rerun scenarios before approval.

/* References
[1] PostgreSQL Documentation — CREATE TABLE: https://www.postgresql.org/docs/current/sql-createtable.html
[2] PostgreSQL Documentation — PL/pgSQL: https://www.postgresql.org/docs/current/plpgsql.html
[3] PostgreSQL Documentation — CREATE TRIGGER: https://www.postgresql.org/docs/current/sql-createtrigger.html
*/
