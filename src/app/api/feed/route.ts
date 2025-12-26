import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/feed - Get unified activity feed
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!org) {
      return NextResponse.json({ feed: [] });
    }

    // Get URL params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('type'); // 'promo' | 'email' | null for all

    // Fetch from activity_feed view
    let query = supabaseAdmin
      .from('activity_feed')
      .select('*')
      .eq('org_id', org.id)
      .order('event_time', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: feed, error } = await query;

    if (error) {
      // View might not exist yet, fall back to promos only
      console.log('Activity feed view error, falling back:', error.message);
      
      const { data: promos } = await supabaseAdmin
        .from('promos')
        .select(`
          id,
          promo_text,
          promo_code,
          discount_percent,
          source_type,
          first_seen_at,
          is_active,
          competitor:competitors(id, name, domain, org_id)
        `)
        .order('first_seen_at', { ascending: false })
        .limit(limit);

      // Filter by org and transform
      const transformedFeed = (promos || [])
        .filter((p: any) => p.competitor?.org_id === org.id)
        .map((p: any) => ({
          id: p.id,
          event_type: 'promo',
          org_id: org.id,
          competitor_id: p.competitor?.id,
          competitor_name: p.competitor?.name,
          competitor_domain: p.competitor?.domain,
          title: p.promo_text,
          code: p.promo_code,
          discount_percent: p.discount_percent,
          source_type: p.source_type,
          event_time: p.first_seen_at,
          is_active: p.is_active,
        }));

      return NextResponse.json({ feed: transformedFeed });
    }

    return NextResponse.json({ feed: feed || [] });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
