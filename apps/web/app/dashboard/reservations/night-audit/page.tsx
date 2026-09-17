'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import { PageHeader, Button } from '../../../../components/ui';

type Tab = 'summary' | 'unpaid' | 'payments';

function fmtMoney(n: number): string {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function NightAuditPage() {
  const [date, setDate] = useState(yesterdayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('summary');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/hotel/reports/night-audit?date=${date}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur de chargement');
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  function handlePrint() {
    window.print();
  }

  const summary = data?.summary || {};
  const revenue = data?.revenue || {};
  const unpaid = data?.unpaid || {};
  const paymentsByMethod = data?.paymentsByMethod || {};

  return (
    <div className="space-y-4">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: absolute; left: 0; top: 0; width: 100%; padding: 15mm; background: white; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Header + controls */}
      <div className="no-print">
        <PageHeader
          title="Rapport journalier"
          subtitle="Night Audit — Synthèse activité hôtel"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDate(yesterdayStr())}>
                Hier
              </Button>
              <Button variant="secondary" onClick={() => setDate(todayStr())}>
                Aujourd'hui
              </Button>
              <Button
                onClick={handlePrint}
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>}
              >
                Imprimer
              </Button>
            </div>
          }
        />
      </div>

      {/* Date picker */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center gap-3">
        <label className="text-sm font-bold text-slate-700">Date :</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
        />
        <span className="text-xs text-slate-500 ml-auto">
          {data && `Généré le ${new Date(data.generatedAt).toLocaleString('fr-FR')}`}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
        </div>
      )}

      {!loading && data && (
        <div id="print-report" className="space-y-4">
          {/* Titre imprimable */}
          <div className="hidden print:block">
            <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
              NEXUS OS — Rapport journalier
            </h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Date : {data.date}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">Taux occupation</p>
              <p className="text-3xl font-black tabular-nums leading-none">{summary.occupancyRate || 0}%</p>
              <p className="text-xs opacity-90 mt-2">
                {summary.roomsSold || 0} / {summary.totalRooms || 0} chambres vendues
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">CA total</p>
              <p className="text-3xl font-black tabular-nums leading-none">
                {fmtMoney(revenue.total)}
              </p>
              <p className="text-xs opacity-90 mt-2">Ar de chiffre d'affaires</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">ADR</p>
              <p className="text-3xl font-black tabular-nums leading-none">{fmtMoney(revenue.adr)}</p>
              <p className="text-xs opacity-90 mt-2">Ar prix moyen / chambre</p>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">RevPAR</p>
              <p className="text-3xl font-black tabular-nums leading-none">{fmtMoney(revenue.revpar)}</p>
              <p className="text-xs opacity-90 mt-2">Ar revenu / chambre dispo</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="no-print bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex gap-1">
            {[
              { v: 'summary' as const, l: 'Synthèse' },
              { v: 'unpaid' as const, l: `Impayés (${unpaid.departed?.length + unpaid.inHouse?.length || 0})` },
              { v: 'payments' as const, l: 'Paiements' },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  tab === t.v ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* Tab : Synthèse */}
          {tab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mouvements */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Mouvements du jour</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  <Row label="Arrivées" value={summary.arrivals} />
                  <Row label="Départs" value={summary.departures} />
                  <Row label="Clients en séjour" value={summary.inHouse} />
                  <Row label="No-shows" value={summary.noShows} accent="red" />
                  <Row label="Chambres hors service" value={summary.roomsOoo} accent="amber" />
                </div>
              </div>

              {/* Revenus détaillés */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Détail revenus</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  <Row label="Chambres" value={`${fmtMoney(revenue.rooms)} Ar`} />
                  <Row label="Restaurant" value={`${fmtMoney(revenue.restaurant)} Ar`} />
                  <Row label="Extras folio" value={`${fmtMoney(revenue.extras)} Ar`} />
                  <Row label="TOTAL" value={`${fmtMoney(revenue.total)} Ar`} accent="teal" bold />
                </div>
              </div>
            </div>
          )}

          {/* Tab : Impayés */}
          {tab === 'unpaid' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">
                  Total à recouvrer
                </p>
                <p className="text-3xl font-black tabular-nums">
                  {fmtMoney(unpaid.total)} <span className="text-lg">Ar</span>
                </p>
                <p className="text-xs opacity-90 mt-2">
                  {unpaid.departed?.length || 0} client(s) parti(s) · {unpaid.inHouse?.length || 0} en séjour
                </p>
              </div>

              {/* Partis impayés */}
              {unpaid.departed?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                      Clients partis avec solde
                    </h3>
                    <span className="text-xs font-bold text-red-600">
                      {fmtMoney(unpaid.totalDeparted)} Ar
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Client</th>
                        <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Chambre</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Total</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Payé</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unpaid.departed.map((u: any) => (
                        <tr key={u.id}>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{u.customer}</div>
                            <div className="text-[10px] text-slate-500">{u.phone || '—'}</div>
                          </td>
                          <td className="p-3 text-slate-700">{u.room}</td>
                          <td className="p-3 text-right tabular-nums">{fmtMoney(u.total)}</td>
                          <td className="p-3 text-right tabular-nums text-emerald-600">{fmtMoney(u.paid)}</td>
                          <td className="p-3 text-right font-black tabular-nums text-red-600">{fmtMoney(u.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* En séjour impayés */}
              {unpaid.inHouse?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                      Clients en séjour avec solde
                    </h3>
                    <span className="text-xs font-bold text-amber-600">
                      {fmtMoney(unpaid.totalInHouse)} Ar
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Client</th>
                        <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Ch.</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Chambre</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Extras</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Total</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Payé</th>
                        <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unpaid.inHouse.map((u: any) => (
                        <tr key={u.id}>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{u.customer}</div>
                            <div className="text-[10px] text-slate-500">{u.phone || '—'}</div>
                          </td>
                          <td className="p-3 text-slate-700">{u.room}</td>
                          <td className="p-3 text-right tabular-nums">{fmtMoney(u.roomTotal)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtMoney(u.extrasTotal)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtMoney(u.grandTotal)}</td>
                          <td className="p-3 text-right tabular-nums text-emerald-600">{fmtMoney(u.paid)}</td>
                          <td className="p-3 text-right font-black tabular-nums text-red-600">{fmtMoney(u.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(!unpaid.departed?.length && !unpaid.inHouse?.length) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-bold text-emerald-800">Aucun impayé</p>
                  <p className="text-sm text-emerald-600 mt-1">Tous les soldes sont réglés</p>
                </div>
              )}
            </div>
          )}

          {/* Tab : Paiements */}
          {tab === 'payments' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                  Encaissements par méthode
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(paymentsByMethod).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Aucun paiement enregistré ce jour
                  </div>
                ) : (
                  Object.entries(paymentsByMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {method === 'CASH' ? '💵' :
                           method === 'CARD' ? '💳' :
                           method === 'MOBILE' ? '📱' :
                           method === 'ROOM_CHARGE' ? '🏨' :
                           '📌'}
                        </span>
                        <span className="font-bold text-slate-900">{method}</span>
                      </div>
                      <span className="font-black text-slate-900 tabular-nums">
                        {fmtMoney(Number(amount))} Ar
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Signature */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-300">
            <div className="grid grid-cols-2 gap-16">
              <div>
                <p style={{ fontSize: '11px', color: '#666', marginBottom: '40px' }}>
                  Signature du veilleur de nuit
                </p>
                <div style={{ borderTop: '1px solid #999', marginTop: '10px' }}></div>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#666', marginBottom: '40px' }}>
                  Signature du directeur
                </p>
                <div style={{ borderTop: '1px solid #999', marginTop: '10px' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: any; accent?: string; bold?: boolean }) {
  const colorClass =
    accent === 'red' ? 'text-red-600' :
    accent === 'amber' ? 'text-amber-600' :
    accent === 'teal' ? 'text-teal-600' :
    'text-slate-900';

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-black text-base' : 'font-bold'} ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
