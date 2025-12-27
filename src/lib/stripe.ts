import Stripe from 'stripe';

// Lazy initialization for build compatibility
let _stripe: Stripe | null = null;

export const stripe = (() => {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return _stripe!;
})();

// Plan configuration
export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 99,
    competitorLimit: 5,
    scrapeIntervalHours: 6,
    historyDays: 30,
    seats: 1,
    smsEnabled: false,
    features: [
      '5 competitors',
      'Homepage monitoring',
      'Daily email digest',
      '30-day history',
    ],
  },
  growth: {
    name: 'Growth',
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    price: 249,
    competitorLimit: 15,
    scrapeIntervalHours: 4,
    historyDays: 90,
    seats: 5,
    smsEnabled: true,
    features: [
      '15 competitors',
      'Homepage + email monitoring',
      'Real-time Slack alerts',
      'SMS alerts',
      '90-day history',
      '5 team seats',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    price: 599,
    competitorLimit: 50,
    scrapeIntervalHours: 1,
    historyDays: 365,
    seats: -1, // unlimited
    smsEnabled: true,
    features: [
      '50 competitors',
      'Hourly monitoring',
      'Slack + email + SMS alerts',
      '1-year history',
      'Unlimited team seats',
      'API access',
      'Priority support',
    ],
  },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanTier | null {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return tier as PlanTier;
    }
  }
  return null;
}

export function getPlanLimits(tier: PlanTier) {
  return PLANS[tier];
}

// Create a Stripe checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  });

  return session.url!;
}

// Create a billing portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

// Create or get Stripe customer
export async function getOrCreateCustomer({
  email,
  name,
  metadata,
}: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });

  return customer.id;
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
