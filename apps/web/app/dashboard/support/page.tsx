'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';

// ═══════════════════════════════════════════════════════════════
//  MÉTADONNÉES
// ═══════════════════════════════════════════════════════════════

const COLUMNS = [
  { id: 'OPEN',        title: 'Nouveau',     color: 'bg-blue-500' },
  { id: 'IN_PROGRESS', title: 'En cours',    color: 'bg-amber-500' },
  { id: 'WAITING',     title: 'En attente',  color: 'bg-purple-500' },
  { id: 'RESOLVED',    title: 'Résolu',      color: 'bg-emerald-500' },
  { id: 'CLOSED',      title: 'Fermé',       color: 'bg-slate-400' },
];

const STATUS_META: Record<string, { label: string; bg: string; text: string; color: string }> = {
  OPEN:        { label: 'Nouveau',    bg: 'bg-blue-100',    text: 'text-blue-700',    color: '#3b82f6' },
  IN_PROGRESS: { label: 'En cours',   bg: 'bg-amber-100',   text: 'text-amber-700',   color: '#f59e0b' },
  WAITING:     { label: 'En attente', bg: 'bg-purple-100',  text: 'text-purple-700',  color: '#8b5cf6' },
  RESOLVED:    { label: 'Résolu',     bg: 'bg-emerald-100', text: 'text-emerald-700', color: '#10b981' },
  CLOSED:      { label: 'Fermé',      bg: 'bg-slate-100',   text: 'text-slate-600',   color: '#64748b' },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Basse',   color: '#64748b', bg: 'bg-slate-100' },
  NORMAL: { label: 'Normale', color: '#3b82f6', bg: 'bg-blue-100' },
  HIGH:   { label: 'Haute',   color: '#f59e0b', bg: 'bg-amber-100' },
  URGENT: { label: 'Urgent',  color: '#dc2626', bg: 'bg-red-100' },
};

const CATEGORY_LABEL: Record<string, string> = {
  BUG: '🐛 Bug',
  FEATURE_REQUEST: '✨ Demande de fonctionnalité',
  QUESTION: '❓ Question',
  BILLING: '💳 Facturation',
  OTHER: '📌 Autre',
};

function prioMeta(p: string) { return PRIORITY_META[p] || PRIORITY_META.NORMAL; }

const SLA_META: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  OK:         { label: 'SLA OK',        bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
  WARNING:    { label: 'SLA < 4h',      bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '⏰' },
  URGENT:     { label: 'SLA < 1h',      bg: 'bg-orange-100',  text: 'text-orange-700',  icon: '🔥' },
  BREACHED:   { label: 'SLA DÉPASSÉ',   bg: 'bg-red-100',     text: 'text-red-700',     icon: '🚨' },
  MET:        { label: 'SLA respecté',  bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
  NO_SLA:     { label: '',              bg: '',               text: '',                 icon: '' },
};

function slaMeta(s?: string) {
  return SLA_META[s || 'NO_SLA'] || SLA_META.NO_SLA;
}

function slaRemaining(ticket: any) {
  if (!ticket?.slaResolutionDeadline) return null;
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) return null;
  const ms = new Date(ticket.slaResolutionDeadline).getTime() - Date.now();
  if (ms < 0) return 'Dépassé';
  const h = Math.floor(ms / (60 * 60 * 1000));
  if (h < 1) return `${Math.floor(ms / 60000)}min`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}
function statusMeta(s: string) { return STATUS_META[s] || STATUS_META.OPEN; }

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ═══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

interface TicketWithSla {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  slaStatus?: string;
  slaResolutionDeadline?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  tags?: string[];
  organization?: any;
  createdBy?: any;
  assignedTo?: any;
  _count?: { messages: number };
  updatedAt: string;
}

