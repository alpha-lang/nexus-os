'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import { usePagination } from '../../../lib/usePagination';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';
import { Pagination } from '../../../lib/Pagination';

type TypeFilter = 'ALL' | 'CUSTOMER' | 'SUPPLIER';

const TYPE_META: Record<string, { label: string; color: string; bg: string; text: string; icon: string }> = {
  CUSTOMER: { label: 'Client', color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '👤' },
  SUPPLIER: { label: 'Fournisseur', color: '#0891b2', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🚚' },
  BOTH:     { label: 'Les deux', color: '#7c3aed', bg: 'bg-purple-100', text: 'text-purple-700', icon: '🤝' },
};

function getTypeMeta(t: string) {
  return TYPE_META[t] || TYPE_META.CUSTOMER;
}

export default function CrmPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'score'>('name');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [nType, setNType] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH'>('CUSTOMER');
  const [nName, setNName] = useState('');
  const [nFirstName, setNFirstName] = useState('');
  const [nLastName, setNLastName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nAddress, setNAddress] = useState('');
  const [nCity, setNCity] = useState('');
  const [nContactName, setNContactName] = useState('');
  const [nLeadTimeDays, setNLeadTimeDays] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/partners', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPartners(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setNType('CUSTOMER');
    setNName(''); setNFirstName(''); setNLastName('');
    setNEmail(''); setNPhone(''); setNAddress(''); setNCity('');
    setNContactName(''); setNLeadTimeDays('');
    setError(null);
  }

  function openCreate() { resetForm(); setShowCreate(true); }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const res = await apiFetch('/api/partners', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: nType,
        name: nName,
        firstName: nFirstName,
        lastName: nLastName,
        email: nEmail,
        phone: nPhone,
        address: nAddress,
        city: nCity,
        contactName: nContactName,
        leadTimeDays: nLeadTimeDays,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      showToast('Partenaire cree : ' + created.name);
      setShowCreate(false);
      resetForm();
      await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  const cities = useMemo(() => {
    const set = new Set<string>();
    partners.forEach(p => { if (p.city) set.add(p.city); });
    return Array.from(set).sort();
  }, [partners]);

  const counts = useMemo(() => ({
    ALL: partners.length,
    CUSTOMER: partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').length,
    SUPPLIER: partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH').length,
  }), [partners]);

  const filtered = useMemo(() => {
    let list = [...partners];

    if (typeFilter === 'CUSTOMER') list = list.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH');
    else if (typeFilter === 'SUPPLIER') list = list.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH');

    if (cityFilter) list = list.filter(p => p.city === cityFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.firstName?.toLowerCase().includes(q) ||
        p.lastName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.contactName?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

    return list;
  }, [partners, typeFilter, cityFilter, search, sortBy]);

  const pag = usePagination(filtered, { perPageDefault: 24 });
  useEffect(() => { pag.setPage(1); }, [search, typeFilter, cityFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Relation client</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM</h1>
          <p className="text-slate-500 mt-1">
            {counts.CUSTOMER} client{counts.CUSTOMER > 1 ? 's' : ''} · {counts.SUPPLIER} fournisseur{counts.SUPPLIER > 1 ? 's' : ''} · {counts.ALL} partenaire{counts.ALL > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={openCreate}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nouveau partenaire
        </Button>
      </div>

      {/* Barre recherche + filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom, email, telephone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setTypeFilter('ALL')} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === 'ALL' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            Tous <span className="opacity-60 ml-1">{counts.ALL}</span>
          </button>
          <button onClick={() => setTypeFilter('CUSTOMER')} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === 'CUSTOMER' ? 'bg-emerald-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}>
            👤 Clients <span className="opacity-60 ml-1">{counts.CUSTOMER}</span>
          </button>
          <button onClick={() => setTypeFilter('SUPPLIER')} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === 'SUPPLIER' ? 'bg-cyan-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}>
            🚚 Fournisseurs <span className="opacity-60 ml-1">{counts.SUPPLIER}</span>
          </button>

          {cities.length > 0 && (
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
              <option value="">Toutes les villes</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
            <option value="name">Nom A-Z</option>
            <option value="recent">Plus recent</option>
            <option value="score">Meilleur score</option>
          </select>
        </div>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">👥</div>
          <p className="text-slate-600 font-semibold">Aucun partenaire</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez les filtres ou creez un partenaire</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {pag.pageItems.map(p => {
              const tm = getTypeMeta(p.type);
              const initials = (p.firstName?.charAt(0) || '') + (p.lastName?.charAt(0) || '') || p.name?.charAt(0).toUpperCase() || '?';
              return (
                <a
                  key={p.id}
                  href={'/dashboard/crm/' + p.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition"
                >
                  <div className={'h-16 ' + tm.bg + ' relative overflow-hidden'}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/30"></div>
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md bg-white/80 backdrop-blur-sm" style={{ color: tm.color }}>
                        {tm.icon} {tm.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="relative px-4 pb-4">
                    <div className="absolute -top-7 left-4">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-900 font-black text-lg border-4 border-white">
                        {initials}
                      </div>
                    </div>
                    <div className="pt-9">
                      <h3 className="font-black text-slate-900 text-sm truncate">{p.name}</h3>
                      {p.contactName && <p className="text-[10px] text-slate-500 truncate">Contact : {p.contactName}</p>}
                      <div className="space-y-1 mt-2 text-xs text-slate-500">
                        {p.phone && <div className="truncate">📞 {p.phone}</div>}
                        {p.email && <div className="truncate">✉️ {p.email}</div>}
                        {p.city && <div className="truncate">📍 {p.city}</div>}
                        {p.leadTimeDays != null && <div className="truncate text-cyan-600 font-bold">⏱ Delai {p.leadTimeDays}j</div>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {(p.tags || '').split(',').filter(Boolean).slice(0, 2).map((t: string) => (
                            <span key={t} className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1">{t}</span>
                          ))}
                        </span>
                        <span className="text-teal-600 font-black group-hover:underline">Voir →</span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
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
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title="Nouveau partenaire"
        subtitle="Creez un client, fournisseur ou les deux"
        icon={<span className="text-2xl font-bold">+</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="create-partner-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Creation...' : 'Creer le partenaire'}
            </button>
          </div>
        }
      >
        <form id="create-partner-form" onSubmit={submitCreate} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Type de partenaire" required>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'CUSTOMER' as const, l: 'Client', i: '👤' },
                { v: 'SUPPLIER' as const, l: 'Fournisseur', i: '🚚' },
                { v: 'BOTH' as const, l: 'Les deux', i: '🤝' },
              ].map(t => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setNType(t.v)}
                  className={'py-2.5 rounded-xl text-sm font-bold border-2 transition ' + (
                    nType === t.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  )}
                >
                  {t.i} {t.l}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={nType === 'CUSTOMER' ? 'Nom complet' : 'Raison sociale'} required>
            <Input type="text" value={nName} onChange={e => setNName(e.target.value)} placeholder={nType === 'CUSTOMER' ? 'Jean Dupont' : 'Metro Tana'} required />
          </FormField>

          {nType === 'CUSTOMER' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prenom">
                <Input type="text" value={nFirstName} onChange={e => setNFirstName(e.target.value)} placeholder="Jean" />
              </FormField>
              <FormField label="Nom">
                <Input type="text" value={nLastName} onChange={e => setNLastName(e.target.value)} placeholder="Dupont" />
              </FormField>
            </div>
          )}

          {nType !== 'CUSTOMER' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact principal">
                <Input type="text" value={nContactName} onChange={e => setNContactName(e.target.value)} placeholder="Jean Paul" />
              </FormField>
              <FormField label="Delai livraison (jours)">
                <Input type="number" value={nLeadTimeDays} onChange={e => setNLeadTimeDays(e.target.value)} placeholder="2" min="0" />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input type="email" value={nEmail} onChange={e => setNEmail(e.target.value)} placeholder="contact@email.mg" />
            </FormField>
            <FormField label="Telephone">
              <Input type="text" value={nPhone} onChange={e => setNPhone(e.target.value)} placeholder="+261 34 12 345 67" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ville">
              <Input type="text" value={nCity} onChange={e => setNCity(e.target.value)} placeholder="Antananarivo" />
            </FormField>
            <FormField label="Adresse">
              <Input type="text" value={nAddress} onChange={e => setNAddress(e.target.value)} placeholder="Lot II M 12 Bis" />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
