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
    const { data: promos, error } = await supabaseAdmin
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

    if (error) {
      throw error;
    }

    // Transform promos into calendar events
    const events = (promos || []).map((promo: any) => ({
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
    }));

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
