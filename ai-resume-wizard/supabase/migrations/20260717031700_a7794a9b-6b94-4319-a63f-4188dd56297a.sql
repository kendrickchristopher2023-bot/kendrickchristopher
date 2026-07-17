
CREATE OR REPLACE FUNCTION public._backfill_normalize_location(loc text)
RETURNS TABLE(out_city text, out_region text, out_country text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text; parts text[]; a text; b text; c text; last_p text; second_last text; n int;
  region_name_map jsonb := '{
    "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA",
    "colorado":"CO","connecticut":"CT","delaware":"DE","florida":"FL","georgia":"GA",
    "hawaii":"HI","idaho":"ID","illinois":"IL","indiana":"IN","iowa":"IA","kansas":"KS",
    "kentucky":"KY","louisiana":"LA","maine":"ME","maryland":"MD","massachusetts":"MA",
    "michigan":"MI","minnesota":"MN","mississippi":"MS","missouri":"MO","montana":"MT",
    "nebraska":"NE","nevada":"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM",
    "new york":"NY","north carolina":"NC","north dakota":"ND","ohio":"OH","oklahoma":"OK",
    "oregon":"OR","pennsylvania":"PA","rhode island":"RI","south carolina":"SC",
    "south dakota":"SD","tennessee":"TN","texas":"TX","utah":"UT","vermont":"VT",
    "virginia":"VA","washington":"WA","west virginia":"WV","wisconsin":"WI","wyoming":"WY",
    "district of columbia":"DC","washington dc":"DC","washington d.c.":"DC",
    "puerto rico":"PR","guam":"GU","u.s. virgin islands":"VI","virgin islands":"VI",
    "american samoa":"AS","northern mariana islands":"MP"
  }'::jsonb;
  us_codes text[] := ARRAY['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID',
    'IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
    'WA','WV','WI','WY','DC'];
  country_map jsonb := '{
    "united states":"US","united states of america":"US","u.s.":"US","u.s.a.":"US",
    "usa":"US","us":"US","united kingdom":"UK","uk":"UK","great britain":"UK",
    "england":"UK","canada":"CA","germany":"DE","france":"FR","spain":"ES",
    "netherlands":"NL","ireland":"IE","australia":"AU","india":"IN","singapore":"SG",
    "japan":"JP","brazil":"BR","mexico":"MX"
  }'::jsonb;
BEGIN
  IF loc IS NULL OR btrim(loc) = '' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  s := btrim(loc);
  IF position(';' in s) > 0 THEN s := btrim(split_part(s, ';', 1)); END IF;
  IF position(' | ' in s) > 0 THEN s := btrim(split_part(s, ' | ', 1)); END IF;
  IF s = '' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  IF position(',' in s) = 0 AND s ~* '^(remote|anywhere|worldwide|global|work from home|wfh)\b' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  s := regexp_replace(s, '\((remote|hybrid|on[- ]?site|onsite)\)', '', 'gi');
  s := btrim(s);
  parts := ARRAY(SELECT btrim(x) FROM regexp_split_to_table(s, '[,/·|]') x WHERE btrim(x) <> '');
  n := coalesce(array_length(parts,1), 0);

  IF n >= 3 THEN
    last_p := parts[n];
    second_last := parts[n-1];
    IF (region_name_map ? lower(last_p)) OR (upper(last_p) = ANY(us_codes)) THEN
      IF region_name_map ? lower(last_p) THEN last_p := region_name_map->>lower(last_p);
      ELSE last_p := upper(last_p); END IF;
      RETURN QUERY SELECT second_last, last_p, 'US'::text; RETURN;
    END IF;
    a := parts[1]; b := parts[2]; c := parts[3];
    IF region_name_map ? lower(b) THEN b := region_name_map->>lower(b);
    ELSIF upper(b) = ANY(us_codes) THEN b := upper(b); END IF;
    IF country_map ? lower(c) THEN c := country_map->>lower(c);
    ELSIF c ~ '^[A-Za-z]{2}$' THEN c := upper(c); END IF;
    RETURN QUERY SELECT a, b, c; RETURN;
  END IF;

  IF n = 2 THEN
    a := parts[1]; b := parts[2];
    IF region_name_map ? lower(b) THEN
      RETURN QUERY SELECT a, (region_name_map->>lower(b)), 'US'::text; RETURN;
    ELSIF upper(b) = ANY(us_codes) THEN
      RETURN QUERY SELECT a, upper(b), 'US'::text; RETURN;
    ELSIF country_map ? lower(b) THEN
      RETURN QUERY SELECT a, NULL::text, (country_map->>lower(b)); RETURN;
    ELSE
      RETURN QUERY SELECT a, b, NULL::text; RETURN;
    END IF;
  END IF;

  IF n = 1 THEN
    a := parts[1];
    IF region_name_map ? lower(a) THEN
      RETURN QUERY SELECT NULL::text, (region_name_map->>lower(a)), 'US'::text; RETURN;
    ELSIF upper(a) = ANY(us_codes) THEN
      RETURN QUERY SELECT NULL::text, upper(a), 'US'::text; RETURN;
    ELSIF country_map ? lower(a) THEN
      RETURN QUERY SELECT NULL::text, NULL::text, (country_map->>lower(a)); RETURN;
    ELSE
      RETURN QUERY SELECT a, NULL::text, NULL::text; RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT NULL::text, NULL::text, NULL::text;
END;
$$;

UPDATE public.job_listings j
SET city    = (SELECT out_city    FROM public._backfill_normalize_location(j.location)),
    region  = (SELECT out_region  FROM public._backfill_normalize_location(j.location)),
    country = (SELECT out_country FROM public._backfill_normalize_location(j.location))
WHERE j.location IS NOT NULL;

DROP FUNCTION public._backfill_normalize_location(text);
