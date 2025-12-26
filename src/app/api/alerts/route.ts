import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { markAlertsAsRead } from '@/lib/alerts';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');

    // Get organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build query
    let query = supabaseAdmin
      .from('alerts')
      .select(`
        *,
        competitor:competitors (
          id,
          name,
          domain
        )
      `)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('alert_type', type);
    }

    const { data: alerts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('is_read', false);

    return NextResponse.json({
      alerts: alerts || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

// Mark alerts as read
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertIds, markAllRead } = await request.json();

    // Get organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (markAllRead) {
      // Mark all as read
      await supabaseAdmin
        .from('alerts')
        .update({ is_read: true })
        .eq('org_id', org.id)
        .eq('is_read', false);
    } else if (alertIds && alertIds.length > 0) {
      await markAlertsAsRead(alertIds, org.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alerts update error:', error);
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 });
  }
}
