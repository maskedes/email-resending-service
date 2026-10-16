-- E-NVOY email service — user sites (Cloudflare/Vercel-style subdomains) + short links
-- Migration: 20261013000001_sites_links
--
-- The backend service layer (src/services/siteLinkService.ts) reads/writes these
-- via Supabase, but no migration ever created them (they only existed in the
-- embedded-Postgres bootstrap in src/database/db.ts). This creates them in the
-- public schema with RLS + service-role policies.

-- ── Sites: one static HTML page per (domain, subdomain) owned by an API key ──
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  domain TEXT NOT NULL DEFAULT 'onboard.qd.je',
  subdomain TEXT,
  title TEXT,
  html TEXT NOT NULL DEFAULT '<h1>Hello</h1>',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- A null subdomain means the apex site. COALESCE keeps apex rows unique too.
CREATE UNIQUE INDEX IF NOT EXISTS sites_domain_subdomain_key
  ON public.sites (domain, COALESCE(subdomain, ''));
CREATE INDEX IF NOT EXISTS idx_sites_api_key ON public.sites(api_key_id);
CREATE INDEX IF NOT EXISTS idx_sites_domain_subdomain ON public.sites(domain, subdomain);

-- ── Short links ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  domain TEXT NOT NULL DEFAULT 'en.12',
  slug TEXT NOT NULL,
  target_url TEXT NOT NULL,
  long_url TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (domain, slug)
);
CREATE INDEX IF NOT EXISTS idx_links_api_key ON public.links(api_key_id);
CREATE INDEX IF NOT EXISTS idx_links_domain_slug ON public.links(domain, slug);

CREATE TABLE IF NOT EXISTS public.link_logs (
  id BIGSERIAL PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  long_url TEXT NOT NULL,
  short_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_link_logs_api_key ON public.link_logs(api_key_id);

CREATE TABLE IF NOT EXISTS public.link_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
  event TEXT NOT NULL DEFAULT 'click',
  target_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_link_triggers_api_key ON public.link_triggers(api_key_id);

-- ── RLS: owners manage their own rows; service role (backend) bypasses ───────
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_triggers ENABLE ROW LEVEL SECURITY;

-- sites
CREATE POLICY "sites_select_own" ON public.sites
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sites_insert_own" ON public.sites
  FOR INSERT TO authenticated
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sites_update_own" ON public.sites
  FOR UPDATE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()))
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sites_delete_own" ON public.sites
  FOR DELETE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sites_service_all" ON public.sites
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- links
CREATE POLICY "links_select_own" ON public.links
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "links_insert_own" ON public.links
  FOR INSERT TO authenticated
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "links_update_own" ON public.links
  FOR UPDATE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()))
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "links_delete_own" ON public.links
  FOR DELETE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "links_service_all" ON public.links
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- link_logs
CREATE POLICY "link_logs_select_own" ON public.link_logs
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "link_logs_service_all" ON public.link_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- link_triggers
CREATE POLICY "link_triggers_select_own" ON public.link_triggers
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "link_triggers_service_all" ON public.link_triggers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
