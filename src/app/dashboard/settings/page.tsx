'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Settings, CreditCard, Users, Bell, Loader2, Check, Copy } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  email: string;
  plan_tier: string;
  competitor_limit: number;
  email_subdomain: string;
  subscription_status: string;
  slack_webhook_url: string;
  phone_number: string;
  alert_email_enabled: boolean;
  alert_slack_enabled: boolean;
  alert_sms_enabled: boolean;
  digest_frequency: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slack_webhook_url: '',
    phone_number: '',
    alert_email_enabled: true,
    alert_slack_enabled: false,
    alert_sms_enabled: false,
    digest_frequency: 'daily',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setOrg(data.organization);
        setFormData({
          name: data.organization.name || '',
          slack_webhook_url: data.organization.slack_webhook_url || '',
          phone_number: data.organization.phone_number || '',
          alert_email_enabled: data.organization.alert_email_enabled ?? true,
          alert_slack_enabled: data.organization.alert_slack_enabled ?? false,
          alert_sms_enabled: data.organization.alert_sms_enabled ?? false,
          digest_frequency: data.organization.digest_frequency || 'daily',
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyInboxAddress = () => {
    if (org?.email_subdomain) {
      navigator.clipboard.writeText(`${org.email_subdomain}@inbound.competitoredge.com`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPlanFeatures = (tier: string) => {
    switch (tier) {
      case 'growth':
        return '15 competitors • Real-time alerts • 90-day history';
      case 'enterprise':
        return '50 competitors • Hourly monitoring • 1-year history';
      default:
        return '5 competitors • Daily digest • 30-day history';
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Account
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Inbox Address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono">
                  {org?.email_subdomain}@inbound.competitoredge.com
                </code>
                <button
                  onClick={copyInboxAddress}
                  className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Subscribe to competitor emails using this address
              </p>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Plan
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 capitalize">{org?.plan_tier || 'Starter'} Plan</p>
              <p className="text-sm text-gray-500">{getPlanFeatures(org?.plan_tier || 'starter')}</p>
            </div>
            <Link
              href="/dashboard/settings/billing"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Manage Billing
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notifications
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-700">Email alerts</span>
                <p className="text-xs text-gray-500">Receive alerts via email</p>
              </div>
              <input
                type="checkbox"
                checked={formData.alert_email_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, alert_email_enabled: e.target.checked })
                }
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-700">Slack alerts</span>
                <p className="text-xs text-gray-500">Send alerts to Slack</p>
              </div>
              <input
                type="checkbox"
                checked={formData.alert_slack_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, alert_slack_enabled: e.target.checked })
                }
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
              />
            </label>

            {formData.alert_slack_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.slack_webhook_url}
                  onChange={(e) =>
                    setFormData({ ...formData, slack_webhook_url: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-700">SMS alerts</span>
                <p className="text-xs text-gray-500">
                  {org?.plan_tier === 'starter'
                    ? 'Available on Growth and Enterprise plans'
                    : 'Receive alerts via text message'}
                </p>
              </div>
              {org?.plan_tier === 'starter' ? (
                <Link
                  href="/dashboard/settings/billing"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Upgrade
                </Link>
              ) : (
                <input
                  type="checkbox"
                  checked={formData.alert_sms_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_sms_enabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-300 text-blue-600"
                />
              )}
            </label>

            {formData.alert_sms_enabled && org?.plan_tier !== 'starter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  US/Canada numbers only. Standard messaging rates may apply.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digest Frequency
              </label>
              <select
                value={formData.digest_frequency}
                onChange={(e) =>
                  setFormData({ ...formData, digest_frequency: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="realtime">Real-time (as they happen)</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
                <option value="none">No digest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Team
          </h2>
          {org?.plan_tier === 'starter' ? (
            <p className="text-gray-500 text-sm">
              Team management is available on Growth and Enterprise plans.
            </p>
          ) : (
            <p className="text-gray-500 text-sm">
              Invite team members to collaborate. Coming soon.
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
