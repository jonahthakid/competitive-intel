import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('clerk_user_id', userId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    // Create portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalUrl = await createPortalSession({
      customerId: org.stripe_customer_id,
      returnUrl: `${baseUrl}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
