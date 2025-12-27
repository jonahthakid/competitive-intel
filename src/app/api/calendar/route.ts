import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Default to last 30 days if not specified
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Get organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all promos in date range
    const { data: promos, error: promosError } = await supabaseAdmin
      .from('promos')
      .select(`
        id,
        promo_text,
        discount_percent,
        promo_code,
        source_type,
        first_seen_at,
        last_seen_at,
        is_active,
        competitor:competitors!inner (
          id,
          name,
          domain,
          org_id
        )
      `)
      .eq('competitors.org_id', org.id)
      .or(`first_seen_at.gte.${start},last_seen_at.gte.${start}`)
      .lte('first_seen_at', end)
      .order('first_seen_at', { ascending: false });

    if (promosError) {
      throw promosError;
    }

    // Get all emails in date range
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from('emails')
      .select(`
        id,
        subject,
        campaign_type,
        promo_code,
        discount_percent,
        received_at,
        competitor:competitors!inner (
          id,
          name,
          domain,
          org_id
        )
      `)
      .eq('competitors.org_id', org.id)
      .gte('received_at', start)
      .lte('received_at', end)
      .order('received_at', { ascending: false });

    if (emailsError) {
      throw emailsError;
    }

    // Transform promos into calendar events
    const promoEvents = (promos || []).map((promo: any) => ({
      id: promo.id,
      title: promo.discount_percent
        ? `${promo.discount_percent}% off`
        : promo.promo_code || 'Promo',
      description: promo.promo_text?.slice(0, 100),
      start: promo.first_seen_at,
      end: promo.is_active ? new Date().toISOString() : promo.last_seen_at,
      isActive: promo.is_active,
      competitor: {
        id: promo.competitor.id,
        name: promo.competitor.name,
        domain: promo.competitor.domain,
      },
      promoCode: promo.promo_code,
      discountPercent: promo.discount_percent,
      sourceType: promo.source_type,
      eventType: 'promo' as const,
    }));

    // Transform emails into calendar events
    const emailEvents = (emails || []).map((email: any) => ({
      id: `email-${email.id}`,
      title: email.campaign_type === 'promo'
        ? `📧 ${email.discount_percent ? `${email.discount_percent}% off` : 'Promo'}`
        : `📧 ${email.campaign_type?.replace('_', ' ') || 'Email'}`,
      description: email.subject?.slice(0, 100),
      start: email.received_at,
      end: email.received_at, // Emails are point-in-time events
      isActive: false,
      competitor: {
        id: email.competitor.id,
        name: email.competitor.name,
        domain: email.competitor.domain,
      },
      promoCode: email.promo_code,
      discountPercent: email.discount_percent,
      sourceType: email.campaign_type || 'email',
      eventType: 'email' as const,
    }));

    // Combine and sort all events
    const events = [...promoEvents, ...emailEvents].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );

    // Get competitors for the legend
    const competitorMap = new Map<string, any>();
    events.forEach((e: any) => {
      if (!competitorMap.has(e.competitor.id)) {
        competitorMap.set(e.competitor.id, e.competitor);
      }
    });
    const competitors = Array.from(competitorMap.values());

    return NextResponse.json({
      events,
      competitors,
      dateRange: { start, end },
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
