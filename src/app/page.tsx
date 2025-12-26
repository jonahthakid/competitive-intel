import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight, Eye, Mail, Zap, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background gradient */}
      <div className="bg-gradient-blur" />

      {/* Header */}
      <header className="fixed top-0 w-full z-40 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-bold text-2xl tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-white">Competitor</span><span className="text-indigo-400">Edge</span>
          </div>
          <div className="flex items-center gap-6">
            <SignedOut>
              <Link href="/sign-in" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                Log In
              </Link>
              <Link href="/sign-up" className="btn-gradient py-2 px-5 rounded-lg text-sm font-medium transition-all hover:scale-105">
                Start Intelligence
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="btn-gradient py-2 px-5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2">
                Enter Console <ArrowRight className="w-4 h-4" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-8 animate-pulse-slow">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            V2.0 LIVE INTELLIGENCE FEED
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
            See what they&apos;re doing.<br />
            <span className="text-gradient">Before they launch.</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The autonomous competitive intelligence platform. We track pricing algorithms, hidden landing pages, and email campaigns in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <SignedOut>
              <Link href="/sign-up" className="btn-gradient text-lg px-8 py-4 rounded-xl inline-flex items-center gap-3 font-semibold group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/sign-in" className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all backdrop-blur-sm">
                View Live Demo
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="btn-gradient text-lg px-8 py-4 rounded-xl inline-flex items-center gap-3 font-semibold group">
                Enter Console
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </SignedIn>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent z-10"></div>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur shadow-2xl shadow-indigo-500/10 p-2">
              <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 min-h-[400px] relative overflow-hidden">
                <div className="absolute inset-0 p-8 flex flex-col gap-4">
                  <div className="flex gap-4 mb-4">
                    <div className="w-1/4 h-32 bg-white/5 rounded-lg border border-white/5 animate-pulse"></div>
                    <div className="w-1/4 h-32 bg-white/5 rounded-lg border border-white/5 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                    <div className="w-1/4 h-32 bg-white/5 rounded-lg border border-white/5 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1/4 h-32 bg-white/5 rounded-lg border border-white/5 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-lg border border-white/5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-8 group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                <Eye className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Visual Recon</h3>
              <p className="text-slate-400 leading-relaxed">AI detection of hero banner changes, announcement bars, and hidden UI tests.</p>
            </div>

            <div className="glass-card rounded-2xl p-8 group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                <Mail className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Inbox Infiltration</h3>
              <p className="text-slate-400 leading-relaxed">We capture every email sent. Analyze subject lines, send times, and segmentation.</p>
            </div>

            <div className="glass-card rounded-2xl p-8 group">
              <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors border border-orange-500/20">
                <Zap className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Instant Alerts</h3>
              <p className="text-slate-400 leading-relaxed">Microsecond notifications via Slack or API when a competitor changes a price point.</p>
            </div>

            <div className="glass-card rounded-2xl p-8 group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors border border-purple-500/20">
                <BarChart3 className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Strategy Decoding</h3>
              <p className="text-slate-400 leading-relaxed">Historical timelines visualize their promotional cadence so you can counter-attack.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 text-white">Access Levels</h2>
        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Scout */}
          <div className="glass-card rounded-2xl p-8 border-t-4 border-t-slate-600">
            <div className="text-sm font-bold text-slate-400 mb-2 tracking-wider">SCOUT</div>
            <div className="text-4xl font-bold mb-4 text-white">$99<span className="text-lg font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> 5 Targets</li>
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> Site Monitoring</li>
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> Daily Digest</li>
            </ul>
            <Link href="/sign-up" className="block text-center py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-white font-medium">
              Initialize
            </Link>
          </div>

          {/* Tactical */}
          <div className="relative transform md:-translate-y-4">
            <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 rounded-3xl"></div>
            <div className="glass-card rounded-2xl p-8 border-t-4 border-t-indigo-500 relative bg-slate-900/80">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-indigo-500/40">
                RECOMMENDED
              </div>
              <div className="text-sm font-bold text-indigo-400 mb-2 tracking-wider">TACTICAL</div>
              <div className="text-4xl font-bold mb-4 text-white">$249<span className="text-lg font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-4 mb-8 text-slate-300">
                <li className="flex items-center gap-3"><span className="text-indigo-400">&#10003;</span> 15 Targets</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">&#10003;</span> Site + Email Recon</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">&#10003;</span> <span className="font-semibold text-white">Real-time Alerts</span></li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">&#10003;</span> 90-day Retention</li>
              </ul>
              <Link href="/sign-up" className="block text-center py-3 rounded-lg btn-gradient font-medium">
                Initialize
              </Link>
            </div>
          </div>

          {/* War Room */}
          <div className="glass-card rounded-2xl p-8 border-t-4 border-t-slate-600">
            <div className="text-sm font-bold text-slate-400 mb-2 tracking-wider">WAR ROOM</div>
            <div className="text-4xl font-bold mb-4 text-white">$599<span className="text-lg font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> 50 Targets</li>
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> Hourly Scans</li>
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> API Access</li>
              <li className="flex items-center gap-3"><span className="text-green-400">&#10003;</span> Unlimited Seats</li>
            </ul>
            <Link href="/sign-up" className="block text-center py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-white font-medium">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="font-bold text-xl tracking-tight mb-4">
            Competitor<span className="text-indigo-400">Edge</span>
          </div>
          <div className="text-slate-500 text-sm">
            &copy; 2025 CompetitorEdge Intelligence Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
