import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { createCheckoutSession, getOrCreateCustomer, PLANS, PlanTier } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { planTier } = await request.json();

    if (!planTier || !PLANS[planTier as PlanTier]) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }

    const plan = PLANS[planTier as PlanTier];

    // Get organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || org.name;

    let customerId = org.stripe_customer_id;
    if (!customerId) {
      customerId = await getOrCreateCustomer({
        email,
        name,
        metadata: { org_id: org.id },
      });

      // Save customer ID
      await supabaseAdmin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutUrl = await createCheckoutSession({
      customerId,
      priceId: plan.priceId,
      successUrl: `${baseUrl}/dashboard/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/dashboard/settings/billing?canceled=true`,
      metadata: {
        org_id: org.id,
        plan_tier: planTier,
      },
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
