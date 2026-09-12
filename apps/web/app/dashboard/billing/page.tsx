'use client';

import { useState, useEffect, useMemo } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';

type StatusFilter = 'ALL' | 'PAID' | 'PENDING';

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function monthKey(d: string | Date) {
  const dt = new Date(d);
  return dt.getFullYear() * 100 + (dt.getMonth() + 1);
}
function monthLabel(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function BillingPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await fetch('/api/billing', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPayments(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function markAsPaid(id: string) {
    setBusy(id);
    await fetch(`/api/billing/mark-paid/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setBusy(null);
    showToast('Facture marquee payee');
    await load();
  }

  async function confirmDelete() {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    await fetch(`/api/billing/${paymentToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setPaymentToDelete(null);
    setIsDeleting(false);
    showToast('Facture supprimee');
    await load();
  }

  const kpis = useMemo(() => {
    const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    const totalPending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
    const countPaid = payments.filter(p => p.status === 'PAID').length;
    const countPending = payments.filter(p => p.status === 'PENDING').length;
    const now = new Date();
    const thisMonth = payments
      .filter(p => p.status === 'PAID' && monthKey(p.date) === monthKey(now))
      .reduce((s, p) => s + p.amount, 0);
    return { totalPaid, totalPending, countPaid, countPending, thisMonth, total: payments.length };
  }, [payments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (statusFilter !== 'ALL') list = list.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.organization?.name?.toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, statusFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<number, { label: string; items: any[]; total: number; paid: number; pending: number }>();
    filtered.forEach(p => {
      const key = monthKey(p.date);
      if (!map.has(key)) {
        map.set(key, { label: monthLabel(p.date), items: [], total: 0, paid: 0, pending: 0 });
      }
      const g = map.get(key)!;
      g.items.push(p);
      g.total += p.amount;
      if (p.status === 'PAID') g.paid += p.amount;
      else g.pending += p.amount;
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header Ledger */}
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Grand Livre</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facturation</h1>
        <p className="text-slate-500 mt-1">
          {kpis.total} facture{kpis.total > 1 ? 's' : ''} · {kpis.countPaid} payee{kpis.countPaid > 1 ? 's' : ''} · {kpis.countPending} en attente
        </p>
      </div>

      {/* Bandeau 3 soldes style bancaire */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5">
          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-2">Encaissement total</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">
            {kpis.totalPaid.toLocaleString('fr-FR')}
            <span className="text-sm text-slate-400 ml-1">Ar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-2">{kpis.countPaid} factures reglees</p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5">
          <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-2">En attente</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">
            {kpis.totalPending.toLocaleString('fr-FR')}
            <span className="text-sm text-slate-400 ml-1">Ar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-2">{kpis.countPending} factures a encaisser</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Mois en cours</p>
          <p className="text-3xl font-black text-teal-400 tabular-nums">
            {kpis.thisMonth.toLocaleString('fr-FR')}
            <span className="text-sm text-slate-400 ml-1">Ar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-2">{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Barre recherche + filtre */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-col sm:flex-row gap-2 items-stretch">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par organisation ou note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'PAID', 'PENDING'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition ${
                statusFilter === s
                  ? s === 'PAID' ? 'bg-emerald-500 text-white shadow-md'
                    : s === 'PENDING' ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {s === 'ALL' ? 'Toutes' : s === 'PAID' ? 'Payees' : 'En attente'}
            </button>
          ))}
        </div>
      </div>

      {/* Relevé groupé par mois */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <p className="text-lg font-bold text-slate-700 mb-1">Aucune facture</p>
          <p className="text-sm text-slate-400">
            {search || statusFilter !== 'ALL' ? 'Modifiez vos filtres' : 'Les factures apparaitront ici'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([key, group]) => {
            const isCollapsed = collapsed[key];
            return (
              <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* En-tete mois style releve */}
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                    </svg>
                    <h2 className="font-black text-slate-900 text-base capitalize">{group.label}</h2>
                    <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {group.items.length} facture{group.items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {group.paid > 0 && (
                      <div>
                        <p className="text-[9px] text-emerald-600 uppercase font-black tracking-wider">Encaisse</p>
                        <p className="text-sm font-black text-emerald-600 tabular-nums">
                          {group.paid.toLocaleString('fr-FR')} Ar
                        </p>
                      </div>
                    )}
                    {group.pending > 0 && (
                      <div>
                        <p className="text-[9px] text-amber-600 uppercase font-black tracking-wider">En attente</p>
                        <p className="text-sm font-black text-amber-600 tabular-nums">
                          {group.pending.toLocaleString('fr-FR')} Ar
                        </p>
                      </div>
                    )}
                    <div className="pl-4 border-l border-slate-200">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Total</p>
                      <p className="text-sm font-black text-slate-900 tabular-nums">
                        {group.total.toLocaleString('fr-FR')} Ar
                      </p>
                    </div>
                  </div>
                </button>

                {/* Lignes */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {group.items.map(p => {
                      const isPaid = p.status === 'PAID';
                      const isBusy = busy === p.id;
                      return (
                        <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition group">
                          {/* Date colonne */}
                          <div className="w-24 shrink-0 text-center">
                            <p className="text-xs font-black text-slate-900 tabular-nums">{fmtDate(p.date)}</p>
                            <p className="text-[10px] text-slate-400 tabular-nums">{fmtTime(p.date)}</p>
                          </div>

                          {/* Separateur */}
                          <div className={`w-0.5 self-stretch ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'} rounded-full`}></div>

                          {/* Organisation + note */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-900 text-sm truncate">{p.organization?.name}</p>
                              {p.organization?.type && (
                                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  {p.organization.type}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {p.note || p.subscription?.status || 'Facture mensuelle'}
                            </p>
                          </div>

                          {/* Statut badge */}
                          <div className="shrink-0 hidden sm:block">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md ${
                              isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {isPaid ? 'PAYEE' : 'EN ATTENTE'}
                            </span>
                          </div>

                          {/* Montant à droite */}
                          <div className="w-32 shrink-0 text-right">
                            <p className={`text-lg font-black tabular-nums ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {isPaid ? '+' : ''}{p.amount.toLocaleString('fr-FR')}
                              <span className="text-xs text-slate-400 ml-1">Ar</span>
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            {!isPaid && (
                              <button
                                onClick={() => markAsPaid(p.id)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                                title="Marquer payee"
                              >
                                {isBusy ? '...' : 'Encaisser'}
                              </button>
                            )}
                            <button
                              onClick={() => setPaymentToDelete(p)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600 flex items-center justify-center transition"
                              title="Supprimer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!paymentToDelete}
        title="Supprimer la facture"
        message={`Supprimer cette facture de ${paymentToDelete?.amount?.toLocaleString('fr-FR')} Ar ?`}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
