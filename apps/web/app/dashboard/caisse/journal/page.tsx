'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';

const TYPE_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  SALE:         { label: 'Vente',         color: 'bg-green-100 text-green-800',  sign: '+' },
  IN:           { label: 'Entree',        color: 'bg-green-100 text-green-800',  sign: '+' },
  DEPOSIT:      { label: 'Depot',         color: 'bg-teal-100 text-teal-800',    sign: '+' },
  TRANSFER_IN:  { label: 'Transfert IN',  color: 'bg-blue-100 text-blue-800',    sign: '+' },
  EXPENSE:      { label: 'Depense',       color: 'bg-red-100 text-red-800',      sign: '-' },
  OUT:          { label: 'Sortie',        color: 'bg-red-100 text-red-800',      sign: '-' },
  WITHDRAWAL:   { label: 'Retrait',       color: 'bg-orange-100 text-orange-800',sign: '-' },
  TRANSFER_OUT: { label: 'Transfert OUT', color: 'bg-amber-100 text-amber-800',  sign: '-' },
  ADJUSTMENT:   { label: 'Ajustement',    color: 'bg-purple-100 text-purple-800',sign: '+-' },
};


const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20];

function DenomGrid({ value, onChange, accent }: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  accent: 'green' | 'red';
}) {
  const setDenom = (d: number, count: number) => {
    const c = Math.max(0, count);
    const next: Record<string, number> = {};
    Object.entries(value).forEach(([k, v]) => { if (v > 0) next[k] = v; });
    if (c === 0) delete next[String(d)];
    else next[String(d)] = c;
    onChange(next);
  };
  const total = DENOMS.reduce((sum, d) => sum + d * (value[String(d)] || 0), 0);
  const cls = accent === 'green'
    ? { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-700' }
    : { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700' };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 custom-scrollbar">
        {DENOMS.map(d => {
          const cnt = value[String(d)] || 0;
          return (
            <div key={d} className={`flex items-center gap-2 bg-white rounded-lg border-2 p-2 transition ${cnt > 0 ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200'}`}>
              <span className="text-xs font-black text-slate-700 w-14 shrink-0">
                {d.toLocaleString('fr-FR')}
              </span>
              <span className="text-slate-400 text-xs shrink-0">x</span>
              <input
                type="number"
                min="0"
                value={cnt || ''}
                onChange={e => setDenom(d, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 min-w-0 px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 text-center focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              />
              <span className="text-[10px] font-black text-slate-500 w-16 text-right shrink-0">
                {(d * cnt).toLocaleString('fr-FR')}
              </span>
            </div>
          );
        })}
      </div>
      <div className={`mt-3 p-3 rounded-xl border-2 ${cls.border} ${cls.bg} flex items-center justify-between`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${cls.text}`}>
          Total billetterie
        </span>
        <span className={`text-2xl font-black ${cls.text}`}>
          {total.toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
        </span>
      </div>
    </div>
  );
}

export default function JournalCaissePage() {
  const [tab, setTab] = useState<'dashboard' | 'movements' | 'sessions'>('dashboard');
  const [registers, setRegisters] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [mvtPreset, setMvtPreset] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [mvtType, setMvtType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingRegister, setEditingRegister] = useState<any>(null);
  const [rName, setRName] = useState('');
  const [rType, setRType] = useState('CAISSE');
  const [rLocation, setRLocation] = useState('');
  const [rInitial, setRInitial] = useState('0');

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [mRegisterId, setMRegisterId] = useState('');
  const [mType, setMType] = useState('IN');
  const [mAmount, setMAmount] = useState('');
  const [mReason, setMReason] = useState('');
  const [mRef, setMRef] = useState('');

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [openAmount, setOpenAmount] = useState('0');
  const [closeAmount, setCloseAmount] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [openBreakdown, setOpenBreakdown] = useState<Record<string, number>>({});
  const [closeBreakdown, setCloseBreakdown] = useState<Record<string, number>>({});
  const [closeResult, setCloseResult] = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [regs, movs, sess, st] = await Promise.all([
      fetch('/api/cash/registers', { headers }).then((r) => r.json()),
      fetch('/api/cash/movements', { headers }).then((r) => r.json()),
      fetch('/api/cash/sessions', { headers }).then((r) => r.json()),
      fetch('/api/cash/stats', { headers }).then((r) => r.json()),
    ]);
    setRegisters(Array.isArray(regs) ? regs : []);
    setMovements(Array.isArray(movs) ? movs : []);
    setSessions(Array.isArray(sess) ? sess : []);
    setStats(st);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const i = setInterval(() => load().catch(console.error), 30000);
    return () => clearInterval(i);
  }, []);

  function openRegisterModal(reg?: any) {
    if (reg) {
      setEditingRegister(reg);
      setRName(reg.name);
      setRType(reg.type);
      setRLocation(reg.location || '');
      setRInitial(reg.currentBalance.toString());
    } else {
      setEditingRegister(null);
      setRName(''); setRType('CAISSE'); setRLocation(''); setRInitial('0');
    }
    setShowRegisterModal(true);
  }

  async function saveRegister(e: React.FormEvent) {
    e.preventDefault();
    const method = editingRegister ? 'PATCH' : 'POST';
    const url = editingRegister ? `/api/cash/registers/${editingRegister.id}` : '/api/cash/registers';
    await fetch(url, {
      method, headers,
      body: JSON.stringify({ name: rName, type: rType, location: rLocation, initialBalance: rInitial }),
    });
    setShowRegisterModal(false);
    await load();
  }

  async function deleteRegister(id: string) {
    if (!confirm('Supprimer cette caisse ?')) return;
    await fetch(`/api/cash/registers/${id}`, { method: 'DELETE', headers });
    await load();
  }

  function openMovementModal(registerId?: string) {
    setMRegisterId(registerId || (registers[0]?.id || ''));
    setMType('IN'); setMAmount(''); setMReason(''); setMRef('');
    setShowMovementModal(true);
  }

  async function saveMovement(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/cash/movements', {
      method: 'POST', headers,
      body: JSON.stringify({ registerId: mRegisterId, type: mType, amount: mAmount, reason: mReason, reference: mRef }),
    });
    if (res.ok) {
      setShowMovementModal(false);
      await load();
    } else {
      const d = await res.json();
      alert(d.message || 'Erreur');
    }
  }

  async function deleteMovement(id: string) {
    if (!confirm('Supprimer ce mouvement ?')) return;
    await fetch(`/api/cash/movements/${id}`, { method: 'DELETE', headers });
    await load();
  }

  function openSessionModal(reg: any) {
    setCurrentRegister(reg);
    setOpenAmount('0'); setSessionNotes(''); setOpenBreakdown({});
    setShowOpenModal(true);
  }

  async function confirmOpen(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/cash/registers/${currentRegister.id}/open`, {
      method: 'POST', headers,
      body: JSON.stringify({
        openingAmount: Object.entries(openBreakdown).reduce((sum, [d, c]) => sum + parseInt(d) * c, 0) || parseFloat(openAmount) || 0,
        openingBreakdown: Object.keys(openBreakdown).length > 0 ? openBreakdown : null,
        notes: sessionNotes,
      }),
    });
    setShowOpenModal(false);
    await load();
  }

  function closeSessionModal(reg: any) {
    setCurrentRegister(reg);
    setCloseAmount(reg.currentBalance.toString()); setCloseBreakdown({});
    setSessionNotes('');
    setCloseResult(null);
    setShowCloseModal(true);
  }

  async function confirmClose(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/cash/registers/${currentRegister.id}/close`, {
      method: 'POST', headers,
      body: JSON.stringify({
        closingAmount: Object.entries(closeBreakdown).reduce((sum, [d, c]) => sum + parseInt(d) * c, 0) || parseFloat(closeAmount) || 0,
        closingBreakdown: Object.keys(closeBreakdown).length > 0 ? closeBreakdown : null,
        notes: sessionNotes,
      }),
    });
    const data = await res.json();
    setCloseResult(data);
    await load();
  }

  const filteredMovements = useMemo(() => {
    let list = [...movements];

    if (selectedRegister) list = list.filter((m) => m.registerId === selectedRegister);

    // Preset date
    if (mvtPreset !== 'all') {
      const now = Date.now();
      const conf = mvtPreset === 'today' ? 86400000 : mvtPreset === 'week' ? 7 * 86400000 : 30 * 86400000;
      const from = now - conf;
      list = list.filter((m) => new Date(m.createdAt).getTime() >= from);
    }

    // Type
    if (mvtType === 'IN') list = list.filter((m) => ['SALE', 'IN', 'DEPOSIT', 'TRANSFER_IN'].includes(m.type));
    else if (mvtType === 'OUT') list = list.filter((m) => ['EXPENSE', 'OUT', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type));
    else if (mvtType !== 'ALL') list = list.filter((m) => m.type === mvtType);

    // Recherche
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        (m.reason || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.register?.name || '').toLowerCase().includes(q)
      );
    }

    // Tri : plus recent en premier
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [movements, selectedRegister, search, mvtPreset, mvtType]);

  const pagMvt = usePagination(filteredMovements, { perPageDefault: 20 });

  useEffect(() => { pagMvt.setPage(1); }, [search, selectedRegister, mvtPreset, mvtType]);

  // Totaux de la periode filtree
  const mvtTotals = useMemo(() => {
    let inAmt = 0, outAmt = 0;
    filteredMovements.forEach((m) => {
      const isOut = ['OUT', 'EXPENSE', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type);
      if (isOut) outAmt += m.amount;
      else inAmt += m.amount;
    });
    return { inAmt, outAmt, net: inAmt - outAmt, count: filteredMovements.length };
  }, [filteredMovements]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-linear-to-r from-slate-900 via-blue-900 to-teal-900 rounded-2xl px-5 py-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h1 className="text-lg font-bold">Journal de caisse</h1>
            <p className="text-xs text-blue-200 mt-0.5">
              {stats?.totalRegisters || 0} caisse(s) - {stats?.openRegisters || 0} ouverte(s)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openMovementModal()} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
              + Mouvement
            </button>
            <button onClick={() => openRegisterModal()} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
              + Caisse
            </button>
            <a href="/dashboard/caisse" className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
              Retour caisse
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
            <p className="text-[9px] text-blue-200 uppercase font-bold">Solde total</p>
            <p className="text-lg font-black">{(stats?.totalBalance || 0).toLocaleString('fr-FR')} Ar</p>
          </div>
          <div className="bg-green-500/20 rounded-xl px-3 py-2 border border-green-400/40">
            <p className="text-[9px] text-green-200 uppercase font-bold">Entrees du jour</p>
            <p className="text-lg font-black text-green-100">{(stats?.todayIn || 0).toLocaleString('fr-FR')} Ar</p>
          </div>
          <div className="bg-red-500/20 rounded-xl px-3 py-2 border border-red-400/40">
            <p className="text-[9px] text-red-200 uppercase font-bold">Sorties du jour</p>
            <p className="text-lg font-black text-red-100">{(stats?.todayOut || 0).toLocaleString('fr-FR')} Ar</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
            <p className="text-[9px] text-blue-200 uppercase font-bold">Net du jour</p>
            <p className="text-lg font-black">{(stats?.todayNet || 0).toLocaleString('fr-FR')} Ar</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1">
        {[
          { v: 'dashboard' as const, l: 'Caisses' },
          { v: 'movements' as const, l: 'Mouvements' },
          { v: 'sessions' as const, l: 'Sessions' },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              tab === t.v ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {registers.map((reg) => {
            const isOpen = reg.status === 'OPEN';
            return (
              <div key={reg.id} className="bg-white rounded-2xl border-2 border-slate-200 p-5 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-md ${
                      isOpen ? 'bg-linear-to-br from-green-500 to-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {reg.type === 'COFFRE' ? 'C' : reg.type === 'BANQUE' ? 'B' : 'K'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{reg.name}</h3>
                      <p className="text-[10px] text-slate-500 font-medium">{reg.type} {reg.location ? `- ${reg.location}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-black ${
                    isOpen ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isOpen ? 'OUVERTE' : 'FERMEE'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Solde actuel</p>
                  <p className="text-2xl font-black text-slate-900">{reg.currentBalance.toLocaleString('fr-FR')} Ar</p>
                  <p className="text-[10px] text-slate-500 mt-1">{reg._count?.movements || 0} mouvement(s)</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!isOpen ? (
                    <button onClick={() => openSessionModal(reg)} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-xs transition">
                      Ouvrir
                    </button>
                  ) : (
                    <button onClick={() => closeSessionModal(reg)} className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold text-xs transition">
                      Fermer
                    </button>
                  )}
                  {isOpen ? (
                    <button onClick={() => openMovementModal(reg.id)} className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs transition">
                      + Mouvement
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Caisse fermee : ouvrez-la pour saisir un mouvement"
                      className="bg-slate-100 text-slate-400 py-2 rounded-lg font-bold text-xs cursor-not-allowed"
                    >
                      + Mouvement
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  {isOpen ? (
                    <>
                      <button onClick={() => openRegisterModal(reg)} className="flex-1 text-xs font-bold text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition">Modifier</button>
                      <button onClick={() => deleteRegister(reg.id)} className="flex-1 text-xs font-bold text-red-600 hover:bg-red-50 py-1.5 rounded-lg transition">Supprimer</button>
                    </>
                  ) : (
                    <div className="flex-1 text-center text-[10px] font-bold text-slate-500 bg-slate-50 py-2 rounded-lg" title="Caisse fermee : modifications verrouillees">
                      🔒 Caisse fermee — Modifier / Supprimer verrouilles
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {registers.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">C</div>
              <p className="text-slate-500 font-bold">Aucune caisse</p>
              <button onClick={() => openRegisterModal()} className="text-teal-600 text-sm hover:underline mt-2 font-bold">
                + Creer une caisse
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'movements' && (
        <>
        <div className="space-y-3">
          <div className="space-y-3">
            {/* Row 1 : recherche + caisse */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-50">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher motif, reference, caisse..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-400"
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
              <select
                value={selectedRegister}
                onChange={(e) => setSelectedRegister(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold cursor-pointer"
              >
                <option value="">Toutes les caisses</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Row 2 : presets + type */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
              {([
                { v: 'today', l: "Aujourd'hui" },
                { v: 'week', l: '7 jours' },
                { v: 'month', l: '30 jours' },
                { v: 'all', l: 'Tout' },
              ] as const).map((p) => (
                <button
                  key={p.v}
                  onClick={() => setMvtPreset(p.v)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                    mvtPreset === p.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {p.l}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1"></span>
              {([
                { v: 'ALL', l: 'Tous' },
                { v: 'IN', l: 'Entrees' },
                { v: 'OUT', l: 'Sorties' },
                { v: 'SALE', l: 'Ventes' },
                { v: 'ADJUSTMENT', l: 'Ajustements' },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setMvtType(t.v)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                    mvtType === t.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* Row 3 : bandeau totaux periode */}
            {mvtTotals.count > 0 && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 text-white flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Mouvements</span>
                  <span className="text-sm font-black tabular-nums">{mvtTotals.count}</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Entrees</span>
                  <span className="text-sm font-black text-emerald-400 tabular-nums">+{mvtTotals.inAmt.toLocaleString('fr-FR')} Ar</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Sorties</span>
                  <span className="text-sm font-black text-red-400 tabular-nums">-{mvtTotals.outAmt.toLocaleString('fr-FR')} Ar</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div className="ml-auto">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Net</span>
                  <span className={'text-lg font-black tabular-nums ' + (mvtTotals.net >= 0 ? 'text-teal-400' : 'text-red-400')}>
                    {mvtTotals.net >= 0 ? '+' : ''}{mvtTotals.net.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b-2 border-slate-200">
                <tr>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase">Date</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase">Caisse</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase">Type</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase">Motif</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase">Par</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase text-right">Montant</th>
                  <th className="p-3 text-xs font-black text-slate-700 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagMvt.pageItems.map((m) => {
                  const meta = TYPE_LABELS[m.type] || TYPE_LABELS.IN;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                        <div className="text-slate-500 font-normal">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-3 text-sm font-bold text-slate-900">{m.register?.name}</td>
                      <td className="p-3">
                        <span className={`inline-block text-[10px] px-2 py-1 rounded-full font-black ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-800 truncate max-w-xs">{m.reason || '-'}</td>
                      <td className="p-3 text-xs text-slate-600">{m.user?.name || m.user?.email || '-'}</td>
                      <td className={`p-3 text-right font-black whitespace-nowrap ${
                        meta.sign === '+' ? 'text-green-700' : meta.sign === '-' ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        {meta.sign} {m.amount.toLocaleString('fr-FR')} Ar
                      </td>
                      <td className="p-3 text-center">
                        {m.register?.status === 'OPEN' ? (
                          <button onClick={() => deleteMovement(m.id)} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition">
                            Suppr
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg cursor-not-allowed"
                            title="Caisse fermee : mouvement verrouille"
                          >
                            🔒 Verrouille
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pagMvt.pageItems.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                    {search || mvtType !== 'ALL' || mvtPreset !== 'all'
                      ? 'Aucun mouvement ne correspond aux filtres'
                      : 'Aucun mouvement'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={pagMvt.page}
          totalPages={pagMvt.totalPages}
          onPageChange={pagMvt.setPage}
          perPage={pagMvt.perPage}
          perPageOptions={pagMvt.perPageOptions}
          onPerPageChange={pagMvt.setPerPage}
          total={pagMvt.total}
        />
        </>
      )}

      {tab === 'sessions' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="p-3 text-xs font-black text-slate-700 uppercase">Caisse</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase">Ouverture</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase text-right">Fond initial</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase">Fermeture</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase text-right">Compte</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase text-right">Theorique</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase text-right">Ecart</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm font-bold text-slate-900">{s.register?.name}</td>
                  <td className="p-3 text-xs text-slate-700">
                    {new Date(s.openedAt).toLocaleDateString('fr-FR')}
                    <div className="text-slate-500">{new Date(s.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">{s.openingAmount.toLocaleString('fr-FR')} Ar</td>
                  <td className="p-3 text-xs text-slate-700">
                    {s.closedAt ? (
                      <>
                        {new Date(s.closedAt).toLocaleDateString('fr-FR')}
                        <div className="text-slate-500">{new Date(s.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </>
                    ) : (
                      <span className="text-green-700 font-black">EN COURS</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {s.closingAmount !== null ? `${s.closingAmount.toLocaleString('fr-FR')} Ar` : '-'}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-700">
                    {s.theoreticalAmount !== null ? `${s.theoreticalAmount.toLocaleString('fr-FR')} Ar` : '-'}
                  </td>
                  <td className="p-3 text-right font-black whitespace-nowrap">
                    {s.difference !== null ? (
                      <span className={s.difference === 0 ? 'text-green-700' : s.difference > 0 ? 'text-blue-700' : 'text-red-600'}>
                        {s.difference > 0 ? '+' : ''}{s.difference.toLocaleString('fr-FR')} Ar
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3 text-xs text-slate-600">{s.user?.name || s.user?.email || '-'}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-bold">Aucune session</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowRegisterModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {editingRegister ? 'Modifier la caisse' : 'Nouvelle caisse'}
            </h3>
            <form onSubmit={saveRegister} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Nom</label>
                <input
                  type="text"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Type</label>
                  <select value={rType} onChange={(e) => setRType(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900">
                    <option value="CAISSE">Caisse</option>
                    <option value="COFFRE">Coffre</option>
                    <option value="BANQUE">Banque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Emplacement</label>
                  <input type="text" value={rLocation} onChange={(e) => setRLocation(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900" />
                </div>
              </div>
              {!editingRegister && (
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Solde initial (Ar)</label>
                  <input type="number" value={rInitial} onChange={(e) => setRInitial(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-2xl text-slate-900" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-3 rounded-xl font-bold transition">
                  {editingRegister ? 'Enregistrer' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowMovementModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-900 mb-4">Nouveau mouvement</h3>
            <form onSubmit={saveMovement} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Caisse</label>
                <select value={mRegisterId} onChange={(e) => setMRegisterId(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900" required>
                  <option value="">- Choisir -</option>
                  {registers.filter((r) => r.status === 'OPEN').map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.currentBalance.toLocaleString('fr-FR')} Ar)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Type</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900">
                    <option value="IN">Entree</option>
                    <option value="OUT">Sortie</option>
                    <option value="SALE">Vente</option>
                    <option value="DEPOSIT">Depot</option>
                    <option value="EXPENSE">Depense</option>
                    <option value="WITHDRAWAL">Retrait</option>
                    <option value="TRANSFER_IN">Transfert entrant</option>
                    <option value="TRANSFER_OUT">Transfert sortant</option>
                    <option value="ADJUSTMENT">Ajustement</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Montant (Ar)</label>
                  <input type="number" value={mAmount} onChange={(e) => setMAmount(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-xl text-slate-900" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Motif</label>
                <input type="text" value={mReason} onChange={(e) => setMReason(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Reference</label>
                <input type="text" value={mRef} onChange={(e) => setMRef(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowMovementModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-3 rounded-xl font-bold transition">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOpenModal && currentRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowOpenModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-900 mb-1">Ouvrir la caisse</h3>
            <p className="text-sm font-medium text-slate-700 mb-4">{currentRegister.name}</p>
            <form onSubmit={confirmOpen} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Fond de caisse initial (Ar)</label>
                <DenomGrid value={openBreakdown} onChange={setOpenBreakdown} accent="green" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowOpenModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition">Ouvrir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => { setShowCloseModal(false); setCloseResult(null); }}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {!closeResult ? (
              <>
                <h3 className="text-xl font-black text-slate-900 mb-1">Fermer la caisse</h3>
                <p className="text-sm font-medium text-slate-700 mb-4">{currentRegister.name}</p>
                <div className="bg-slate-900 rounded-xl p-4 mb-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Solde theorique</p>
                      <p className="text-xs text-slate-500">Calcule a partir des mouvements</p>
                    </div>
                    <span className="text-2xl font-black text-teal-400 tabular-nums">
                      {(currentRegister.currentBalance || 0).toLocaleString('fr-FR')}
                      <span className="text-sm text-slate-400 ml-1">Ar</span>
                    </span>
                  </div>
                </div>
                <form onSubmit={confirmClose} className="space-y-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Montant compte (Ar)</label>
                    <DenomGrid value={closeBreakdown} onChange={setCloseBreakdown} accent="red" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowCloseModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition">Fermer</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${closeResult.difference === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {closeResult.difference === 0 ? 'OK' : '!'}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Caisse fermee</h3>
                <p className="text-sm font-medium text-slate-700 mb-4">{currentRegister.name}</p>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Theorique</span>
                    <span className="font-bold">{closeResult.theoreticalAmount.toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Compte</span>
                    <span className="font-bold">{closeResult.closingAmount.toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-300">
                    <span className="font-black">Ecart</span>
                    <span className={`font-black text-lg ${closeResult.difference === 0 ? 'text-green-700' : closeResult.difference > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {closeResult.difference > 0 ? '+' : ''}{closeResult.difference.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                </div>
                <button onClick={() => { setShowCloseModal(false); setCloseResult(null); }} className="w-full bg-linear-to-r from-blue-600 to-teal-500 text-white py-3 rounded-xl font-bold transition">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
