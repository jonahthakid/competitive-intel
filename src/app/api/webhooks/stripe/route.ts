import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanByPriceId, getPlanLimits } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.org_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!orgId) {
    console.error('No org_id in checkout session metadata');
    return;
  }

  // Update organization with Stripe IDs
  await supabaseAdmin
    .from('organizations')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('id', orgId);

  console.log(`Checkout complete for org ${orgId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;

  // Find org by customer ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.error('No organization found for customer:', customerId);
    return;
  }

  // Determine plan tier from price ID
  const planTier = getPlanByPriceId(priceId);
  const planLimits = planTier ? getPlanLimits(planTier) : null;

  // Update organization
  await supabaseAdmin
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      plan_tier: planTier || 'starter',
      competitor_limit: planLimits?.competitorLimit || 5,
    })
    .eq('id', org.id);

  console.log(`Subscription updated for org ${org.id}: ${planTier} (${status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find org by customer ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.error('No organization found for customer:', customerId);
    return;
  }

  // Downgrade to starter (free) tier
  await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      plan_tier: 'starter',
      competitor_limit: 5,
    })
    .eq('id', org.id);

  console.log(`Subscription canceled for org ${org.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find org by customer ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    return;
  }

  // Mark as past due
  await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', org.id);

  console.log(`Payment failed for org ${org.id}`);
}
