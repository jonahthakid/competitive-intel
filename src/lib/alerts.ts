import { supabaseAdmin, Alert, Promo, Competitor } from './supabase';
import { sendSlackMessage, formatAlertMessage } from './slack';
import { sendEmail } from './mailgun';

interface AlertCandidate {
  type: Alert['alert_type'];
  orgId: string;
  competitorId: string;
  competitorName: string;
  competitorDomain: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Check for new alerts across all organizations
export async function checkAndCreateAlerts(): Promise<number> {
  const alerts: AlertCandidate[] = [];

  // Check for new promos (detected in last hour, no existing alert)
  const newPromoAlerts = await detectNewPromoAlerts();
  alerts.push(...newPromoAlerts);

  // Check for ended promos
  const endedPromoAlerts = await detectEndedPromoAlerts();
  alerts.push(...endedPromoAlerts);

  // Check for email spikes
  const emailSpikeAlerts = await detectEmailSpikeAlerts();
  alerts.push(...emailSpikeAlerts);

  // Create and deliver alerts
  let created = 0;
  for (const alert of alerts) {
    const success = await createAndDeliverAlert(alert);
    if (success) created++;
  }

  return created;
}

async function detectNewPromoAlerts(): Promise<AlertCandidate[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Find promos created in the last hour
  const { data: newPromos, error } = await supabaseAdmin
    .from('promos')
    .select(`
      id,
      promo_text,
      discount_percent,
      promo_code,
      first_seen_at,
      competitor:competitors (
        id,
        name,
        domain,
        org_id
      )
    `)
    .gte('first_seen_at', oneHourAgo)
    .eq('is_active', true);

  if (error || !newPromos) return [];

  const alerts: AlertCandidate[] = [];

  for (const promo of newPromos) {
    const competitor = promo.competitor as any;
    if (!competitor) continue;

    // Check if alert already exists for this promo
    const { data: existingAlert } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('alert_type', 'new_promo')
      .eq('competitor_id', competitor.id)
      .contains('metadata', { promo_id: promo.id })
      .single();

    if (existingAlert) continue;

    // Create alert candidate
    const discountText = promo.discount_percent
      ? `${promo.discount_percent}% off`
      : 'New promotion';

    alerts.push({
      type: 'new_promo',
      orgId: competitor.org_id,
      competitorId: competitor.id,
      competitorName: competitor.name,
      competitorDomain: competitor.domain,
      title: `${competitor.name} launched a new promo`,
      message: promo.promo_text?.slice(0, 200) || discountText,
      metadata: {
        promo_id: promo.id,
        discount_percent: promo.discount_percent,
        promo_code: promo.promo_code,
      },
    });
  }

  return alerts;
}

async function detectEndedPromoAlerts(): Promise<AlertCandidate[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find promos that were active but haven't been seen in the last scrape
  // (last_seen_at is old but was recently active)
  const { data: endedPromos, error } = await supabaseAdmin
    .from('promos')
    .select(`
      id,
      promo_text,
      first_seen_at,
      last_seen_at,
      competitor:competitors (
        id,
        name,
        domain,
        org_id,
        last_scraped_at
      )
    `)
    .eq('is_active', false)
    .gte('last_seen_at', oneDayAgo)
    .lt('last_seen_at', oneHourAgo);

  if (error || !endedPromos) return [];

  const alerts: AlertCandidate[] = [];

  for (const promo of endedPromos) {
    const competitor = promo.competitor as any;
    if (!competitor) continue;

    // Only alert if the competitor was scraped recently (promo actually ended)
    if (!competitor.last_scraped_at || competitor.last_scraped_at < oneHourAgo) continue;

    // Check if alert already exists
    const { data: existingAlert } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('alert_type', 'promo_ended')
      .contains('metadata', { promo_id: promo.id })
      .single();

    if (existingAlert) continue;

    alerts.push({
      type: 'promo_ended',
      orgId: competitor.org_id,
      competitorId: competitor.id,
      competitorName: competitor.name,
      competitorDomain: competitor.domain,
      title: `${competitor.name}'s promo has ended`,
      message: `Promotion no longer detected: "${promo.promo_text?.slice(0, 100)}..."`,
      metadata: {
        promo_id: promo.id,
      },
    });
  }

  return alerts;
}

async function detectEmailSpikeAlerts(): Promise<AlertCandidate[]> {
  // Detect if a competitor sent significantly more emails than usual
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get email counts per competitor for today vs weekly average
  const { data: recentEmails } = await supabaseAdmin
    .from('emails')
    .select('competitor_id')
    .gte('received_at', oneDayAgo);

  if (!recentEmails || recentEmails.length === 0) return [];

  // Count emails per competitor
  const todayCounts = new Map<string, number>();
  for (const email of recentEmails) {
    const count = todayCounts.get(email.competitor_id) || 0;
    todayCounts.set(email.competitor_id, count + 1);
  }

  const alerts: AlertCandidate[] = [];

  for (const [competitorId, todayCount] of todayCounts) {
    // Get weekly count
    const { count: weeklyCount } = await supabaseAdmin
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('competitor_id', competitorId)
      .gte('received_at', oneWeekAgo)
      .lt('received_at', oneDayAgo);

    const weeklyAverage = (weeklyCount || 0) / 6; // 6 days (excluding today)

    // Alert if today's count is 3x the average and at least 3 emails
    if (todayCount >= 3 && weeklyAverage > 0 && todayCount >= weeklyAverage * 3) {
      // Get competitor info
      const { data: competitor } = await supabaseAdmin
        .from('competitors')
        .select('id, name, domain, org_id')
        .eq('id', competitorId)
        .single();

      if (!competitor) continue;

      // Check for existing alert today
      const { data: existingAlert } = await supabaseAdmin
        .from('alerts')
        .select('id')
        .eq('alert_type', 'email_spike')
        .eq('competitor_id', competitorId)
        .gte('created_at', oneDayAgo)
        .single();

      if (existingAlert) continue;

      alerts.push({
        type: 'email_spike',
        orgId: competitor.org_id,
        competitorId: competitor.id,
        competitorName: competitor.name,
        competitorDomain: competitor.domain,
        title: `${competitor.name} is sending more emails than usual`,
        message: `${todayCount} emails today vs ${weeklyAverage.toFixed(1)} daily average`,
        metadata: {
          today_count: todayCount,
          weekly_average: weeklyAverage,
        },
      });
    }
  }

  return alerts;
}

async function createAndDeliverAlert(alert: AlertCandidate): Promise<boolean> {
  // Create alert in database
  const { data: createdAlert, error } = await supabaseAdmin
    .from('alerts')
    .insert({
      org_id: alert.orgId,
      competitor_id: alert.competitorId,
      alert_type: alert.type,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata || {},
    })
    .select()
    .single();

  if (error || !createdAlert) {
    console.error('Failed to create alert:', error);
    return false;
  }

  // Get org settings for delivery preferences
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('email, slack_webhook_url, alert_email_enabled, alert_slack_enabled')
    .eq('id', alert.orgId)
    .single();

  if (!org) return true; // Alert created but no delivery

  let deliveredSlack = false;
  let deliveredEmail = false;

  // Deliver via Slack if enabled
  if (org.alert_slack_enabled && org.slack_webhook_url) {
    const slackMessage = formatAlertMessage({
      type: alert.type,
      title: alert.title,
      message: alert.message,
      competitorName: alert.competitorName,
      competitorDomain: alert.competitorDomain,
      promoCode: alert.metadata?.promo_code,
      discountPercent: alert.metadata?.discount_percent,
    });

    deliveredSlack = await sendSlackMessage(org.slack_webhook_url, slackMessage);
  }

  // Deliver via email if enabled (for real-time, not digest)
  if (org.alert_email_enabled && org.email && alert.type === 'new_promo') {
    deliveredEmail = await sendEmail({
      to: org.email,
      subject: `[CompetitorEdge] ${alert.title}`,
      text: `${alert.title}\n\n${alert.message}\n\nView in dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts`,
      html: `
        <h2>${alert.title}</h2>
        <p>${alert.message}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts">View in Dashboard</a></p>
      `,
    });
  }

  // Update delivery status
  await supabaseAdmin
    .from('alerts')
    .update({
      delivered_slack: deliveredSlack,
      delivered_email: deliveredEmail,
    })
    .eq('id', createdAlert.id);

  return true;
}

// Get unread alert count for an organization
export async function getUnreadAlertCount(orgId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('is_read', false);

  return count || 0;
}

// Mark alerts as read
export async function markAlertsAsRead(alertIds: string[], orgId: string): Promise<void> {
  await supabaseAdmin
    .from('alerts')
    .update({ is_read: true })
    .in('id', alertIds)
    .eq('org_id', orgId);
}
