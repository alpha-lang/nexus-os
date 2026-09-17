'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';

type PresetId = 'today' | 'week' | 'month' | 'all';
type StatusId = 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID';
type SortId = 'recent' | 'old' | 'remaining-desc' | 'remaining-asc';

const PRESETS = [
  { id: 'today', label: "Aujourd'hui", days: 0 },
  { id: 'week', label: '7 jours', days: 7 },
  { id: 'month', label: '30 jours', days: 30 },
  { id: 'all', label: 'Tout', days: null },
] as const;

function daysOld(dateStr: string): number {
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - d) / 86400000);
}

function ageMeta(days: number) {
  if (days <= 7)  return { label: 'RECENT',       bg: 'bg-slate-100',  text: 'text-slate-600' };
  if (days <= 30) return { label: days + 'J',      bg: 'bg-blue-100',   text: 'text-blue-700' };
  if (days <= 60) return { label: days + 'J',      bg: 'bg-amber-100',  text: 'text-amber-700' };
  return { label: 'ANCIEN ' + days + 'J',          bg: 'bg-red-100',    text: 'text-red-700' };
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');

  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<PresetId>('all');
  const [status, setStatus] = useState<StatusId>('ALL');
  const [sort, setSort] = useState<SortId>('remaining-desc');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [c, s] = await Promise.all([
      apiFetch('/api/pos/credits', { headers }).then(r => r.json()),
      apiFetch('/api/pos/credits/stats', { headers }).then(r => r.json()),
    ]);
    setCredits(Array.isArray(c) ? c : []);
    setStats(s);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  async function payCredit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await apiFetch(`/api/pos/credits/${selected.id}/pay`, {
      method: 'POST', headers,
      body: JSON.stringify({ amount: parseFloat(payAmount), method: payMethod }),
    });
    setShowPayModal(false);
    setPayAmount('');
    setSelected(null);
    await load();
  }

  // Filtre + tri
  const filtered = useMemo(() => {
    let list = [...credits];

    // Preset date
    if (preset !== 'all') {
      const now = Date.now();
      const conf = PRESETS.find(p => p.id === preset);
      const days = conf?.days ?? 30;
      const spanMs = preset === 'today' ? 86400000 : days * 86400000;
      const from = now - spanMs;
      list = list.filter(c => new Date(c.createdAt).getTime() >= from);
    }

    // Statut
    if (status !== 'ALL') {
      list = list.filter(c => {
        if (status === 'UNPAID') return c.paidAmount === 0;
        if (status === 'PARTIAL') return c.paidAmount > 0 && c.paidAmount < c.total;
        if (status === 'PAID') return c.paidAmount >= c.total;
        return true;
      });
    }

    // Recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const ref = (c.reference || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        const customer = `${c.customer?.firstName || ''} ${c.customer?.lastName || ''}`.toLowerCase();
        const room = (c.room || '').toLowerCase();
        const table = (c.table || '').toLowerCase();
        const items = (c.items || []).map((it: any) => it.menuItem?.name || '').join(' ').toLowerCase();
        return ref.includes(q) || notes.includes(q) || customer.includes(q) || room.includes(q) || table.includes(q) || items.includes(q);
      });
    }

    // Tri
    list.sort((a, b) => {
      const ra = a.total - a.paidAmount;
      const rb = b.total - b.paidAmount;
      if (sort === 'remaining-desc') return rb - ra;
      if (sort === 'remaining-asc') return ra - rb;
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === 'old' ? da - db : db - da;
    });

    return list;
  }, [credits, preset, status, search, sort]);

  const filteredTotals = useMemo(() => {
    const total = filtered.reduce((s, c) => s + c.total, 0);
    const paid = filtered.reduce((s, c) => s + c.paidAmount, 0);
    return { total, paid, remaining: total - paid, count: filtered.length };
  }, [filtered]);

  const pag = usePagination(filtered, { perPageDefault: 20 });

  useEffect(() => { pag.setPage(1); }, [search, preset, status, sort]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <div className="bg-gradient-to-r from-slate-900 via-red-900 to-orange-900 rounded-2xl px-5 py-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black">Ventes a credit</h1>
            <p className="text-xs text-red-200 mt-0.5">
              {stats?.count || 0} facture{(stats?.count || 0) > 1 ? 's' : ''} en attente
              {' - Reste a recouvrer : '}
              <span className="font-bold text-white">{(stats?.totalRemaining || 0).toLocaleString('fr-FR')} Ar</span>
            </p>
          </div>
          <a href="/dashboard/caisse" className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 text-xs font-semibold border border-white/20 transition">
            Retour caisse
          </a>
        </div>
      </div>

      {/* 3 stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total credit</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {(stats?.totalCredits || 0).toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">montant total emis</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Deja regle</p>
          <p className="text-2xl font-black text-green-700 tabular-nums">
            {(stats?.totalPaid || 0).toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">deja encaisse</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
          <p className="text-[10px] text-red-100 uppercase font-black tracking-widest mb-1">Reste a recouvrer</p>
          <p className="text-2xl font-black tabular-nums">
            {(stats?.totalRemaining || 0).toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
          </p>
          <p className="text-[10px] text-red-100 mt-1">a encaisser</p>
        </div>
      </div>

      {/* Barre filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par ref, client, table, article..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id as PresetId)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                preset === p.id ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1"></span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as StatusId)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous statuts</option>
            <option value="UNPAID">Non regle</option>
            <option value="PARTIAL">Partiel</option>
            <option value="PAID">Solde</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortId)}
            className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="remaining-desc">Reste du ↓</option>
            <option value="remaining-asc">Reste du ↑</option>
            <option value="recent">Plus recent</option>
            <option value="old">Plus ancien</option>
          </select>
        </div>
      </div>

      {/* Bandeau totaux filtres */}
      {filteredTotals.count > 0 && (
        <div className="bg-slate-900 rounded-2xl px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Filtre</p>
              <p className="text-sm font-black tabular-nums">{filteredTotals.count} facture{filteredTotals.count > 1 ? 's' : ''}</p>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Total</p>
              <p className="text-sm font-black tabular-nums">{filteredTotals.total.toLocaleString('fr-FR')} Ar</p>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Paye</p>
              <p className="text-sm font-black text-emerald-400 tabular-nums">{filteredTotals.paid.toLocaleString('fr-FR')} Ar</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Reste a recouvrer</p>
            <p className="text-lg font-black text-red-400 tabular-nums">{filteredTotals.remaining.toLocaleString('fr-FR')} Ar</p>
          </div>
        </div>
      )}

      {/* Liste credits */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">✅</div>
          <p className="text-slate-500 font-medium">
            {credits.length === 0 ? 'Aucune vente a credit en attente' : 'Aucun resultat pour ces filtres'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {credits.length === 0 ? 'Tous les paiements sont a jour' : 'Essayez de modifier la recherche ou les filtres'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b-2 border-slate-200">
                  <tr>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider">Ref.</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider">Client / Source</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider hidden md:table-cell">Articles</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider text-right">Total</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider text-right hidden sm:table-cell">Paye</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider text-right">Reste</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="p-3 text-[10px] font-black text-slate-700 uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pag.pageItems.map((c) => {
                    const age = daysOld(c.createdAt);
                    const am = ageMeta(age);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          <div>{c.reference}</div>
                          <span className={'inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded ' + am.bg + ' ' + am.text}>
                            {am.label}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-semibold text-slate-900">
                          {c.notes && (
                            <div className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded mb-1.5 inline-block">
                              {c.notes.replace(/ \| ?CREDIT/g, '').trim() || 'Vente a credit'}
                            </div>
                          )}
                          {c.customer ? (
                            <>
                              <div>{c.customer.firstName} {c.customer.lastName}</div>
                              {c.room && <div className="text-[10px] text-slate-500 font-medium">Chambre {c.room}</div>}
                            </>
                          ) : c.table ? (
                            <span>Table {c.table}</span>
                          ) : (
                            <span className="text-slate-500 italic">Comptoir</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-700 truncate max-w-xs hidden md:table-cell">
                          {c.items.slice(0, 2).map((it: any) => it.quantity + 'x ' + (it.menuItem?.name || '?')).join(', ')}
                          {c.items.length > 2 && <span className="text-slate-500"> +{c.items.length - 2}</span>}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {c.total.toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="p-3 text-right font-bold text-green-700 tabular-nums whitespace-nowrap hidden sm:table-cell">
                          {c.paidAmount.toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="p-3 text-right font-black text-red-600 tabular-nums whitespace-nowrap">
                          {c.remaining.toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-medium whitespace-nowrap hidden lg:table-cell">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => { setSelected(c); setPayAmount(c.remaining.toString()); setShowPayModal(true); }}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition whitespace-nowrap"
                          >
                            Encaisser
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={pag.page}
            totalPages={pag.totalPages}
            onPageChange={pag.setPage}
            perPage={pag.perPage}
            perPageOptions={pag.perPageOptions}
            onPerPageChange={pag.setPerPage}
            total={pag.total}
          />
        </>
      )}

      {/* Modal paiement */}
      {showPayModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-900 mb-1">Reglement credit</h3>
            <p className="text-sm font-medium text-slate-700 mb-4">
              {selected.customer ? `${selected.customer.firstName} ${selected.customer.lastName}` : 'Client comptoir'} - {selected.reference}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total</span>
                <span className="font-bold">{selected.total.toLocaleString('fr-FR')} Ar</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Deja paye</span>
                <span className="font-bold text-green-700">{selected.paidAmount.toLocaleString('fr-FR')} Ar</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Reste a payer</span>
                <span className="font-black text-red-600 text-lg">{selected.remaining.toLocaleString('fr-FR')} Ar</span>
              </div>
            </div>

            <form onSubmit={payCredit} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Montant a encaisser</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-green-400 rounded-xl font-black text-3xl text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  required
                />
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onClick={() => setPayAmount(selected.remaining.toString())}
                    className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100">
                    Tout
                  </button>
                  <button type="button" onClick={() => setPayAmount((selected.remaining / 2).toString())}
                    className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100">
                    Moitie
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'CASH', l: 'Especes' }, { id: 'CARD', l: 'Carte' }, { id: 'MOBILE', l: 'Mobile' }].map(m => (
                    <button key={m.id} type="button" onClick={() => setPayMethod(m.id)}
                      className={'py-2.5 rounded-lg text-sm font-bold border-2 transition ' + (
                        payMethod === m.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                      )}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">
                  Annuler
                </button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold transition">
                  Valider le reglement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
