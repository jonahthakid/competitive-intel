'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';

interface PromoEvent {
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
}

interface PromoCalendarProps {
  events: PromoEvent[];
  competitors: { id: string; name: string; domain: string }[];
}

// Generate consistent colors for competitors
const COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700', dot: 'bg-indigo-500' },
];

export default function PromoCalendar({ events, competitors }: PromoCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<PromoEvent | null>(null);

  // Create color map for competitors
  const colorMap = useMemo(() => {
    const map = new Map<string, typeof COLORS[0]>();
    competitors.forEach((competitor, index) => {
      map.set(competitor.id, COLORS[index % COLORS.length]);
    });
    return map;
  }, [competitors]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 border-b border-gray-200 bg-gray-50">
        {competitors.map((competitor) => {
          const color = colorMap.get(competitor.id) || COLORS[0];
          return (
            <div key={competitor.id} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color.dot}`} />
              <span className="text-sm text-gray-700">{competitor.name}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-start-${index}`} className="h-24 bg-gray-50 rounded-lg" />
          ))}

          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`h-24 p-1 rounded-lg border ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 overflow-y-auto max-h-16">
                  {dayEvents.slice(0, 3).map((event) => {
                    const color = colorMap.get(event.competitor.id) || COLORS[0];
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left px-1.5 py-0.5 text-xs rounded truncate ${color.bg} ${color.text} hover:opacity-80`}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty cells for days after month end */}
          {Array.from({ length: 6 - monthEnd.getDay() }).map((_, index) => (
            <div key={`empty-end-${index}`} className="h-24 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedEvent.competitor.name}
                </h3>
                <p className="text-sm text-gray-500">{selectedEvent.competitor.domain}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-900">{selectedEvent.title}</p>
                {selectedEvent.description && (
                  <p className="text-gray-600 mt-1">{selectedEvent.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Started</span>
                  <p className="font-medium">
                    {format(parseISO(selectedEvent.start), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">
                    {selectedEvent.isActive ? 'Still Active' : 'Ended'}
                  </span>
                  <p className="font-medium">
                    {selectedEvent.isActive
                      ? 'Ongoing'
                      : format(parseISO(selectedEvent.end), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {selectedEvent.promoCode && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <code className="font-mono font-medium">{selectedEvent.promoCode}</code>
                </div>
              )}

              <div className="flex items-center gap-2">
                {selectedEvent.isActive ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Ended
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {selectedEvent.sourceType.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <a
                href={`https://${selectedEvent.competitor.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Visit Site
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
