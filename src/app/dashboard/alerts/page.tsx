'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { Bell, Tag, TrendingUp, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: 'new_promo' | 'promo_ended' | 'email_spike';
  message: string;
  metadata: {
    promo_text?: string;
    promo_code?: string;
    discount_percent?: number;
    email_count?: number;
    daily_average?: number;
  };
  is_read: boolean;
  created_at: string;
  competitor: {
    id: string;
    name: string;
    domain: string;
  };
}

const ALERT_TYPES = [
  { value: '', label: 'All Signals' },
  { value: 'new_promo', label: 'New Promos' },
  { value: 'promo_ended', label: 'Ended Promos' },
  { value: 'email_spike', label: 'Email Spikes' },
];

function getAlertIcon(type: string) {
  switch (type) {
    case 'new_promo':
      return <Tag className="w-5 h-5 text-green-400" />;
    case 'promo_ended':
      return <Bell className="w-5 h-5 text-slate-400" />;
    case 'email_spike':
      return <TrendingUp className="w-5 h-5 text-orange-400" />;
    default:
      return <Bell className="w-5 h-5 text-indigo-400" />;
  }
}

function getAlertBorderColor(type: string) {
  switch (type) {
    case 'new_promo':
      return 'border-t-green-500';
    case 'promo_ended':
      return 'border-t-slate-500';
    case 'email_spike':
      return 'border-t-orange-500';
    default:
      return 'border-t-indigo-500';
  }
}

function getAlertTypeLabel(type: string) {
  switch (type) {
    case 'new_promo':
      return { label: 'Promo Detected', style: 'text-green-400 bg-green-400/10 border-green-400/20' };
    case 'promo_ended':
      return { label: 'Promo Ended', style: 'text-slate-400 bg-slate-700/30 border-slate-600/30' };
    case 'email_spike':
      return { label: 'Email Spike', style: 'text-orange-400 bg-orange-400/10 border-orange-400/20' };
    default:
      return { label: 'Signal', style: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' };
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = '/api/alerts?limit=100';
      if (filter) url += `&type=${filter}`;
      if (unreadOnly) url += '&unread=true';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch alerts');

      const data = await res.json();
      setAlerts(data.alerts || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (res.ok) {
        setAlerts(alerts.map(a => ({ ...a, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark alerts as read:', err);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId] }),
      });

      if (res.ok) {
        setAlerts(alerts.map(a =>
          a.id === alertId ? { ...a, is_read: true } : a
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter, unreadOnly]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Signal Center</h1>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            Real-time competitive intelligence alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card border-red-500/30 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto bg-slate-800/50"
          >
            {ALERT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            Unread only
            {unreadCount > 0 && (
              <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {unreadCount}
              </span>
            )}
          </label>

          {(filter || unreadOnly) && (
            <button
              onClick={() => {
                setFilter('');
                setUnreadOnly(false);
              }}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      {loading && alerts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/4 mb-3"></div>
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
            <Bell className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No signals detected</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            When targets launch promos or send email campaigns, you&apos;ll see signals here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const typeInfo = getAlertTypeLabel(alert.alert_type);
            return (
              <div
                key={alert.id}
                onClick={() => !alert.is_read && markAsRead(alert.id)}
                className={`feed-card ${getAlertBorderColor(alert.alert_type)} cursor-pointer ${
                  !alert.is_read ? 'ring-1 ring-indigo-500/30' : 'opacity-75 hover:opacity-100'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 border border-white/10">
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-white">
                            {alert.competitor?.name}
                          </span>
                          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${typeInfo.style}`}>
                            {typeInfo.label}
                          </span>
                          {!alert.is_read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-mono mt-1">
                          SIGNAL_TYPE: {alert.alert_type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {formatRelativeTime(alert.created_at)}
                    </span>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5 mb-4">
                    <p className="text-slate-300 font-medium">{alert.message}</p>
                  </div>

                  {/* Metadata */}
                  {alert.metadata && (
                    <div className="flex items-center gap-3 flex-wrap">
                      {alert.metadata.promo_code && (
                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-mono font-bold px-3 py-1 rounded-full">
                          {alert.metadata.promo_code}
                        </span>
                      )}
                      {alert.metadata.discount_percent && (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold px-3 py-1 rounded-full">
                          {alert.metadata.discount_percent}% OFF
                        </span>
                      )}
                      {alert.metadata.email_count && (
                        <span className="text-sm text-slate-400 font-mono">
                          {alert.metadata.email_count} emails today
                          {alert.metadata.daily_average && (
                            <span className="text-slate-500">
                              {' '}(avg: {alert.metadata.daily_average.toFixed(1)})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
