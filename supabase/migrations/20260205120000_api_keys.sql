-- API keys for MCP and other programmatic access (Bearer token auth)
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  name text NOT NULL DEFAULT 'MCP / API',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view and manage their own API keys
CREATE POLICY "Users can view own api_keys"
  ON public.api_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.api_keys IS 'API keys for MCP server and programmatic access; key_hash is SHA-256 of the secret.';
