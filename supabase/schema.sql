-- CompetitorEdge Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  plan_tier VARCHAR(50) DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  competitor_limit INTEGER DEFAULT 5,
  email_subdomain VARCHAR(50) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'trialing')),
  slack_webhook_url TEXT,
  phone_number VARCHAR(20),
  alert_email_enabled BOOLEAN DEFAULT TRUE,
  alert_slack_enabled BOOLEAN DEFAULT FALSE,
  alert_sms_enabled BOOLEAN DEFAULT FALSE,
  digest_frequency VARCHAR(50) DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  homepage_url TEXT NOT NULL,
  logo_url TEXT,
  email_subscribed BOOLEAN DEFAULT FALSE,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  scrape_status VARCHAR(50) DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'active', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, domain)
);

-- Promos table (homepage scraping results)
CREATE TABLE promos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  promo_text TEXT NOT NULL,
  discount_percent INTEGER,
  discount_amount DECIMAL(10,2),
  promo_code VARCHAR(50),
  source_type VARCHAR(50) DEFAULT 'announcement_bar' CHECK (source_type IN ('announcement_bar', 'hero_banner', 'popup', 'other')),
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  raw_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emails table (email tracking)
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE,
  from_address VARCHAR(255),
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  campaign_type VARCHAR(50) DEFAULT 'other' CHECK (campaign_type IN ('promo', 'new_arrival', 'newsletter', 'abandoned_cart', 'transactional', 'other')),
  promo_code VARCHAR(50),
  discount_percent INTEGER,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('new_promo', 'promo_ended', 'price_drop', 'email_spike', 'new_competitor')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  delivered_slack BOOLEAN DEFAULT FALSE,
  delivered_email BOOLEAN DEFAULT FALSE,
  delivered_sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity feed view (unified feed of all events)
CREATE VIEW activity_feed AS
SELECT 
  p.id,
  'promo' as event_type,
  c.org_id,
  c.id as competitor_id,
  c.name as competitor_name,
  c.domain as competitor_domain,
  p.promo_text as title,
  p.promo_code as code,
  p.discount_percent,
  p.source_type,
  p.first_seen_at as event_time,
  p.is_active
FROM promos p
JOIN competitors c ON p.competitor_id = c.id
UNION ALL
SELECT 
  e.id,
  'email' as event_type,
  c.org_id,
  c.id as competitor_id,
  c.name as competitor_name,
  c.domain as competitor_domain,
  e.subject as title,
  e.promo_code as code,
  e.discount_percent,
  e.campaign_type as source_type,
  e.received_at as event_time,
  TRUE as is_active
FROM emails e
JOIN competitors c ON e.competitor_id = c.id;

-- Indexes for performance
CREATE INDEX idx_competitors_org_id ON competitors(org_id);
CREATE INDEX idx_promos_competitor_id ON promos(competitor_id);
CREATE INDEX idx_promos_is_active ON promos(is_active);
CREATE INDEX idx_promos_first_seen ON promos(first_seen_at DESC);
CREATE INDEX idx_emails_competitor_id ON emails(competitor_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_alerts_org_id ON alerts(org_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_organizations_clerk_user_id ON organizations(clerk_user_id);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using service role for API, so these are permissive for now)
-- In production, you'd tie these to Clerk user IDs via JWT

CREATE POLICY "Enable all for service role" ON organizations FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON competitors FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON promos FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON emails FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON alerts FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to generate email subdomain
CREATE OR REPLACE FUNCTION generate_email_subdomain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_subdomain IS NULL THEN
    NEW.email_subdomain = LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '', 'g')) || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_email_subdomain
  BEFORE INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION generate_email_subdomain();
