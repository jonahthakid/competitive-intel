'use client';

import { useState, useEffect } from 'react';
import { Mail, Loader2, Tag, Calendar, ExternalLink, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  competitor_id: string;
  from_address: string;
  subject: string;
  campaign_type: string;
  promo_code: string | null;
  discount_percent: number | null;
  received_at: string;
  competitor: {
    name: string;
    domain: string;
  };
}

const CAMPAIGN_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'promo', label: 'Promo' },
  { value: 'new_arrival', label: 'New Arrival' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'other', label: 'Other' },
];

function getCampaignColor(type: string): string {
  switch (type) {
    case 'promo':
      return 'bg-green-100 text-green-800';
    case 'new_arrival':
      return 'bg-blue-100 text-blue-800';
    case 'newsletter':
      return 'bg-purple-100 text-purple-800';
    case 'abandoned_cart':
      return 'bg-yellow-100 text-yellow-800';
    case 'transactional':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [competitorFilter, setCompetitorFilter] = useState('');
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchEmails();
    fetchCompetitors();
  }, [filter, competitorFilter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let url = '/api/feed?type=email&limit=100';
      if (filter) url += `&campaign_type=${filter}`;
      if (competitorFilter) url += `&competitor_id=${competitorFilter}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Filter for only email events
        const emailEvents = data.items?.filter((item: any) => item.event_type === 'email') || [];
        setEmails(emailEvents);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitors = async () => {
    try {
      const response = await fetch('/api/competitors');
      if (response.ok) {
        const data = await response.json();
        setCompetitors(data.competitors || []);
      }
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Tracker</h1>
          <p className="mt-1 text-gray-600">
            Monitor competitor email campaigns and promotional messaging.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CAMPAIGN_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Competitors</option>
            {competitors.map((competitor) => (
              <option key={competitor.id} value={competitor.id}>
                {competitor.name}
              </option>
            ))}
          </select>

          {(filter || competitorFilter) && (
            <button
              onClick={() => {
                setFilter('');
                setCompetitorFilter('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : emails.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No emails yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Emails from your competitors will appear here once we start receiving them.
            Make sure to subscribe to competitor email lists using your unique inbox address.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email: any) => (
            <div
              key={email.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {email.competitor_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCampaignColor(
                        email.source_type
                      )}`}
                    >
                      {email.source_type?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-gray-900 font-medium truncate mb-2">
                    {email.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {email.code && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                          {email.code}
                        </code>
                      </span>
                    )}
                    {email.discount_percent && (
                      <span className="text-green-600 font-medium">
                        {email.discount_percent}% off
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(email.event_time), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://${email.competitor_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">How Email Tracking Works</h3>
        <p className="text-sm text-blue-800 mb-4">
          To track competitor emails, subscribe to their email lists using your unique inbox address.
          All emails sent to this address will be automatically captured and analyzed.
        </p>
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <p className="text-xs text-gray-500 mb-1">Your inbox address:</p>
          <code className="text-sm font-mono text-blue-600">
            [your-subdomain]@inbound.competitoredge.com
          </code>
        </div>
      </div>
    </div>
  );
}
