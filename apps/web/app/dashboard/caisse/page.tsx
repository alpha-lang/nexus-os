'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import CashStatusBanner from '../../../components/CashStatusBanner';

const METHOD_META: Record<string, { label: string; icon: string; color: string }> = {
  CASH: { label: 'Espèces', icon: '💵', color: 'bg-emerald-100 text-emerald-700' },
  CARD: { label: 'Carte', icon: '💳', color: 'bg-blue-100 text-blue-700' },
  MOBILE: { label: 'Mobile', icon: '📱', color: 'bg-purple-100 text-purple-700' },
  ROOM_CHARGE: { label: 'Chambre', icon: '🏨', color: 'bg-amber-100 text-amber-700' },
  CREDIT: { label: 'Crédit', icon: '📋', color: 'bg-orange-100 text-orange-700' },
};

const TYPE_META: Record<string, { label: string; color: string; sign: string }> = {
  SALE: { label: 'Vente', color: 'text-emerald-600', sign: '+' },
  IN: { label: 'Entrée', color: 'text-emerald-600', sign: '+' },
  DEPOSIT: { label: 'Acompte', color: 'text-emerald-600', sign: '+' },
  TRANSFER_IN: { label: 'Transfert IN', color: 'text-emerald-600', sign: '+' },
  EXPENSE: { label: 'Dépense', color: 'text-red-600', sign: '-' },
  OUT: { label: 'Sortie', color: 'text-red-600', sign: '-' },
  WITHDRAWAL: { label: 'Retrait', color: 'text-red-600', sign: '-' },
  TRANSFER_OUT: { label: 'Transfert OUT', color: 'text-red-600', sign: '-' },
  ADJUSTMENT: { label: 'Ajustement', color: 'text-slate-600', sign: '±' },
};

