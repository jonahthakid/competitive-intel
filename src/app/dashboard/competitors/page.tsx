'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, ExternalLink, Loader2, Pencil } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  domain: string;
  homepage_url: string;
  scrape_status: 'pending' | 'active' | 'error';
  last_scraped_at: string | null;
  created_at: string;
  promo_count?: number;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/competitors');
      if (!res.ok) throw new Error('Failed to fetch competitors');
      const data = await res.json();
      setCompetitors(data.competitors || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      setAdding(true);
      setError(null);
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add competitor');
      }

      setNewUrl('');
      setShowModal(false);
      fetchCompetitors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to remove this target?')) return;

    try {
      const res = await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete competitor');
      fetchCompetitors();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const scrapeCompetitor = async (id: string) => {
    try {
      setScraping(id);
      const res = await fetch(`/api/competitors/${id}/scrape`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to scrape competitor');
      await fetchCompetitors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScraping(null);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge-success">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Monitoring
          </span>
        );
      case 'error':
        return (
          <span className="badge-error">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="badge-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Re-indexing
          </span>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Target Management</h1>
          <p className="text-slate-400 mt-1">Configure scanning intervals and asset tracking.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gradient flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          Add Target
        </button>
      </div>

      {error && (
        <div className="glass-card border-red-500/30 p-4 mb-6">
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 bg-slate-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : competitors.length === 0 ? (
        <div className="glass-card text-center py-12">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No targets configured</h3>
          <p className="text-slate-400 mb-4">Add your first target to begin surveillance</p>
          <button onClick={() => setShowModal(true)} className="btn-gradient">
            Initialize First Target
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/5 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <div className="col-span-5">Target Name / URL</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Last Scan</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors group"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                  {comp.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{comp.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{comp.domain}</div>
                </div>
              </div>
              <div className="col-span-3">
                <StatusBadge status={comp.scrape_status} />
              </div>
              <div className="col-span-2 text-sm text-slate-400 font-mono">
                {comp.last_scraped_at ? formatRelativeTime(comp.last_scraped_at) : 'Never'}
              </div>
              <div className="col-span-2 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => scrapeCompetitor(comp.id)}
                  disabled={scraping === comp.id}
                  className="p-2 hover:text-white text-slate-400 hover:bg-white/10 rounded transition-colors"
                  title="Force scan"
                >
                  {scraping === comp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={comp.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:text-white text-slate-400 hover:bg-white/10 rounded transition-colors"
                  title="Visit site"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deleteCompetitor(comp.id)}
                  className="p-2 hover:text-red-400 text-slate-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Remove target"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Add Target</h2>
            <form onSubmit={addCompetitor}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target URL
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="e.g., nike.com or https://nike.com"
                className="input mb-4"
                autoFocus
              />
              <p className="text-sm text-slate-500 mb-6">
                We&apos;ll initiate reconnaissance on their homepage and email campaigns.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newUrl.trim()}
                  className="btn-gradient flex-1 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    'Initialize Target'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
