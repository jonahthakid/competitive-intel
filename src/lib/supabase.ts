import { createClient, SupabaseClient } from '@supabase/supabase-js';

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Lazy-initialized clients
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabase) _supabase = createSupabaseClient();
    return (_supabase as any)[prop];
  }
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return (_supabaseAdmin as any)[prop];
  }
});

// Types
export interface Organization {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string | null;
  plan_tier: 'starter' | 'growth' | 'enterprise';
  competitor_limit: number;
  email_subdomain: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';
  slack_webhook_url: string | null;
  alert_email_enabled: boolean;
  alert_slack_enabled: boolean;
  digest_frequency: 'realtime' | 'daily' | 'weekly' | 'none';
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  org_id: string;
  name: string;
  domain: string;
  homepage_url: string;
  logo_url: string | null;
  email_subscribed: boolean;
  last_scraped_at: string | null;
  scrape_status: 'pending' | 'active' | 'error';
  created_at: string;
  updated_at: string;
}

export interface Promo {
  id: string;
  competitor_id: string;
  promo_text: string;
  discount_percent: number | null;
  discount_amount: number | null;
  promo_code: string | null;
  source_type: 'announcement_bar' | 'hero_banner' | 'popup' | 'other';
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  raw_html: string | null;
  created_at: string;
}

export interface Email {
  id: string;
  competitor_id: string;
  message_id: string | null;
  from_address: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  campaign_type: 'promo' | 'new_arrival' | 'newsletter' | 'abandoned_cart' | 'transactional' | 'other';
  promo_code: string | null;
  discount_percent: number | null;
  received_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  org_id: string;
  competitor_id: string | null;
  alert_type: 'new_promo' | 'promo_ended' | 'price_drop' | 'email_spike' | 'new_competitor';
  title: string;
  message: string | null;
  metadata: any;
  is_read: boolean;
  delivered_slack: boolean;
  delivered_email: boolean;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  event_type: 'promo' | 'email';
  org_id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string;
  title: string;
  code: string | null;
  discount_percent: number | null;
  source_type: string;
  event_time: string;
  is_active: boolean;
}
