'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { useRouter } from 'next/navigation';

const ICONS = {
  customer: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
    </svg>
  ),
  organization: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
    </svg>
  ),
  reservation: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  module: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Ouvrir avec Cmd+K ou Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Focus auto
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
    }
  }, [open]);

  // Recherche debounced
  useEffect(() => {
    if (!open || query.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // Navigation clavier
  function handleKeyDown(e: React.KeyboardEvent) {
    const allItems = getAllItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) navigate(item);
    }
  }

  function getAllItems(): any[] {
    if (!results) return [];
    return [
      ...(results.customers || []).map((c: any) => ({
        type: 'customer',
        label: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sans nom)',
        sub: [c.type, c.email, c.phone, c.city].filter(Boolean).join(' · ') || '',
        href: `/dashboard/crm/${c.id}`,
      })),
      ...(results.reservations || []).map((r: any) => ({
        type: 'reservation',
        label: r.reference,
        sub: `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.trim(),
        href: `/dashboard/reservations`,
      })),
      ...(results.organizations || []).map((o: any) => ({
        type: 'organization',
        label: o.name,
        sub: o.type || o.slug || '',
        href: `/dashboard/organizations`,
      })),
      ...(results.users || []).map((u: any) => ({
        type: 'user',
        label: u.name || u.email,
        sub: u.email,
        href: `/dashboard/users`,
      })),
      ...(results.modules || []).map((m: any) => ({
        type: 'module',
        label: m.name,
        sub: m.route || '',
        href: `/dashboard/modules`,
      })),
    ];
  }

  function navigate(item: any) {
    router.push(item.href);
    setOpen(false);
  }

  const allItems = getAllItems();
  const hasResults = allItems.length > 0;
  const showEmpty = query.length >= 2 && !loading && results && !hasResults;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)}></div>

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher clients, réservations, organisations, utilisateurs…"
            className="flex-1 bg-transparent outline-none text-slate-900 text-base placeholder-slate-400"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 font-medium">Recherche globale</p>
              <p className="text-xs text-slate-400 mt-1">
                Tapez au moins 2 caractères pour rechercher
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">↑↓</kbd>
                <span>naviguer</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">↵</kbd>
                <span>ouvrir</span>
              </div>
            </div>
          )}

          {showEmpty && (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Aucun résultat pour "{query}"</p>
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Clients */}
              {results.customers?.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Clients</div>
                  {results.customers.map((c: any, i: number) => {
                    const idx = i;
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate({ href: `/dashboard/crm/${c.id}` })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          selectedIndex === idx ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          {ICONS.customer}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{c.email || c.phone || c.city || '—'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Réservations */}
              {results.reservations?.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Réservations
                  </div>
                  {results.reservations.map((r: any, i: number) => {
                    const idx = (results.customers?.length || 0) + i;
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate({ href: '/dashboard/reservations' })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          selectedIndex === idx ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center shrink-0">
                          {ICONS.reservation}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 font-mono truncate">{r.reference}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {r.customer?.firstName} {r.customer?.lastName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Organisations */}
              {results.organizations?.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Organisations
                  </div>
                  {results.organizations.map((o: any, i: number) => {
                    const idx = (results.customers?.length || 0) + (results.reservations?.length || 0) + i;
                    return (
                      <button
                        key={o.id}
                        onClick={() => navigate({ href: '/dashboard/organizations' })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          selectedIndex === idx ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                          {ICONS.organization}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{o.name}</div>
                          <div className="text-xs text-slate-500 truncate">{o.type || o.slug}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Utilisateurs */}
              {results.users?.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Utilisateurs
                  </div>
                  {results.users.map((u: any, i: number) => {
                    const idx =
                      (results.customers?.length || 0) +
                      (results.reservations?.length || 0) +
                      (results.organizations?.length || 0) +
                      i;
                    return (
                      <button
                        key={u.id}
                        onClick={() => navigate({ href: '/dashboard/users' })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          selectedIndex === idx ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                          {ICONS.user}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Modules */}
              {results.modules?.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Modules
                  </div>
                  {results.modules.map((m: any, i: number) => {
                    const idx =
                      (results.customers?.length || 0) +
                      (results.reservations?.length || 0) +
                      (results.organizations?.length || 0) +
                      (results.users?.length || 0) +
                      i;
                    return (
                      <button
                        key={m.id}
                        onClick={() => navigate({ href: '/dashboard/modules' })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          selectedIndex === idx ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
                          {ICONS.module}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{m.name}</div>
                          <div className="text-xs text-slate-500 truncate font-mono">{m.route}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">⌘K</kbd>
              <span>ouvrir</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">↵</kbd>
              <span>sélectionner</span>
            </span>
          </div>
          {hasResults && <span>{allItems.length} résultat{allItems.length > 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  );
}
