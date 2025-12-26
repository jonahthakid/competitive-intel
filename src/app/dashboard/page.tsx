'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { RefreshCw, Tag, Mail, ExternalLink, AlertCircle } from 'lucide-react';

interface FeedItem {
  id: string;
  event_type: 'promo' | 'email';
  competitor_name: string;
  competitor_domain: string;
  title: string;
  code: string | null;
  discount_percent: number | null;
  source_type: string;
  event_time: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/feed');
      if (!res.ok) throw new Error('Failed to fetch feed');
      const data = await res.json();
      setFeed(data.feed || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Live Intelligence Feed
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </h1>
          <p className="text-slate-400 mt-2 font-mono text-sm">
            System Status: MONITORING // {feed.length} Events Tracked
          </p>
        </div>
        <button
          onClick={fetchFeed}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Force Refresh
        </button>
      </div>

      {error && (
        <div className="glass-card border-red-500/30 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {loading && feed.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/4 mb-3"></div>
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="glass-card text-center py-12">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Tag className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No intelligence yet</h3>
          <p className="text-slate-400 mb-4">Add targets to start tracking their activity</p>
          <a href="/dashboard/competitors" className="btn-gradient inline-block">
            Add Targets
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {feed.map((item) => (
            <div
              key={item.id}
              className={`feed-card ${item.event_type === 'promo' ? 'feed-card-promo' : 'feed-card-email'}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 border border-white/10 text-white font-bold text-lg">
                      {item.competitor_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-white">{item.competitor_name}</span>
                        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                          item.event_type === 'promo'
                            ? 'text-green-400 bg-green-400/10 border-green-400/20'
                            : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                        }`}>
                          {item.event_type === 'promo' ? 'Promo Detected' : 'Email Intercept'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-mono mt-1">
                        SOURCE: {item.source_type.toUpperCase().replace('_', '_')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {formatRelativeTime(item.event_time)}
                  </span>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5 mb-4">
                  <p className="text-slate-300 font-medium">{item.title}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {item.discount_percent && (
                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold px-3 py-1 rounded-full">
                      {item.discount_percent}% OFF DETECTED
                    </span>
                  )}
                  {item.code && (
                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {item.code}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-white/5"></div>
                  <a
                    href={`https://${item.competitor_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                  >
                    Analyze Evidence
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
