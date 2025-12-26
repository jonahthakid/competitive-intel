import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization with settings
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
        plan_tier: org.plan_tier,
        competitor_limit: org.competitor_limit,
        email_subdomain: org.email_subdomain,
        subscription_status: org.subscription_status,
        stripe_customer_id: org.stripe_customer_id,
        slack_webhook_url: org.slack_webhook_url,
        alert_email_enabled: org.alert_email_enabled ?? true,
        alert_slack_enabled: org.alert_slack_enabled ?? false,
        digest_frequency: org.digest_frequency ?? 'daily',
      },
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Allowed fields to update
    const allowedFields = [
      'name',
      'slack_webhook_url',
      'alert_email_enabled',
      'alert_slack_enabled',
      'digest_frequency',
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update organization
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .update(filteredUpdates)
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
