'use client';

import { useState } from 'react';
import {
  Activity, Users, Bell, Calendar, Settings, Mail,
  ExternalLink, Tag, TrendingUp, BarChart3, Zap,
  ChevronRight, Plus, RefreshCw, Check, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DEMO_COMPETITORS,
  DEMO_FEED,
  DEMO_ALERTS,
  DEMO_PROMOS,
  DEMO_ORG
} from '@/lib/demo-data';

type Tab = 'feed' | 'competitors' | 'alerts' | 'calendar';

function getEventIcon(type: string) {
  switch (type) {
    case 'promo': return '🏷️';
    case 'email': return '📧';
    default: return '📊';
  }
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'new_promo': return '🏷️';
    case 'promo_ended': return '🔔';
    case 'email_spike': return '📧';
    default: return '📊';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'error': return 'bg-red-100 text-red-700';
    default: return 'bg-yellow-100 text-yellow-700';
  }
}

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const tabs = [
    { id: 'feed', label: 'Activity Feed', icon: Activity },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: 2 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-medium">Demo Mode</span>
            <span className="text-blue-200 text-sm">— Viewing sample data</span>
          </div>
          <a
            href="/"
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition"
          >
            Exit Demo
          </a>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-48px)]">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">CompetitorEdge</h1>
            <p className="text-sm text-gray-500">{DEMO_ORG.name}</p>
          </div>

          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">D</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Demo User</p>
                <p className="text-xs text-gray-500">Growth Plan</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'feed' && <FeedView />}
          {activeTab === 'competitors' && <CompetitorsView />}
          {activeTab === 'alerts' && <AlertsView />}
          {activeTab === 'calendar' && <CalendarView />}
        </main>
      </div>
    </div>
  );
}

function FeedView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Feed</h2>
          <p className="text-gray-500">Real-time competitor activity</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live updating
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Active Promos
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {DEMO_PROMOS.filter(p => p.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Competitors
          </div>
          <p className="text-2xl font-bold text-gray-900">{DEMO_COMPETITORS.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Mail className="w-4 h-4" />
            Emails (24h)
          </div>
          <p className="text-2xl font-bold text-gray-900">7</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Bell className="w-4 h-4" />
            Alerts
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {DEMO_ALERTS.filter(a => !a.is_read).length}
          </p>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {DEMO_FEED.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getEventIcon(item.event_type)}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{item.competitor_name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.event_type === 'promo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.event_type}
                    </span>
                    {item.is_active && item.event_type === 'promo' && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700">{item.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {item.code && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                          {item.code}
                        </code>
                      </span>
                    )}
                    {item.discount_percent && (
                      <span className="text-green-600 font-medium">
                        {item.discount_percent}% off
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(item.event_time), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <a
                href={`https://${item.competitor_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorsView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competitors</h2>
          <p className="text-gray-500">
            {DEMO_COMPETITORS.length} of {DEMO_ORG.competitor_limit} competitors
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Competitor
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {DEMO_COMPETITORS.map((competitor) => (
          <div
            key={competitor.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-gray-600">
                    {competitor.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                  <p className="text-sm text-gray-500">{competitor.domain}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(competitor.scrape_status)}`}>
                {competitor.scrape_status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Last scraped {formatDistanceToNow(new Date(competitor.last_scraped_at!), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-2">
                {competitor.email_subscribed && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Mail className="w-3.5 h-3.5" />
                    Subscribed
                  </span>
                )}
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
          <p className="text-gray-500">Real-time competitive intelligence</p>
        </div>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <Check className="w-4 h-4" />
          Mark all read
        </button>
      </div>

      <div className="space-y-3">
        {DEMO_ALERTS.map((alert) => (
          <div
            key={alert.id}
            className={`bg-white rounded-lg border p-4 transition ${
              alert.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">{getAlertIcon(alert.alert_type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{alert.competitor?.name}</span>
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {alert.alert_type.replace('_', ' ')}
                  </span>
                  {!alert.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <h3 className="text-gray-900 font-medium">{alert.title}</h3>
                <p className="text-sm text-gray-600">{alert.message}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const month = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Calendar</h2>
          <p className="text-gray-500">Visualize competitor promotions over time</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{month}</h3>
          <div className="flex items-center gap-4">
            {DEMO_COMPETITORS.slice(0, 3).map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  ['bg-blue-500', 'bg-green-500', 'bg-purple-500'][i]
                }`} />
                <span className="text-sm text-gray-600">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => {
            const dayNum = i - 3;
            const isToday = dayNum === today.getDate();
            const hasPromo = [5, 8, 12, 15, 20, 22, 25].includes(dayNum);

            return (
              <div
                key={i}
                className={`h-20 p-1 rounded-lg border ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                }`}
              >
                {dayNum > 0 && dayNum <= 31 && (
                  <>
                    <span className={`text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                      {dayNum}
                    </span>
                    {hasPromo && (
                      <div className="mt-1 space-y-0.5">
                        <div className="text-xs bg-blue-100 text-blue-700 rounded px-1 truncate">
                          50% off
                        </div>
                        {dayNum === 22 && (
                          <div className="text-xs bg-green-100 text-green-700 rounded px-1 truncate">
                            Free ship
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
