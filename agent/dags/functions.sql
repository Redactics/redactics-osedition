CREATE OR REPLACE FUNCTION redact_email(email text, id integer, prefix text, domain text) RETURNS text AS
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
