CREATE OR REPLACE FUNCTION insert_redactics_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    target_schema varchar;
    target_table varchar;
    redacted_columns varchar;
    json_record jsonb;
    pk record;
    pk_val_int bigint;
    pk_val_string varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
    target_schema := quote_ident('r_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));

    if (source_schema NOT LIKE 'r\_%' AND source_schema NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        redacted_columns := (SELECT anon.mask_filters(TG_ARGV[1]::REGCLASS));
        json_record := row_to_json(NEW);
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');
                EXECUTE 'INSERT INTO ' || target_schema || '.' || target_table || ' SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''';
            else
                pk_val_int := jsonb_extract_path(json_record, pk.attname);
                EXECUTE 'INSERT INTO ' || target_schema || '.' || target_table || ' SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ' WHERE ' || pk.attname || ' = ' || pk_val_int;
            END IF;
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION insert_redactics_dlp_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    target_schema varchar;
    target_table varchar;
    redacted_columns varchar;
    json_record jsonb;
    pk record;
    pk_val_int bigint;
    pk_val_string varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
    target_schema := quote_ident('rq_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));

    if (source_schema NOT LIKE 'r\_%' AND source_schema NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        redacted_columns := (SELECT anon.mask_filters(TG_ARGV[1]::REGCLASS));
        json_record := row_to_json(NEW);
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');
                EXECUTE 'INSERT INTO ' || target_schema || '.' || target_table || ' SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''';
            else
                pk_val_int := jsonb_extract_path(json_record, pk.attname);
                EXECUTE 'INSERT INTO ' || target_schema || '.' || target_table || ' SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ' WHERE ' || pk.attname || ' = ' || pk_val_int;
            END IF;

            -- DLP queue
            EXECUTE 'INSERT INTO public.redactics_quarantine_log ("schema", "table_name", "created_at") VALUES (''' || target_schema || ''', ''' || target_table || ''', current_timestamp)';
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_redactics_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    target_schema varchar;
    target_table varchar;
    redacted_columns varchar;
    json_record jsonb;
    pk record;
    pk_val_int bigint;
    pk_val_string varchar;
    col record;
    cols_arr varchar[];
    cols varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
    target_schema := quote_ident('r_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));
    redacted_columns := (SELECT anon.mask_filters(TG_ARGV[1]::REGCLASS));
    json_record := row_to_json(NEW);

    if (source_schema NOT LIKE 'r\_%' AND source_schema NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        -- get columns
        FOR col IN EXECUTE 'SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || quote_ident(TG_ARGV[0]) || ''' AND table_name = ''' || target_table || ''''
        LOOP
            cols_arr := array_append(cols_arr, col.column_name || '=source_table.' || col.column_name);
        END LOOP;
        cols := array_to_string(cols_arr, ',');
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');
                EXECUTE 'UPDATE ' || target_schema || '.' || target_table || ' SET ' || cols || ' FROM (SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ''' || pk_val_string || ''' AND source_table.' || pk.attname || ' = ' || target_schema || '.' || target_table || '.' || pk.attname;
            else
                pk_val_int := jsonb_extract_path(json_record, pk.attname);
                EXECUTE 'UPDATE ' || target_schema || '.' || target_table || ' SET ' || cols || ' FROM (SELECT ' || redacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ' || pk_val_int || ' AND source_table.' || pk.attname || ' = ' || target_schema || '.' || target_table || '.' || pk.attname;
            END IF;
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_redactics_dlp_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    quarantine_schema varchar;
    target_schema varchar;
    target_table varchar;
    redacted_columns varchar;
    unredacted_columns varchar;
    json_record jsonb;
    pk record;
    target_check record;
    pk_val_int bigint;
    pk_val_string varchar;
    col record;
    cols_arr varchar[];
    quarantine_cols_arr varchar[];
    cols varchar;
    quarantine_cols varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
    quarantine_schema := quote_ident('rq_' || source_schema);
    target_schema := quote_ident('r_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));
    EXECUTE 'SELECT anon.mask_filters(''' || quarantine_schema || '.' || target_table || '''::REGCLASS)' INTO redacted_columns;
    unredacted_columns := (SELECT anon.mask_filters(TG_ARGV[1]::REGCLASS));
    json_record := row_to_json(NEW);

    if (source_schema NOT LIKE 'r\_%' AND source_schema NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        -- get columns
        FOR col IN EXECUTE 'SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || quote_ident(TG_ARGV[0]) || ''' AND table_name = ''' || target_table || ''''
        LOOP
            cols_arr := array_append(cols_arr, col.column_name || '=source_table.' || col.column_name);
        END LOOP;
        -- get primary key
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            -- append redactics injected field to quarantine table column listing
            quarantine_cols_arr := array_append(cols_arr, 'r_sensitive_data_scan = NULL');
            quarantine_cols := array_to_string(quarantine_cols_arr, ',');
            cols := array_to_string(cols_arr, ',');

            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');

                -- check if entry has passed quarantine
                EXECUTE 'SELECT ' || pk.attname || ' FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''' INTO target_check;
                if (target_check IS NOT NULL) then
                    -- skip quarantine, update quaranting landing and target tables
                    EXECUTE 'UPDATE ' || quarantine_schema || '.' || target_table || ' SET ' || quarantine_cols || ' FROM (SELECT ' || unredacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ''' || pk_val_string || ''' AND source_table.' || pk.attname || ' = ' || quarantine_schema || '.' || target_table || '.' || pk.attname;
                    EXECUTE 'UPDATE ' || target_schema || '.' || target_table || ' SET ' || cols || ' FROM (SELECT ' || redacted_columns || ' FROM ' || quarantine_schema || '.' || target_table || ') AS source_table WHERE source_table.' || pk.attname || ' = ''' || pk_val_string || ''' AND source_table.' || pk.attname || ' = ' || target_schema || '.' || target_table || '.' || pk.attname;
                else
                    EXECUTE 'UPDATE ' || quarantine_schema || '.' || target_table || ' SET ' || quarantine_cols || ' FROM (SELECT ' || unredacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ''' || pk_val_string || ''' AND source_table.' || pk.attname || ' = ' || quarantine_schema || '.' || target_table || '.' || pk.attname;
                    -- DLP queue
                    EXECUTE 'INSERT INTO public.redactics_quarantine_log ("schema", "table_name", "created_at") VALUES (''' || quarantine_schema || ''', ''' || target_table || ''', current_timestamp)';
                END IF;
            else
                -- numeric primary key
                pk_val_int := jsonb_extract_path(json_record, pk.attname);

                -- check if entry has passed quarantine
                EXECUTE 'SELECT ' || pk.attname || ' FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ' || pk_val_int INTO target_check;
                if (target_check IS NOT NULL) then
                    -- skip quarantine, update quaranting landing and target tables
                    EXECUTE 'UPDATE ' || quarantine_schema || '.' || target_table || ' SET ' || quarantine_cols || ' FROM (SELECT ' || unredacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ' || pk_val_int || ' AND source_table.' || pk.attname || ' = ' || quarantine_schema || '.' || target_table || '.' || pk.attname;
                    EXECUTE 'UPDATE ' || target_schema || '.' || target_table || ' SET ' || cols || ' FROM (SELECT ' || redacted_columns || ' FROM ' || quarantine_schema || '.' || target_table || ') AS source_table WHERE source_table.' || pk.attname || ' = ' || pk_val_int || ' AND source_table.' || pk.attname || ' = ' || target_schema || '.' || target_table || '.' || pk.attname;
                else
                    -- use quarantine_cols to reset r_sensitive_data_scan to trigger scan
                    EXECUTE 'UPDATE ' || quarantine_schema || '.' || target_table || ' SET ' || quarantine_cols || ' FROM (SELECT ' || unredacted_columns || ' FROM ' || TG_ARGV[1] || ') AS source_table WHERE source_table.' || pk.attname || ' = ' || pk_val_int || ' AND source_table.' || pk.attname || ' = ' || quarantine_schema || '.' || target_table || '.' || pk.attname;
                    -- DLP queue
                    EXECUTE 'INSERT INTO public.redactics_quarantine_log ("schema", "table_name", "created_at") VALUES (''' || quarantine_schema || ''', ''' || target_table || ''', current_timestamp)';
                END IF;
            END IF;
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION delete_redactics_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    target_schema varchar;
    target_table varchar;
    json_record jsonb;
    pk record;
    pk_val_int bigint;
    pk_val_string varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
	target_schema := quote_ident('r_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));

    if (source_schema NOT LIKE 'r\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        json_record := row_to_json(OLD);
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');
                EXECUTE 'DELETE FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''';
            else
                pk_val_int := jsonb_extract_path(json_record, pk.attname);
                EXECUTE 'DELETE FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ' || pk_val_int;
            END IF;
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION delete_redactics_dlp_table_func()
  RETURNS trigger AS
$$
DECLARE
    source_schema varchar;
    quarantine_schema varchar;
    target_schema varchar;
    target_table varchar;
    json_record jsonb;
    pk record;
    pk_val_int bigint;
    pk_val_string varchar;
BEGIN
    source_schema := (SELECT REGEXP_REPLACE(TG_ARGV[0],'(")?([^.]+).*(")?','\2'));
    quarantine_schema := quote_ident('rq_' || source_schema);
	target_schema := quote_ident('r_' || source_schema);
    source_schema := quote_ident(source_schema);
    target_table := quote_ident((SELECT REGEXP_REPLACE(TG_ARGV[1], '(")?[^.]+\.([^.]+).*(")?', '\2')));

    if (source_schema NOT LIKE 'r\_%' AND source_schema NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
        json_record := row_to_json(OLD);
        EXECUTE 'SELECT attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) WHERE indrelid = ' || TG_RELID || ' AND indisprimary' INTO pk;

        if (pk IS NOT NULL) then
            if (jsonb_extract_path(json_record, pk.attname)::varchar LIKE '"%"') then
                -- non numeric primary key
                pk_val_string := REPLACE(jsonb_extract_path(json_record, pk.attname)::varchar, '"', '');
                EXECUTE 'DELETE FROM ' || quarantine_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''';
                EXECUTE 'DELETE FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ''' || pk_val_string || '''';
            else
                pk_val_int := jsonb_extract_path(json_record, pk.attname);
                EXECUTE 'DELETE FROM ' || quarantine_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ' || pk_val_int;
                EXECUTE 'DELETE FROM ' || target_schema || '.' || target_table || ' WHERE ' || pk.attname || ' = ' || pk_val_int;
            END IF;
        END IF;
    END IF;
RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ddl_trigger_func()
  RETURNS event_trigger
 LANGUAGE plpgsql
  AS $$
DECLARE 
    r record;
    u varchar;
    inner_r record;
    source_schema varchar;
    target_schema varchar;
    quarantine_schema varchar;
    source_table varchar;
    target_table varchar;
    source_columns int;
    target_columns int;
    old_column record;
    schema_check varchar;
BEGIN
    FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
        source_schema := (SELECT REGEXP_REPLACE(r.object_identity,'(")?([^.]+).*(")?','\2'));
        target_schema := quote_ident('r_' || source_schema);
        source_schema := quote_ident(source_schema);
        target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?[^.]+\.([^.]+).*(")?', '\2')));

        if (r.command_tag = 'CREATE TABLE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            EXECUTE 'INSERT INTO public.redactics_oid_mapping ("table_name", "oid") VALUES (''' || r.object_identity || ''',' || r.objid || ')';
            target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?(.*)\.(.*)(")?', '\3')));

            -- check if schema exists, if it doesn't create it and grant access to schema to all landing DB users
            EXECUTE 'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ''' || target_schema || '''' INTO schema_check;
            if schema_check IS NULL then
                EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || target_schema;
                -- loop through table listing landing DB users and assign grants to target_schema
                FOR u in EXECUTE 'SELECT username FROM redactics_landingdb_users' LOOP
                    PERFORM public.redactics_grants(u, target_schema);
                END LOOP;
            END IF;

            EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(target_schema) || '.' || quote_ident(target_table) || ' (LIKE ' || r.object_identity || ' INCLUDING ALL)';
            PERFORM public.set_redactions(source_schema, target_table);

            target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?(.*)\.(.*)(")?', '\3')));
            EXECUTE 'CREATE TRIGGER "it_trigger_' || r.objid || '" AFTER INSERT ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.insert_redactics_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
            EXECUTE 'CREATE TRIGGER "ut_trigger_' || r.objid || '" AFTER UPDATE ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.update_redactics_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
            EXECUTE 'CREATE TRIGGER "dt_trigger_' || r.objid || '" AFTER DELETE ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.delete_redactics_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
        elsif (r.command_tag = 'ALTER TABLE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            -- compare new vs. old schema
            if (target_table NOT LIKE 'redactics\_%') then
                EXECUTE 'SELECT count(*) FROM information_schema.columns WHERE table_schema=''' || source_schema || ''' AND table_name=''' || target_table || '''' INTO source_columns;
                EXECUTE 'SELECT count(*) FROM information_schema.columns WHERE table_schema=''' || target_schema || ''' AND table_name=''' || target_table || '''' INTO target_columns;
                if (source_columns = target_columns) then
                    -- change/rename column, look for renamed columns

                    FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                        -- find old column name based on ordinal position
                        EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''' AND ordinal_position = ''' || inner_r.ordinal_position || '''' INTO old_column;
                        PERFORM public.ddl_rename_col(target_schema, target_table, old_column.column_name::varchar, inner_r.column_name::varchar);
                    END LOOP;

                    -- find changed column properties
                    FOR inner_r IN EXECUTE 'SELECT s.table_schema as s_table_schema, s.table_name as s_table_name, s.column_name as s_column_name, s.udt_name as s_udt_name, s.column_default as s_column_default, t.table_schema as t_table_schema, t.table_name as t_table_name, t.column_name as t_column_name, t.udt_name as t_udt_name, t.column_default as t_column_default FROM information_schema.columns s, information_schema.columns t WHERE s.table_schema = ''' || source_schema || ''' AND s.table_name = ''' || target_table || ''' AND t.table_schema = ''' || target_schema || ''' AND t.table_name = ''' || target_table || ''' AND s.column_name = t.column_name' LOOP
                        PERFORM public.ddl_change_col(target_schema, target_table, inner_r);
                    END LOOP;
                else
                    if (target_columns = 0) then
                        -- renamed table
                        EXECUTE 'SELECT table_name FROM public.redactics_oid_mapping WHERE oid = ' || r.objid INTO source_table;
                        PERFORM public.ddl_rename_table(source_schema, source_table, target_table, r.objid);
                    elsif (source_columns > target_columns) then
                        -- add column
                        FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                            PERFORM public.ddl_add_col(target_schema, target_table, inner_r);
                        END LOOP;
                    elsif (source_columns < target_columns) then
                        -- drop column
                        FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                            PERFORM public.ddl_drop_col(target_schema, target_table, inner_r);
                        END LOOP;
                    END IF;
                END IF;

                -- security labels need to be reapplied
                PERFORM reapply_redactions(target_table);
            END IF;
        elsif (r.command_tag = 'CREATE VIEW' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_view(source_schema, r);
        elsif (r.command_tag = 'CREATE INDEX' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_index(source_schema, r);
        elsif (r.command_tag = 'CREATE SEQUENCE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_sequence(source_schema, r);
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_dlp_trigger_func()
  RETURNS event_trigger
 LANGUAGE plpgsql
  AS $$
DECLARE 
    r record;
    u varchar;
    inner_r record;
    source_schema varchar;
    target_schema varchar;
    quarantine_schema varchar;
    source_table varchar;
    target_table varchar;
    source_columns int;
    target_columns int;
    old_column record;
    schema_check varchar;
BEGIN
    FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
        source_schema := (SELECT REGEXP_REPLACE(r.object_identity,'(")?([^.]+).*(")?','\2'));
        target_schema := quote_ident('r_' || source_schema);
        quarantine_schema := quote_ident('rq_' || source_schema);
        source_schema := quote_ident(source_schema);
        target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?[^.]+\.([^.]+).*(")?', '\2')));

        if (r.command_tag = 'CREATE TABLE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            EXECUTE 'INSERT INTO public.redactics_oid_mapping ("table_name", "oid") VALUES (''' || r.object_identity || ''',' || r.objid || ')';
            target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?(.*)\.(.*)(")?', '\3')));

            -- check if schema exists, if it doesn't create it and grant access to schema to all landing DB users
            EXECUTE 'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ''' || target_schema || '''' INTO schema_check;
            if schema_check IS NULL then
                EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quarantine_schema;
                EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || target_schema;
                -- loop through table listing landing DB users and assign grants to target_schema
                FOR u in EXECUTE 'SELECT username FROM redactics_landingdb_users' LOOP
                    PERFORM public.redactics_grants(u, target_schema);
                END LOOP;
            END IF;

            EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(quarantine_schema) || '.' || quote_ident(target_table) || ' (LIKE ' || r.object_identity || ' INCLUDING ALL)';
            -- add DLP fields
            EXECUTE 'ALTER TABLE ' || quote_ident(quarantine_schema) || '.' || quote_ident(target_table) || ' ADD COLUMN r_sensitive_data_scan timestamp';
            EXECUTE 'CREATE INDEX ' || target_table || '_r_sensitive_data_scan ON ' || quote_ident(quarantine_schema) || '.' || quote_ident(target_table) || '(r_sensitive_data_scan)';
            PERFORM public.set_redactions(quarantine_schema, target_table);

            EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(target_schema) || '.' || quote_ident(target_table) || ' (LIKE ' || r.object_identity || ' INCLUDING ALL)';

            target_table := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?(.*)\.(.*)(")?', '\3')));
            EXECUTE 'CREATE TRIGGER "it_trigger_' || r.objid || '" AFTER INSERT ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.insert_redactics_dlp_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
            EXECUTE 'CREATE TRIGGER "ut_trigger_' || r.objid || '" AFTER UPDATE ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.update_redactics_dlp_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
            EXECUTE 'CREATE TRIGGER "dt_trigger_' || r.objid || '" AFTER DELETE ON ' || source_schema || '.' || quote_ident(target_table) || ' FOR EACH ROW EXECUTE FUNCTION public.delete_redactics_dlp_table_func(' || source_schema || ',' || quote_ident(r.object_identity) || ')';
        elsif (r.command_tag = 'ALTER TABLE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            -- compare new vs. old schema
            if (target_table NOT LIKE 'redactics\_%') then
                EXECUTE 'SELECT count(*) FROM information_schema.columns WHERE table_schema=''' || source_schema || ''' AND table_name=''' || target_table || '''' INTO source_columns;
                EXECUTE 'SELECT count(*) FROM information_schema.columns WHERE table_schema=''' || target_schema || ''' AND table_name=''' || target_table || '''' INTO target_columns;
                if (source_columns = target_columns) then
                    -- change/rename column, look for renamed columns

                    FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                        -- find old column name based on ordinal position
                        EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''' AND ordinal_position = ''' || inner_r.ordinal_position || '''' INTO old_column;
                        PERFORM public.ddl_rename_col(target_schema, target_table, old_column.column_name::varchar, inner_r.column_name::varchar);
                    END LOOP;

                    -- find changed column properties
                    FOR inner_r IN EXECUTE 'SELECT s.table_schema as s_table_schema, s.table_name as s_table_name, s.column_name as s_column_name, s.udt_name as s_udt_name, s.column_default as s_column_default, t.table_schema as t_table_schema, t.table_name as t_table_name, t.column_name as t_column_name, t.udt_name as t_udt_name, t.column_default as t_column_default FROM information_schema.columns s, information_schema.columns t WHERE s.table_schema = ''' || source_schema || ''' AND s.table_name = ''' || target_table || ''' AND t.table_schema = ''' || target_schema || ''' AND t.table_name = ''' || target_table || ''' AND s.column_name = t.column_name' LOOP
                        PERFORM public.ddl_change_col(target_schema, target_table, inner_r);
                    END LOOP;
                else
                    if (target_columns = 0) then
                        -- renamed table
                        EXECUTE 'SELECT table_name FROM public.redactics_oid_mapping WHERE oid = ' || r.objid INTO source_table;
                        PERFORM public.ddl_rename_table(source_schema, source_table, target_table, r.objid);
                    elsif (source_columns > target_columns) then
                        -- add column
                        FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                            PERFORM public.ddl_add_col(target_schema, target_table, inner_r);
                        END LOOP;
                    elsif (source_columns < target_columns) then
                        -- drop column
                        FOR inner_r IN EXECUTE 'SELECT * FROM information_schema.columns WHERE table_schema = ''' || target_schema || ''' AND table_name = ''' || target_table || ''' AND column_name NOT IN (SELECT column_name FROM information_schema.columns WHERE table_schema = ''' || source_schema || ''' AND table_name = ''' || target_table || ''')' LOOP
                            PERFORM public.ddl_drop_col(target_schema, target_table, inner_r);
                        END LOOP;
                    END IF;
                END IF;

                -- security labels need to be reapplied
                PERFORM public.reapply_redactions(target_table);
            END IF;
        elsif (r.command_tag = 'CREATE VIEW' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_view(source_schema, r);
        elsif (r.command_tag = 'CREATE INDEX' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_index(source_schema, r);
        elsif (r.command_tag = 'CREATE SEQUENCE' AND r.schema_name NOT IN ('mask', 'anon') AND r.schema_name NOT LIKE 'r\_%' AND r.schema_name NOT LIKE 'rq\_%' AND target_table NOT LIKE 'redactics\_%') THEN
            PERFORM public.ddl_create_sequence(source_schema, r);
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION set_redactions(source_schema varchar, target_table varchar)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
	ruleset record;
BEGIN
    EXECUTE 'SET SEARCH_PATH = ' || source_schema;
    FOR ruleset IN EXECUTE 'SELECT * FROM public.redactics_masking_rules WHERE schema = ''' || source_schema || ''' AND table_name = ''' || target_table || '''' LOOP
        if (ruleset.rule = 'ignore') then
            EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS NULL';
        elsif (ruleset.rule = 'destruction') then
            EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS ''MASKED WITH VALUE NULL''';
        elsif (ruleset.rule = 'redact_email') then
            if ((ruleset.redact_data->>'primaryKeyDataType')::text = 'uuid') then
                EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS ''MASKED WITH FUNCTION public.redact_email_uuid(' || ruleset.table_name || '.' || ruleset.column_name || ',' || ruleset.table_name || '.' || (ruleset.redact_data->>'primaryKey')::text || ',''''' || (ruleset.redact_data->>'prefix')::text || ''''',''''' || (ruleset.redact_data->>'domain')::text || ''''')''';
            else
                EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS ''MASKED WITH FUNCTION public.redact_email_id(' || ruleset.table_name || '.' || ruleset.column_name || ',' || ruleset.table_name || '.' || (ruleset.redact_data->>'primaryKey')::text || ',''''' || (ruleset.redact_data->>'prefix')::text || ''''',''''' || (ruleset.redact_data->>'domain')::text || ''''')''';
            END IF;
        elsif (ruleset.rule = 'replacement') then
            EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS ''MASKED WITH VALUE ''''' || (ruleset.redact_data->>'replacement')::text || '''''''';
        elsif (ruleset.rule = 'random_string') then
            EXECUTE 'SECURITY LABEL FOR anon ON COLUMN ' || quote_ident(ruleset.table_name) || '.' || quote_ident(ruleset.column_name) || ' IS ''MASKED WITH FUNCTION anon.random_string(' || (ruleset.redact_data->>'chars')::text || ')''';
        END IF;
    END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION ddl_create_view(source_schema varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
	view_name varchar;
	view_definition varchar;
BEGIN
	view_name := (SELECT REGEXP_REPLACE(r.object_identity, '(")?[^.]+\.([^.]+).*(")?', '\2'));
    EXECUTE 'SELECT definition FROM pg_views WHERE viewname = ''' || view_name || '''' into view_definition;
	EXECUTE 'CREATE OR REPLACE VIEW r_' || source_schema || '.' || view_name || ' AS ' || view_definition; 
END;
$$;

CREATE OR REPLACE FUNCTION ddl_create_sequence(source_schema varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
	seq_record record;
	sequence_name varchar;
	target_sequence_name varchar;
BEGIN
	sequence_name := (SELECT REGEXP_REPLACE(r.object_identity, '(")?[^.]+\.([^.]+).*(")?', '\2'));
	target_sequence_name := 'r_' || r.object_identity;
	EXECUTE 'SELECT * FROM information_schema.sequences WHERE sequence_schema = ''' || source_schema || ''' AND sequence_name = ''' || sequence_name || '''' into seq_record;
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || target_sequence_name || ' AS ' || seq_record.data_type || ' INCREMENT BY ' || seq_record.increment || ' MINVALUE ' || seq_record.minimum_value || ' MAXVALUE ' || seq_record.maximum_value || ' START ' || seq_record.start_value;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_create_index(source_schema varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
    source_index record;
	target_index int;
	index_name varchar;
	index_cmd varchar;
BEGIN
	index_name := quote_ident((SELECT REGEXP_REPLACE(r.object_identity, '(")?[^.]+\.([^.]+).*(")?', '\2')));
	EXECUTE 'SELECT * FROM pg_indexes WHERE schemaname = ''' || source_schema || ''' AND indexname = ''' || index_name || '''' INTO source_index;
    EXECUTE 'SELECT count(*) FROM pg_indexes WHERE schemaname = ''r_' || source_schema || ''' AND indexname = ''' || index_name || '''' INTO target_index;
    if (target_index = 0) then
        -- skip creating the index if it has already been created via initial table creation
        EXECUTE 'SELECT REPLACE(''' || source_index.indexdef || ''', ''' || source_schema || ''', ''r_' || source_schema || ''')' INTO index_cmd;
        EXECUTE index_cmd;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_drop_col(target_schema varchar, target_table varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    EXECUTE 'ALTER TABLE ' || target_schema || '.' || target_table || ' DROP COLUMN ' || r.column_name;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_add_col(target_schema varchar, target_table varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    EXECUTE 'ALTER TABLE ' || target_schema || '.' || target_table || ' ADD COLUMN ' || r.column_name || ' ' || r.udt_name;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_rename_table(source_schema varchar, source_table varchar, target_table varchar, table_oid oid)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    EXECUTE 'ALTER TABLE r_' || source_table || ' RENAME TO ' || target_table;
    EXECUTE 'UPDATE public.redactics_oid_mapping SET table_name = ''' || source_schema || '.' || target_table || ''' WHERE oid = ' || table_oid;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_change_col(target_schema varchar, target_table varchar, r record)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    if r.s_udt_name != r.t_udt_name then
        EXECUTE 'ALTER TABLE ' || target_schema || '.' || target_table || ' ALTER COLUMN ' || r.s_column_name || ' TYPE ' || r.s_udt_name;
    elsif COALESCE(r.s_column_default,'') != COALESCE(r.t_column_default,'') then
        EXECUTE 'ALTER TABLE ' || target_schema || '.' || target_table || ' ALTER COLUMN ' || r.s_column_name || ' SET DEFAULT ' || r.s_column_default;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION ddl_rename_col(target_schema varchar, target_table varchar, old_column varchar, new_column varchar)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    EXECUTE 'ALTER TABLE ' || target_schema || '.' || target_table || ' RENAME COLUMN ' || old_column || ' TO ' || new_column;
END;
$$;

CREATE OR REPLACE FUNCTION reapply_redactions(target_table varchar)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    EXECUTE 'DROP VIEW IF EXISTS mask.' || target_table;
END;
$$;

-- CREATE OR REPLACE FUNCTION init_redactics_triggers()
--   RETURNS void
--  LANGUAGE plpgsql
--   AS $$
-- DECLARE
--     redactions_defined bigint;
-- BEGIN
--     -- TODO: support without any redaction rules so long as workflow is enabled?
--     EXECUTE 'SELECT count(*) FROM redactics_masking_rules' INTO redactions_defined;
--     if redactions_defined > 0 then
--         DROP EVENT TRIGGER IF EXISTS ddl_trigger;
--         -- TODO: make this conditional
--         -- CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_trigger_func();
--         CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_dlp_trigger_func();
--     END IF;
-- END;
-- $$;
-- SELECT init_redactics_triggers();

CREATE OR REPLACE FUNCTION sql_drop_func()
  RETURNS event_trigger
 LANGUAGE plpgsql
  AS $$
DECLARE
    obj_dropped record;
BEGIN
    FOR obj_dropped IN SELECT * FROM pg_event_trigger_dropped_objects() LOOP
        if (obj_dropped.object_type = 'table' AND obj_dropped.schema_name NOT LIKE 'r\_%') then
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident('r_' || obj_dropped.schema_name) || '.' || quote_ident(obj_dropped.object_name);
        elsif (obj_dropped.object_type = 'index' AND obj_dropped.schema_name NOT LIKE 'r\_%') then
            EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident('r_' || obj_dropped.schema_name) || '.' || quote_ident(obj_dropped.object_name);
        elsif (obj_dropped.object_type = 'sequence' AND obj_dropped.schema_name NOT LIKE 'r\_%') then
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident('r_' || obj_dropped.schema_name) || '.' || quote_ident(obj_dropped.object_name);
        elsif (obj_dropped.object_type = 'view' AND obj_dropped.schema_name NOT LIKE 'r\_%') then
            EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident('r_' || obj_dropped.schema_name) || '.' || quote_ident(obj_dropped.object_name);
        END IF;
    END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS sql_drop_trigger;
CREATE EVENT TRIGGER sql_drop_trigger ON sql_drop EXECUTE FUNCTION sql_drop_func();

CREATE OR REPLACE FUNCTION public.redact_email_id(email text, id bigint, prefix text, domain text)
 RETURNS text
 LANGUAGE sql
AS $function$
  SELECT CASE WHEN email IS NULL THEN ''
  ELSE
  prefix || id || '@' || domain
  END $function$;

CREATE OR REPLACE FUNCTION public.redact_email_uuid(email text, uuid uuid, prefix text, domain text)
 RETURNS text
 LANGUAGE sql
AS $function$
  SELECT CASE WHEN email IS NULL THEN ''
  ELSE
  prefix || uuid || '@' || domain
  END $function$;

CREATE OR REPLACE FUNCTION redactics_grants(target_user varchar, target_schema varchar)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
BEGIN
    -- grant read only access to existing objects
    EXECUTE 'REVOKE ALL PRIVILEGES ON SCHEMA ' || target_schema || ' FROM ' || target_user;
    EXECUTE 'GRANT USAGE ON SCHEMA ' || target_schema || ' TO ' || target_user;
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA ' || target_schema || '  TO ' || target_user;
    -- EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ' || target_schema || ' TO ' || target_user;
    -- EXECUTE 'GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA ' || target_schema || ' TO ' || target_user;
    -- to future objects
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA ' || target_schema || ' GRANT SELECT ON TABLES TO ' || target_user;    
END;
$$;

CREATE OR REPLACE FUNCTION redactics_grants_all_schema(target_user varchar)
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
	schemas record;
BEGIN
    -- grant read only access to all schema
    FOR schemas IN EXECUTE 'SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE ''r\_%''' LOOP
        EXECUTE 'REVOKE ALL PRIVILEGES ON SCHEMA ' || schemas.schema_name || ' FROM ' || target_user;
        EXECUTE 'GRANT USAGE ON SCHEMA ' || schemas.schema_name || ' TO ' || target_user;
        EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA ' || schemas.schema_name || '  TO ' || target_user;
        EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ' || schemas.schema_name || ' TO ' || target_user;
    END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE prep_redactics_env()
 LANGUAGE plpgsql
  AS $$
DECLARE
    source_schema varchar;
	target_schema varchar;
	tables record;
BEGIN
	DROP EVENT TRIGGER IF EXISTS sql_drop_trigger;
	DROP EVENT TRIGGER IF EXISTS ddl_trigger;

    FOR tables IN EXECUTE 'SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE ''r\_%''' LOOP
    	target_schema := (SELECT REGEXP_REPLACE(tables.table_schema,'^r_',''));
		EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(target_schema) || '.' || tables.table_name || ' CASCADE';
        COMMIT;
		EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(tables.table_schema) || '.' || tables.table_name || ' SET SCHEMA ' || target_schema;
    END LOOP;

    FOR source_schema in EXECUTE 'SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE ''r\_%''' LOOP
        target_schema := (SELECT REGEXP_REPLACE(source_schema,'^r_',''));
        EXECUTE 'GRANT USAGE ON SCHEMA ' || target_schema || ' TO redactics';
        EXECUTE 'GRANT ALL PRIVILEGES ON SCHEMA ' || target_schema || ' TO redactics';
        EXECUTE 'DROP SCHEMA IF EXISTS ' || source_schema;
    END LOOP;
END;
$$;
