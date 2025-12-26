'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  plan_tier: 'starter' | 'growth' | 'enterprise';
  subscription_status: string | null;
  stripe_customer_id: string | null;
}

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 99,
    features: [
      '5 competitors',
      'Homepage monitoring',
      'Daily email digest',
      '30-day history',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: 249,
    popular: true,
    features: [
      '15 competitors',
      'Homepage + email monitoring',
      'Real-time Slack alerts',
      '90-day history',
      '5 team seats',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 599,
    features: [
      '50 competitors',
      'Hourly monitoring',
      'Slack + email alerts',
      '1-year history',
      'Unlimited team seats',
      'API access',
      'Priority support',
    ],
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrganization();

    // Check for success/cancel messages
    if (searchParams.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription updated successfully!' });
    } else if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Checkout was canceled.' });
    }
  }, [searchParams]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setOrg(data.organization);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planTier: string) => {
    if (upgrading) return;
    setUpgrading(planTier);
    setMessage(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="mt-1 text-gray-600">
          Manage your subscription and billing information.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold text-gray-900 capitalize">
              {org?.plan_tier || 'Starter'} Plan
            </p>
            <p className="text-sm text-gray-500">
              Status:{' '}
              <span
                className={`font-medium ${
                  org?.subscription_status === 'active'
                    ? 'text-green-600'
                    : org?.subscription_status === 'past_due'
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }`}
              >
                {org?.subscription_status || 'Free tier'}
              </span>
            </p>
          </div>
          {org?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Manage Billing
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = org?.plan_tier === plan.tier;
          const isUpgrade =
            PLANS.findIndex((p) => p.tier === plan.tier) >
            PLANS.findIndex((p) => p.tier === org?.plan_tier);

          return (
            <div
              key={plan.tier}
              className={`relative bg-white rounded-lg shadow-sm border-2 p-6 ${
                plan.popular
                  ? 'border-blue-500'
                  : isCurrentPlan
                  ? 'border-green-500'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={isCurrentPlan || upgrading !== null}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {upgrading === plan.tier ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : isUpgrade ? (
                  'Upgrade'
                ) : (
                  'Downgrade'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Can I change plans anytime?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">What happens when I hit my competitor limit?</h3>
            <p className="text-sm text-gray-600 mt-1">
              You'll need to remove a competitor or upgrade your plan to add more.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Is there a free trial?</h3>
            <p className="text-sm text-gray-600 mt-1">
              The Starter plan includes a 14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
