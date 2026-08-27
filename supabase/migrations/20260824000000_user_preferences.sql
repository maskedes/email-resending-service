-- E-NVOY email service — user preferences
-- Migration: 20260824000000_user_preferences
--
-- Adds a `preferences` JSONB column to public.profiles so the dashboard
-- settings (email notifications, DNS auto-check, dark mode) persist per user
-- instead of being client-only toggles. The default matches the dashboard's
-- initial UI state (all enabled).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT
    '{"emailNotifications": true, "dnsAutoCheck": true, "darkMode": true}'::jsonb;
