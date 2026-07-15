
CREATE OR REPLACE FUNCTION public._backfill_strip_html(t text) RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m text[];
  result text := t;
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  -- Kill script/style blocks entirely
  result := regexp_replace(result, '<script[^>]*>.*?</script>', ' ', 'gis');
  result := regexp_replace(result, '<style[^>]*>.*?</style>',   ' ', 'gis');
  result := regexp_replace(result, '<!--.*?-->', ' ', 'gs');
  -- Preserve some vertical structure before dropping tags
  result := regexp_replace(result, '</(p|div|li|h[1-6]|tr)[^>]*>', E'\n', 'gi');
  result := regexp_replace(result, '<br\s*/?>', E'\n', 'gi');
  result := regexp_replace(result, '<li[^>]*>', E'\n• ', 'gi');
  -- Strip remaining tags
  result := regexp_replace(result, '<[^>]+>', ' ', 'g');
  -- Named entities (common set)
  result := replace(result, '&nbsp;',   ' ');
  result := replace(result, '&amp;',    '&');
  result := replace(result, '&lt;',     '<');
  result := replace(result, '&gt;',     '>');
  result := replace(result, '&quot;',   '"');
  result := replace(result, '&apos;',   '''');
  result := replace(result, '&hellip;', '…');
  result := replace(result, '&mdash;',  '—');
  result := replace(result, '&ndash;',  '–');
  result := replace(result, '&rsquo;',  '''');
  result := replace(result, '&lsquo;',  '''');
  result := replace(result, '&rdquo;',  '"');
  result := replace(result, '&ldquo;',  '"');
  result := replace(result, '&bull;',   '•');
  result := replace(result, '&middot;', '·');
  result := replace(result, '&copy;',   '©');
  result := replace(result, '&reg;',    '®');
  result := replace(result, '&trade;',  '™');
  -- Decimal numeric entities (loop until none remain)
  LOOP
    m := regexp_match(result, '&#([0-9]+);');
    EXIT WHEN m IS NULL;
    BEGIN
      result := replace(result, '&#' || m[1] || ';', chr(m[1]::int));
    EXCEPTION WHEN others THEN
      result := replace(result, '&#' || m[1] || ';', '');
    END;
  END LOOP;
  -- Hex numeric entities
  LOOP
    m := regexp_match(result, '&#[xX]([0-9a-fA-F]+);');
    EXIT WHEN m IS NULL;
    BEGIN
      result := regexp_replace(
        result,
        '&#[xX]' || m[1] || ';',
        chr(('x' || lpad(m[1], 8, '0'))::bit(32)::int),
        'g'
      );
    EXCEPTION WHEN others THEN
      result := regexp_replace(result, '&#[xX]' || m[1] || ';', '', 'g');
    END;
  END LOOP;
  -- Collapse whitespace, keep paragraph breaks
  result := regexp_replace(result, '\r\n?', E'\n', 'g');
  result := regexp_replace(result, '[ \t\f\v]+', ' ', 'g');
  result := regexp_replace(result, ' *\n *', E'\n', 'g');
  result := regexp_replace(result, E'\n{3,}', E'\n\n', 'g');
  result := btrim(result);
  IF length(result) = 0 THEN RETURN NULL; END IF;
  IF length(result) > 4000 THEN
    result := substring(result from 1 for 4000) || '…';
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public._backfill_strip_inline(t text) RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  cleaned := public._backfill_strip_html(t);
  IF cleaned IS NULL THEN RETURN NULL; END IF;
  cleaned := btrim(regexp_replace(cleaned, '\s+', ' ', 'g'));
  IF length(cleaned) = 0 THEN RETURN NULL; END IF;
  IF length(cleaned) > 300 THEN
    cleaned := substring(cleaned from 1 for 300) || '…';
  END IF;
  RETURN cleaned;
END;
$$;

UPDATE public.job_listings
SET
  description = public._backfill_strip_html(description),
  role        = COALESCE(public._backfill_strip_inline(role), role),
  company     = COALESCE(public._backfill_strip_inline(company), company),
  location    = public._backfill_strip_inline(location)
WHERE
  description ~ '<[a-zA-Z!/]' OR description ~ '&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);'
  OR role     ~ '<[a-zA-Z!/]' OR role     ~ '&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);'
  OR company  ~ '<[a-zA-Z!/]' OR company  ~ '&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);'
  OR location ~ '<[a-zA-Z!/]' OR location ~ '&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);';

DROP FUNCTION public._backfill_strip_inline(text);
DROP FUNCTION public._backfill_strip_html(text);
