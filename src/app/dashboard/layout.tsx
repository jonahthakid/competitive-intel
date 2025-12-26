'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Zap, Users, Bell, Calendar, Settings, Menu, X, Mail, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Live Feed', icon: Zap, showPulse: true },
  { href: '/dashboard/competitors', label: 'Targets', icon: Users },
  { href: '/dashboard/alerts', label: 'Signals', icon: Bell, badge: true },
  { href: '/dashboard/emails', label: 'Intercepts', icon: Mail },
  { href: '/dashboard/calendar', label: 'Timeline', icon: Calendar },
  { href: '/dashboard/settings', label: 'Config', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen dark">
      {/* Background gradient */}
      <div className="bg-gradient-blur" />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:text-white">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="font-bold text-lg tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white">CE</div>
          <span className="text-white">Competitor</span><span className="text-indigo-400">Edge</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-slate-900/80 backdrop-blur-md border-r border-white/5 z-40 transition-transform lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/5">
          <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs">CE</div>
            Competitor<span className="text-indigo-400">Edge</span>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <div className="text-xs font-mono text-slate-500 px-4 mb-2 mt-2 uppercase tracking-wider">Intelligence</div>
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  isActive ? "nav-link-active group" : "nav-link"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "group-hover:animate-pulse")} />
                {item.label}
                {item.showPulse && isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                )}
                {item.badge && (
                  <span className="ml-auto bg-slate-700 text-xs py-0.5 px-2 rounded-full font-mono">3</span>
                )}
              </Link>
            );
          })}

          <div className="text-xs font-mono text-slate-500 px-4 mb-2 mt-6 uppercase tracking-wider">Analysis</div>
          {navItems.slice(4).map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  isActive ? "nav-link-active" : "nav-link"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <UserButton afterSignOutUrl="/" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">Account</span>
              <span className="text-xs text-slate-500">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