export default function SupportPage() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [slaStats, setSlaStats] = useState<any>(null);
  const [macros, setMacros] = useState<any[]>([]);
  const [showMacrosModal, setShowMacrosModal] = useState(false);
  const [showMacrosDropdown, setShowMacrosDropdown] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' && user?.isOwner;

  async function load() {
    const [me, t, s, sla] = await Promise.all([
      apiFetch('/api/auth/me', { headers }).then((r) => r.json()),
      apiFetch('/api/support', { headers }).then((r) => r.json()),
      apiFetch('/api/support/stats', { headers }).then((r) => r.json()),
      apiFetch('/api/support/sla-stats', { headers }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    setUser(me);
    setTickets(Array.isArray(t) ? t : []);
    setStats(s);
    setSlaStats(sla);

    // Charger macros si super admin
    if (me?.role === 'SUPER_ADMIN' && me?.isOwner) {
      const m = await apiFetch('/api/support/macros', { headers }).then((r) => r.ok ? r.json() : []).catch(() => []);
      setMacros(Array.isArray(m) ? m : []);
    }
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  async function openTicket(t: any) {
    const res = await apiFetch(`/api/support/${t.id}`, { headers });
    setSelected(await res.json());
  }

  async function changeStatus(ticketId: string, status: string) {
    await apiFetch(`/api/support/${ticketId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    const res = await apiFetch(`/api/support/${ticketId}`, { headers });
    setSelected(await res.json());
    await load();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    setSending(true);
    await apiFetch(`/api/support/${selected.id}/messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ content: message, isInternal: isSuperAdmin ? isInternal : false }),
    });
    setMessage(''); setIsInternal(false);
    setSending(false);
    const res = await apiFetch(`/api/support/${selected.id}`, { headers });
    setSelected(await res.json());
    await load();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t) =>
      t.reference?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.organization?.name?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  // Vue Kanban pour Super Admin
  const byColumn = useMemo(() => {
    const map: Record<string, any[]> = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    filtered.forEach((t) => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [filtered]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  // ═══════════════════════════════════════════════════════════════
  //  VUE SUPER ADMIN (Kanban)
  // ═══════════════════════════════════════════════════════════════

  if (isSuperAdmin) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Support</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Tickets</h1>
          <p className="text-slate-500 mt-1">
            {stats?.total || 0} ticket{(stats?.total || 0) > 1 ? 's' : ''} · {stats?.open || 0} nouveau{(stats?.open || 0) > 1 ? 'x' : ''} · {stats?.urgent || 0} urgent{(stats?.urgent || 0) > 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Nouveaux</p>
            <p className="text-2xl font-black text-blue-400">{stats?.open || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">En cours</p>
            <p className="text-2xl font-black text-amber-600">{stats?.inProgress || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Résolus</p>
            <p className="text-2xl font-black text-emerald-600">{stats?.resolved || 0}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
            <p className="text-[10px] text-red-700 uppercase font-black tracking-widest mb-1">Urgents</p>
            <p className="text-2xl font-black text-red-600">{stats?.urgent || 0}</p>
          </div>
        </div>

        {slaStats && slaStats.total > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 flex divide-x divide-slate-100 overflow-hidden">
            <div className="flex-1 px-4 py-3">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">SLA respecté</p>
              <div className="flex items-baseline gap-2">
                <span className={'text-2xl font-black tabular-nums ' + (slaStats.slaRespectedPct >= 90 ? 'text-emerald-600' : slaStats.slaRespectedPct >= 70 ? 'text-amber-600' : 'text-red-600')}>
                  {slaStats.slaRespectedPct}%
                </span>
                <span className="text-[11px] text-slate-400">{slaStats.slaRespected}/{slaStats.total}</span>
              </div>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Réponse moy.</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{slaStats.avgResponseMinutes}</span>
                <span className="text-[11px] text-slate-400">min</span>
              </div>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Résolution moy.</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{slaStats.avgResolutionHours}</span>
                <span className="text-[11px] text-slate-400">h</span>
              </div>
            </div>
            <div className="flex-1 px-4 py-3 bg-slate-50 flex items-center justify-center">
              <a
                href="/dashboard/support/macros"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                ⚡ Gérer les macros ({macros.length})
              </a>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, titre, organisation…"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid gap-3 min-w-max lg:min-w-0" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))` }}>
            {COLUMNS.map((col) => (
              <div key={col.id} className="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col min-h-[500px]">
                <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200">
                  <span className={'w-2.5 h-2.5 rounded-full ' + col.color}></span>
                  <h3 className="font-bold text-slate-900 text-sm flex-1">{col.title}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full">
                    {byColumn[col.id]?.length || 0}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-400px)]">
                  {(byColumn[col.id] || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                      Vide
                    </div>
                  ) : (
                    byColumn[col.id].map((t) => {
                      const pm = prioMeta(t.priority);
                      return (
                        <button
                          key={t.id}
                          onClick={() => openTicket(t)}
                          className="w-full text-left bg-white rounded-xl p-3 shadow-sm border border-slate-200 hover:border-teal-400 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500">{t.reference}</span>
                            <span className={'text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ' + pm.bg} style={{ color: pm.color }}>
                              {pm.label.toUpperCase()}
                            </span>
                          </div>
                          {(() => {
                            const slm = slaMeta(t.slaStatus);
                            if (!slm.label) return null;
                            const rem = slaRemaining(t);
                            return (
                              <div className="flex items-center gap-1 mb-1.5">
                                <span className={'inline-flex items-center gap-1 text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ' + slm.bg + ' ' + slm.text}>
                                  <span>{slm.icon}</span>
                                  <span>{slm.label}</span>
                                </span>
                                {rem && (
                                  <span className={'text-[9px] font-bold ' + slm.text}>· {rem}</span>
                                )}
                              </div>
                            );
                          })()}
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-2 mb-2">{t.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate">{t.organization?.name}</span>
                            <span>{timeAgo(t.updatedAt)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && <TicketDrawer selected={selected} setSelected={setSelected} message={message} setMessage={setMessage} isInternal={isInternal} setIsInternal={setIsInternal} sending={sending} sendMessage={sendMessage} changeStatus={changeStatus} isSuperAdmin={true} macros={macros} />}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  VUE TENANT (liste + créer + répondre)
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Support</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Mes tickets</h1>
          <p className="text-slate-500 mt-1">
            {stats?.total || 0} ticket{(stats?.total || 0) > 1 ? 's' : ''} · {stats?.open || 0} en attente · {stats?.resolved || 0} résolu{(stats?.resolved || 0) > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau ticket
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Nouveaux</p>
          <p className="text-2xl font-black text-blue-600">{stats?.open || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">En cours</p>
          <p className="text-2xl font-black text-amber-600">{stats?.inProgress || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Résolus</p>
          <p className="text-2xl font-black text-emerald-600">{stats?.resolved || 0}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par référence ou titre…"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🎫</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun ticket</p>
          <p className="text-sm text-slate-400 mb-4">Créez un ticket pour contacter le support</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-bold text-sm transition"
          >
            + Nouveau ticket
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const sm = statusMeta(t.status);
            const pm = prioMeta(t.priority);
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: sm.color }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-500">{t.reference}</span>
                      <span className={'text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ' + sm.bg + ' ' + sm.text}>
                        {sm.label.toUpperCase()}
                      </span>
                      {t.priority !== 'NORMAL' && (
                        <span className={'text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ' + pm.bg} style={{ color: pm.color }}>
                          {pm.label.toUpperCase()}
                        </span>
                      )}
                      {(() => {
                        const slm = slaMeta(t.slaStatus);
                        if (!slm.label) return null;
                        const rem = slaRemaining(t);
                        return (
                          <>
                            <span className={'inline-flex items-center gap-1 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ' + slm.bg + ' ' + slm.text}>
                              <span>{slm.icon}</span>
                              <span>{slm.label}</span>
                            </span>
                            {rem && (
                              <span className={'text-[9px] font-bold ' + slm.text}>· {rem}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm truncate">{t.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span>{CATEGORY_LABEL[t.category] || t.category}</span>
                      <span>·</span>
                      <span>{timeAgo(t.updatedAt)}</span>
                      {t._count?.messages > 0 && <><span>·</span><span>💬 {t._count.messages}</span></>}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <CreateTicketModal
          headers={headers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* Drawer détail */}
      {selected && <TicketDrawer selected={selected} setSelected={setSelected} message={message} setMessage={setMessage} isInternal={isInternal} setIsInternal={setIsInternal} sending={sending} sendMessage={sendMessage} changeStatus={changeStatus} isSuperAdmin={false} macros={[]} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

function TicketDrawer({ selected, setSelected, message, setMessage, isInternal, setIsInternal, sending, sendMessage, changeStatus, isSuperAdmin, macros = [] }: any) {
  const [macrosOpen, setMacrosOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
      <div className="relative w-full max-w-3xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">{selected.reference}</p>
              <h2 className="text-xl font-black truncate">{selected.title}</h2>
              <p className="text-xs text-blue-200 mt-1">
                {selected.organization?.name} · {CATEGORY_LABEL[selected.category] || selected.category}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl shrink-0">×</button>
          </div>
          {isSuperAdmin && (
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => changeStatus(selected.id, c.id)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                    selected.status === c.id ? c.color + ' text-white shadow' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 space-y-4">
          {selected.description && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">
              Conversation ({selected.messages?.length || 0})
            </p>
            <div className="space-y-3">
              {(selected.messages || []).map((m: any) => {
                const isStaff = m.author?.role === 'SUPER_ADMIN';
                return (
                  <div key={m.id} className={'flex gap-3 ' + (isStaff ? 'flex-row-reverse' : '')}>
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ' + (isStaff ? 'bg-slate-900' : 'bg-blue-500')}>
                      {(m.author?.name || m.author?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={'flex-1 max-w-[80%] ' + (isStaff ? 'text-right' : '')}>
                      <div className={'inline-block text-left rounded-xl p-3 ' + (
                        m.isInternal ? 'bg-amber-50 border border-amber-200' : isStaff ? 'bg-slate-900 text-white' : 'bg-slate-100'
                      )}>
                        <p className={'text-[10px] font-bold mb-1 ' + (isStaff && !m.isInternal ? 'text-slate-400' : 'text-slate-500')}>
                          {m.author?.name || m.author?.email}
                          {m.isInternal && <span className="ml-2 text-amber-700">· NOTE INTERNE</span>}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 px-1">{new Date(m.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                );
              })}
              {(selected.messages || []).length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">Aucun message pour le moment</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 bg-slate-50 space-y-3 sticky bottom-0">
          {isSuperAdmin && macros.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMacrosOpen(!macrosOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                ⚡ Macros ({macros.length})
                <svg className={'w-3 h-3 transition ' + (macrosOpen ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {macrosOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-96 max-h-80 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
                  {macros.slice(0, 15).map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={async () => {
                        setMessage(m.content);
                        setMacrosOpen(false);
                        apiFetch('/api/support/macros/' + m.id + '/use', { method: 'POST' }).catch(() => {});
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-900">{m.name}</span>
                        {m.category && (
                          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {m.category}
                          </span>
                        )}
                        <span className="ml-auto text-[9px] text-slate-400">utilisée {m.usageCount}×</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{m.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Écrire une réponse…"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            {isSuperAdmin ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                <span className="text-xs font-medium text-slate-700">Note interne (invisible côté client)</span>
              </label>
            ) : <span className="text-xs text-slate-500">Votre réponse sera visible par l'équipe support</span>}
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50"
            >
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTicketModal({ headers, onClose, onCreated }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('QUESTION');
  const [priority, setPriority] = useState('NORMAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const res = await apiFetch('/api/support', {
      method: 'POST', headers,
      body: JSON.stringify({ title, description, category, priority }),
    });
    setSaving(false);
    if (res.ok) onCreated();
    else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
          <h2 className="text-xl font-black">Nouveau ticket</h2>
          <p className="text-xs text-blue-200 mt-1">Décrivez votre problème ou question</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Titre <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400"
              placeholder="Résumé de votre demande" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="Détails, étapes pour reproduire…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
                <option value="BUG">🐛 Bug</option>
                <option value="FEATURE_REQUEST">✨ Demande</option>
                <option value="QUESTION">❓ Question</option>
                <option value="BILLING">💳 Facturation</option>
                <option value="OTHER">📌 Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Priorité</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
              Annuler
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50">
              {saving ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
