
CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Browser extension',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX api_tokens_user_id_idx ON public.api_tokens(user_id);

GRANT SELECT, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tokens read" ON public.api_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tokens delete" ON public.api_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- INSERT is performed server-side via service_role (raw token never leaves the server as plaintext to the client except once at creation).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS screener_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
