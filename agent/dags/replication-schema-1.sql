CREATE TABLE IF NOT EXISTS redactics_oid_mapping (
    "id" bigserial,
    "table_name" varchar,
    "oid" oid
);

CREATE INDEX IF NOT EXISTS "redactics_oids" ON public.redactics_oid_mapping (oid);

CREATE TABLE IF NOT EXISTS redactics_masking_rules (
    "id" bigserial,
    "schema" varchar,
    "table_name" varchar,
    "column_name" varchar,
    "rule" varchar,
    "redact_data" jsonb,
    "updated_at" timestamp
);
CREATE INDEX IF NOT EXISTS "redactics_rule_schemas" ON public.redactics_masking_rules (schema);
CREATE INDEX IF NOT EXISTS "redactics_rule_table_names" ON public.redactics_masking_rules (table_name);
CREATE INDEX IF NOT EXISTS "redactics_rule_column_names" ON public.redactics_masking_rules (column_name);
CREATE INDEX IF NOT EXISTS "redactics_rule_updated_at" ON public.redactics_masking_rules (updated_at);

CREATE TABLE IF NOT EXISTS redactics_landingdb_users (
    "id" bigserial,
    "username" varchar
);
CREATE INDEX IF NOT EXISTS "redactics_users" ON public.redactics_landingdb_users (username);

CREATE TABLE IF NOT EXISTS redactics_quarantine_log (
    "id" bigserial,
    "schema" varchar,
    "table_name" varchar,
    "created_at" timestamp
);
CREATE INDEX IF NOT EXISTS "redactics_quarantine_log_created_at" ON public.redactics_quarantine_log (created_at);

DO $$ BEGIN
    CREATE TYPE scanaction AS ENUM ('accept', 'reject', 'ignore');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS redactics_quarantine_results (
    "id" bigserial,
    "schema" varchar,
    "table_name" varchar,
    "primary_key" varchar,
    "primary_key_name" varchar,
    "primary_key_type" varchar,
    "column_name" varchar,
    "scan_value" varchar,
    "scan_result" jsonb,
    "scan_action" scanaction,
    "created_at" timestamp
);
CREATE INDEX IF NOT EXISTS "redactics_quarantine_results_scan_action" ON public.redactics_quarantine_results (scan_action);
