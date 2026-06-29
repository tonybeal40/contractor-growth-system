create table if not exists pages (
  id bigserial primary key,
  url text not null unique,
  service_slug text not null,
  city_slug text not null,
  canonical_url text not null,
  template_version text not null default 'allpro-local-v1',
  published_at timestamptz,
  last_index_check_at timestamptz,
  last_index_state text,
  last_search_clicks integer,
  last_search_impressions integer
);

create table if not exists leads (
  id bigserial primary key,
  vertical text,
  source text not null,
  source_lead_id text,
  created_at timestamptz not null default now(),
  page_template text,
  service_slug text,
  city_slug text,
  landing_page text,
  page_id bigint references pages(id),
  full_name text,
  phone text,
  email text,
  details text,
  status text not null default 'new',
  assigned_to text,
  follow_up_at timestamptz,
  estimate_scheduled boolean not null default false,
  estimate_sent boolean not null default false,
  booked boolean not null default false,
  sold_to_partner boolean not null default false,
  partner_name text,
  lost_reason text,
  owner_user_id bigint,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  gbraid text,
  wbraid text,
  msclkid text,
  referrer text,
  consent_sms boolean,
  consent_text_version text,
  raw_payload jsonb
);

create table if not exists calls (
  id bigserial primary key,
  lead_id bigint references leads(id),
  source text not null default 'call_tracking',
  tracking_number text,
  destination_number text,
  caller_number text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  recording_url text,
  call_status text,
  raw_payload jsonb
);

create table if not exists webhook_events (
  id bigserial primary key,
  provider text not null,
  event_type text not null,
  event_key text not null unique,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  payload jsonb not null,
  error_text text
);

create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_pages_service_city on pages(service_slug, city_slug);
create index if not exists idx_webhook_provider_status on webhook_events(provider, status);
