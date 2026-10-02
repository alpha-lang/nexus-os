'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import TagEditor from './TagEditor';

const ORG_TYPES: Record<string, { label: string; short: string; grad: string; color: string }> = {
  HOTEL:        { label: 'Hôtel',        short: 'HTL', grad: 'from-purple-500 to-pink-500',    color: '#8b5cf6' },
  COMMERCE:     { label: 'Commerce',     short: 'COM', grad: 'from-blue-500 to-cyan-500',      color: '#06b6d4' },
  RESTAURANT:   { label: 'Restaurant',   short: 'RST', grad: 'from-orange-500 to-red-600',     color: '#f97316' },
  ECOLE:        { label: 'École',        short: 'ECL', grad: 'from-sky-500 to-indigo-500',     color: '#0ea5e9' },
  CLINIQUE:     { label: 'Clinique',     short: 'CLN', grad: 'from-teal-500 to-emerald-600',   color: '#14b8a6' },
  ONG:          { label: 'ONG',          short: 'ONG', grad: 'from-green-500 to-emerald-500',  color: '#10b981' },
  MICROFINANCE: { label: 'Microfinance', short: 'MFC', grad: 'from-amber-500 to-orange-500',   color: '#f59e0b' },
  BANQUE:       { label: 'Banque',       short: 'BNQ', grad: 'from-slate-600 to-slate-800',    color: '#64748b' },
  INTERNE:      { label: 'Interne',      short: 'NEX', grad: 'from-rose-500 to-red-600',       color: '#f43f5e' },
};

