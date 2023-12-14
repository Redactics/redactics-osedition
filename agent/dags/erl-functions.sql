CREATE OR REPLACE FUNCTION redact_email(email text, id bigint, prefix text, domain text) RETURNS text AS
  $$
  SELECT CASE WHEN email IS NULL THEN ''
  ELSE
  prefix || id || '@' || domain
  END $$ LANGUAGE SQL VOLATILE SECURITY INVOKER;


CREATE OR REPLACE FUNCTION mask_extract_filters(
  relid OID,
  columns character varying[]
)
RETURNS TEXT AS
$$
DECLARE
    m RECORD;
    expression TEXT;
    comma TEXT;
BEGIN
    expression := '';
    comma := '';
    FOR m IN SELECT * FROM anon.mask_columns(relid) WHERE attname = ANY(columns)
    LOOP
        expression := expression || comma;
        IF m.masking_filter IS NULL THEN
            -- No masking rule found
            expression := expression || quote_ident(m.attname);
        ELSE
            -- use the masking filter instead of the original value
            -- the masking filter is casted into the column type
            expression := expression || format('CAST(%s AS %s) AS %s',
                                                m.masking_filter,
                                                m.format_type,
                                                quote_ident(m.attname)
                                              );
        END IF;
        comma := ',';
    END LOOP;
  RETURN expression;
END
$$
LANGUAGE plpgsql VOLATILE SECURITY INVOKER;

CREATE OR REPLACE FUNCTION generate_sequences(
  schema TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    seq record;
    last_value bigint;
	sequences text := '';
BEGIN
    FOR seq IN EXECUTE 'SELECT * FROM information_schema.sequences WHERE sequence_schema = ''' || schema || '''' LOOP
        EXECUTE 'SELECT last_value FROM ' || seq.sequence_name || '' INTO last_value;
        sequences := sequences || 'SELECT SETVAL(''' || schema || '.' || seq.sequence_name ||
       ''', ' || last_value || ');'  || E'\n';
    END LOOP;
	RETURN sequences;
END;
$$;

CREATE OR REPLACE FUNCTION init_redactics_triggers()
  RETURNS void
 LANGUAGE plpgsql
  AS $$
DECLARE
    redactions_defined bigint;
BEGIN
    EXECUTE 'SELECT count(*) FROM redactics_masking_rules' INTO redactions_defined;
    if redactions_defined > 0 then
        DROP EVENT TRIGGER IF EXISTS ddl_trigger;
        CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_trigger_func();
    END IF;
END;
$$;