export default function CaisseOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/cash/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const k = data?.kpis || {};
  const pos = data?.pos || {};
  const credits = data?.credits || {};
  const folios = data?.folios || {};
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-5">
      <CashStatusBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Encaissement</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Caisse · Vue d'ensemble</h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/dashboard/caisse/journal"
            className="px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            📖 Journal
          </a>
          <a
            href="/dashboard/caisse/pos"
            className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition"
          >
            🛒 Ouvrir le POS
          </a>
        </div>
      </div>

      {/* ALERTES */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any, i: number) => (
            <a
              key={i}
              href={a.href}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-50 border-l-4 border-red-500 hover:bg-red-100 transition group"
            >
              <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center font-black shrink-0">
                {a.count > 0 ? a.count : '!'}
              </div>
              <span className="flex-1 font-bold text-red-900 text-sm">{a.label}</span>
              <svg className="w-5 h-5 text-red-400 group-hover:text-red-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          ))}
        </div>
      )}

      {/* KPI CAISSE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Solde total</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{(k.totalBalance || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {k.totalRegisters || 0} caisse{k.totalRegisters > 1 ? 's' : ''} · {k.openRegisters || 0} ouverte{k.openRegisters > 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200">
          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Encaissé du jour</p>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">+{(k.todayIn || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{k.todayMovementsCount || 0} mouvement{k.todayMovementsCount > 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-200">
          <p className="text-[10px] text-red-700 uppercase font-black tracking-widest mb-1">Sorties du jour</p>
          <p className="text-2xl font-black text-red-600 tabular-nums">-{(k.todayOut || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">dépenses / retraits</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Net du jour</p>
          <p className={'text-2xl font-black tabular-nums ' + ((k.todayNet || 0) >= 0 ? 'text-slate-900' : 'text-red-600')}>
            {(k.todayNet || 0) >= 0 ? '+' : ''}{(k.todayNet || 0).toLocaleString('fr-FR')}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">entrées - sorties</p>
        </div>
      </div>

      {/* Grid 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sessions ouvertes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">💼 Sessions ouvertes</h3>
            <a href="/dashboard/caisse/journal" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              GÉRER →
            </a>
          </div>
          {(data?.activeSessions || []).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400 mb-2">Aucune session ouverte</p>
              <a href="/dashboard/caisse/journal" className="text-xs font-bold text-teal-600 hover:underline">
                Ouvrir une caisse →
              </a>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.activeSessions.map((s: any) => (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                      {s.register?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{s.register?.name}</p>
                      <p className="text-[10px] text-slate-500">
                        Ouverte par {s.user?.name || s.user?.email || '—'} à {new Date(s.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Solde actuel</p>
                      <p className="text-lg font-black text-emerald-600 tabular-nums">{s.currentBalance.toLocaleString('fr-FR')} Ar</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Fond</p>
                      <p className="text-xs font-black text-slate-900 tabular-nums">{s.openingAmount.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-emerald-600 uppercase font-black tracking-wider">Entrées</p>
                      <p className="text-xs font-black text-emerald-700 tabular-nums">+{s.inAmount.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-red-600 uppercase font-black tracking-wider">Sorties</p>
                      <p className="text-xs font-black text-red-700 tabular-nums">-{s.outAmount.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Mvts</p>
                      <p className="text-xs font-black text-slate-900 tabular-nums">{s.movementsCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventes POS du jour */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">🛒 Ventes POS</h3>
            <span className="text-[10px] font-black text-slate-400 tracking-wider">AUJOURD'HUI</span>
          </div>
          <div className="p-5">
            <p className="text-3xl font-black text-slate-900 tabular-nums">
              {(pos.salesToday || 0).toLocaleString('fr-FR')}
              <span className="text-sm text-slate-400 ml-1">Ar</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {pos.ordersToday || 0} encaissement{pos.ordersToday > 1 ? 's' : ''}
            </p>

            {(pos.byMethod || []).length > 0 && (
              <div className="mt-4 space-y-2">
                {pos.byMethod.map((m: any) => {
                  const meta = METHOD_META[m.method] || { label: m.method, icon: '📌', color: 'bg-slate-100 text-slate-600' };
                  return (
                    <div key={m.method} className="flex items-center gap-2">
                      <span className={'w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ' + meta.color}>{meta.icon}</span>
                      <span className="flex-1 text-xs font-bold text-slate-700">{meta.label}</span>
                      <span className="text-xs font-black text-slate-900 tabular-nums">{m.amount.toLocaleString('fr-FR')} Ar</span>
                    </div>
                  );
                })}
              </div>
            )}

            <a
              href="/dashboard/caisse/pos"
              className="block mt-5 w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-black hover:shadow-lg transition"
            >
              Ouvrir le POS
            </a>
          </div>
        </div>

        {/* Crédits */}
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="font-black text-amber-900 text-sm">🎫 Crédits en cours</h3>
            <a href="/dashboard/caisse/credits" className="text-[10px] font-black text-amber-700 hover:underline tracking-wider">
              VOIR →
            </a>
          </div>
          <div className="p-5">
            <p className="text-2xl font-black text-amber-600 tabular-nums">
              {(credits.remaining || 0).toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{credits.count || 0} crédit{credits.count > 1 ? 's' : ''} en attente</p>
            {(credits.total > 0) && (
              <div className="mt-3">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.round((credits.paid / credits.total) * 100)}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {credits.paid.toLocaleString('fr-FR')} recouvrés sur {credits.total.toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Folios */}
        <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 bg-blue-50">
            <h3 className="font-black text-blue-900 text-sm">📄 Folios clients</h3>
            <a href="/dashboard/caisse/folios" className="text-[10px] font-black text-blue-700 hover:underline tracking-wider">
              VOIR →
            </a>
          </div>
          <div className="p-5">
            <p className="text-2xl font-black text-blue-600 tabular-nums">
              {(folios.totalDue || 0).toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {folios.withDebt || 0} folio{folios.withDebt > 1 ? 's' : ''} avec solde
            </p>
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">⚡ Activité récente</h3>
            <a href="/dashboard/caisse/journal" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              VOIR →
            </a>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {(data?.recentMovements || []).map((m: any) => {
              const meta = TYPE_META[m.type] || { label: m.type, color: 'text-slate-600', sign: '' };
              const isOut = ['OUT', 'EXPENSE', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type);
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={'w-2 h-2 rounded-full shrink-0 ' + (isOut ? 'bg-red-400' : 'bg-emerald-400')}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{meta.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {m.register?.name} · {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={'text-sm font-black tabular-nums ' + meta.color}>
                    {isOut ? '-' : '+'}{m.amount.toLocaleString('fr-FR')}
                  </span>
                </div>
              );
            })}
            {(data?.recentMovements || []).length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">Aucun mouvement aujourd'hui</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