function typeMeta(t: string | null) {
  return ORG_TYPES[t || ''] || { label: t || 'N/A', short: '?', grad: 'from-slate-500 to-slate-700', color: '#64748b' };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtMoney(n: number) {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

const TABS = [
  { id: 'info',       label: 'Informations', icon: '📋' },
  { id: 'abo',        label: 'Abonnement',   icon: '💳' },
  { id: 'users',      label: 'Utilisateurs', icon: '👥' },
  { id: 'activity',   label: 'Activité',     icon: '📊' },
];

export default function OrganizationDrawer({ org, onClose, onEdit, onSuspend, onReactivate, onImpersonate, onDelete }: any) {
  const [tab, setTab] = useState('info');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const [tagsSaved, setTagsSaved] = useState(false);

  useEffect(() => {
    if (!org) return;
    setEditTags(org.adminTags || []);
    setEditNotes(org.adminNotes || '');
    setTagsSaved(false);
  }, [org]);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    apiFetch(`/api/organizations/${org.id}`)
      .then((r) => r.json())
      .then(setDetails)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [org]);

  async function saveTags() {
    if (!org) return;
    setSavingTags(true);
    try {
      const res = await apiFetch(`/api/organizations/${org.id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: editTags, notes: editNotes }),
      });
      if (res.ok) {
        setTagsSaved(true);
        setTimeout(() => setTagsSaved(false), 2000);
      }
    } finally {
      setSavingTags(false);
    }
  }

  if (!org) return null;

  // Note : on initialise les tags via useEffect (voir plus haut)

  const tm = typeMeta(org.type);
  const abo = (org.subscriptions || []).find((s: any) => s.status === 'ACTIVE') 
    || (org.subscriptions || []).find((s: any) => s.status === 'TRIAL')
    || (org.subscriptions || [])[0];

  const modules = (abo?.activeModules || []).filter((m: any) => m.isActive);
  const mrr = abo?.status === 'ACTIVE' ? modules.reduce((s: number, m: any) => s + (m.module?.price || 0), 0) : 0;

  const isActive = (org.status || 'ACTIVE') === 'ACTIVE';
  const isSuspended = org.status === 'SUSPENDED';
  const isInternal = org.type === 'INTERNE';

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">

        {/* ═══ HEADER ═══ */}
        <div className={`bg-gradient-to-r ${tm.grad} px-6 py-5 text-white relative overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5"></div>

          <div className="relative flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-lg shrink-0 border border-white/20">
                {org.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h2 className="text-xl font-black truncate">{org.name}</h2>
                  {isInternal && (
                    <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-white/25">
                      INTERNE
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/80 font-mono truncate">{org.slug}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl shrink-0 transition"
            >
              ×
            </button>
          </div>

          {/* Badges */}
          <div className="relative flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-1 rounded bg-white/25">
              {tm.short} · {tm.label.toUpperCase()}
            </span>
            {isActive && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-1 rounded bg-emerald-400 text-emerald-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                ACTIVE
              </span>
            )}
            {isSuspended && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-1 rounded bg-amber-400 text-amber-900">
                ⚠ SUSPENDUE
              </span>
            )}
            {org.city && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/15">
                📍 {org.city}
              </span>
            )}
            {(org.adminTags || []).slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] font-black tracking-wider px-2 py-1 rounded bg-white/25">
                {t.toUpperCase()}
              </span>
            ))}
            {(org.adminTags || []).length > 3 && (
              <span className="text-[10px] font-black tracking-wider px-2 py-1 rounded bg-white/15">
                +{(org.adminTags || []).length - 3}
              </span>
            )}
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'px-3 py-2.5 text-xs font-bold transition border-b-2 -mb-px whitespace-nowrap ' +
                (tab === t.id
                  ? 'border-teal-500 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900')
              }
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ CONTENU ═══ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* ═══ TAB INFO ═══ */}
              {tab === 'info' && (
                <>
                  {/* KPI grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <KpiBox label="Utilisateurs" value={org._count?.users || 0} accent="blue" />
                    <KpiBox label="Partenaires" value={org._count?.partners || 0} accent="purple" />
                    <KpiBox label="MRR" value={`${fmtMoney(mrr)} Ar`} accent="emerald" small />
                  </div>

                  {/* Infos */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Coordonnées
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <InfoRow label="Email" value={org.email || '—'} icon="✉️" />
                      <InfoRow label="Téléphone" value={org.phone || '—'} icon="📞" />
                      <InfoRow label="Ville" value={org.city || '—'} icon="📍" />
                      <InfoRow label="Créée le" value={fmtDate(org.createdAt)} icon="📅" />
                    </div>
                  </div>

                  {/* ═══ TAGS & NOTES ADMIN ═══ */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        TAGS ADMIN
                      </p>
                      <button
                        onClick={saveTags}
                        disabled={savingTags}
                        className={
                          'text-[10px] font-bold px-2 py-1 rounded transition ' +
                          (tagsSaved
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50')
                        }
                      >
                        {savingTags ? 'Enregistrement…' : tagsSaved ? '✓ Enregistré' : 'Enregistrer'}
                      </button>
                    </div>
                    <div className="p-4">
                      <TagEditor
                        tags={editTags}
                        onChange={setEditTags}
                      />
                    </div>
                  </div>

                  {/* ═══ NOTES ADMIN ═══ */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        NOTES INTERNES
                      </p>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        placeholder="Notes visibles uniquement par les Super Admins…"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 resize-none"
                      />
                    </div>
                  </div>

                  {org.description && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Description
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {org.description}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ═══ TAB ABO ═══ */}
              {tab === 'abo' && (
                <>
                  {!abo ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                      <p className="text-3xl mb-2">💳</p>
                      <p className="font-bold text-amber-900">Aucun abonnement</p>
                      <p className="text-xs text-amber-700 mt-1">Cette organisation n'a pas encore de contrat actif</p>
                    </div>
                  ) : (
                    <>
                      <div className={`rounded-xl p-4 border-2 ${
                        abo.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-300' :
                        abo.status === 'TRIAL' ? 'bg-blue-50 border-blue-300' :
                        abo.status === 'SUSPENDED' ? 'bg-amber-50 border-amber-300' :
                        'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 mb-0.5">
                              Statut de l'abonnement
                            </p>
                            <p className="text-xl font-black text-slate-900">{abo.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 mb-0.5">
                              Facturation
                            </p>
                            <p className="text-sm font-bold text-slate-900">{abo.billingPeriod}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Modules actifs
                          </p>
                          <span className="text-xs font-bold text-slate-900">{modules.length} module{modules.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {modules.length === 0 ? (
                            <p className="p-4 text-center text-sm text-slate-400 italic">Aucun module actif</p>
                          ) : (
                            modules.map((am: any) => (
                              <div key={am.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="flex-1 text-sm font-bold text-slate-900">{am.module.name}</span>
                                <span className="text-sm font-black text-slate-900 tabular-nums">
                                  {fmtMoney(am.module.price)} Ar
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        {modules.length > 0 && (
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
                              Total mensuel
                            </span>
                            <span className="text-lg font-black text-emerald-600 tabular-nums">
                              {fmtMoney(mrr)} Ar
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ═══ TAB USERS ═══ */}
              {tab === 'users' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Utilisateurs ({details?.users?.length || org._count?.users || 0})
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(details?.users || []).length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-400 italic">
                        Aucun utilisateur
                      </p>
                    ) : (
                      (details?.users || []).map((u: any) => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {(u.name || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {u.name || u.email?.split('@')[0]}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {u.role}
                            </span>
                            {u.isOwner && (
                              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                OWNER
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ═══ TAB ACTIVITY ═══ */}
              {tab === 'activity' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Historique de création
                    </p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-sm text-slate-600">
                      Organisation créée le <strong>{fmtDate(org.createdAt)}</strong>
                    </p>
                    {org.suspendedAt && (
                      <p className="text-sm text-red-600 mt-3">
                        Suspendue le {fmtDate(org.suspendedAt)}
                        {org.suspendedReason && (
                          <span className="block text-xs text-red-500 mt-1 italic">
                            « {org.suspendedReason} »
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ FOOTER ACTIONS ═══ */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onEdit(org)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            ✏️ Modifier
          </button>

          {isActive && !isInternal && (
            <button
              onClick={() => onImpersonate(org)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition"
            >
              👁️ Impersonner
            </button>
          )}

          {isActive && !isInternal && (
            <button
              onClick={() => onSuspend(org)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition"
            >
              ⏸️ Suspendre
            </button>
          )}

          {isSuspended && (
            <button
              onClick={() => onReactivate(org)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition"
            >
              ✓ Réactiver
            </button>
          )}

          <div className="ml-auto">
            {!isInternal && (
              <button
                onClick={() => onDelete(org)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition"
              >
                🗑️ Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

function KpiBox({ label, value, accent, small }: any) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-black tabular-nums ${small ? 'text-base' : 'text-2xl'} ${colors[accent] || 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-900 truncate">{value}</span>
    </div>
  );
}
