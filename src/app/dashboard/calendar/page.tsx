'use client';

import { useState, useEffect } from 'react';
import { Calendar, Loader2, Download } from 'lucide-react';
import PromoCalendar from '@/components/calendar/promo-calendar';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  isActive: boolean;
  competitor: {
    id: string;
    name: string;
    domain: string;
  };
  promoCode: string | null;
  discountPercent: number | null;
  sourceType: string;
  eventType?: 'promo' | 'email';
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [competitors, setCompetitors] = useState<{ id: string; name: string; domain: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const start = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(`/api/calendar?start=${start}&end=${end}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setCompetitors(data.competitors || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (events.length === 0) return;

    const headers = ['Type', 'Competitor', 'Title', 'Code', 'Discount', 'Start Date', 'End Date', 'Status'];
    const rows = events.map((event) => [
      event.eventType === 'email' ? 'Email' : 'Promo',
      event.competitor.name,
      event.description || event.title,
      event.promoCode || '',
      event.discountPercent ? `${event.discountPercent}%` : '',
      new Date(event.start).toLocaleDateString(),
      event.eventType === 'email' ? '-' : event.isActive ? 'Ongoing' : new Date(event.end).toLocaleDateString(),
      event.eventType === 'email' ? 'Received' : event.isActive ? 'Active' : 'Ended',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promo-calendar-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Calendar</h1>
          <p className="mt-1 text-gray-600">Visualize competitor promotions over time.</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={events.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No promo data yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Add competitors and we'll start tracking their promotions.
          </p>
        </div>
      ) : (
        <PromoCalendar events={events} competitors={competitors} />
      )}

      {events.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Active Promos</p>
            <p className="text-3xl font-bold text-gray-900">
              {events.filter((e) => e.eventType !== 'email' && e.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Promos</p>
            <p className="text-3xl font-bold text-gray-900">
              {events.filter((e) => e.eventType !== 'email').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Emails Tracked</p>
            <p className="text-3xl font-bold text-purple-600">
              {events.filter((e) => e.eventType === 'email').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Competitors</p>
            <p className="text-3xl font-bold text-gray-900">{competitors.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
