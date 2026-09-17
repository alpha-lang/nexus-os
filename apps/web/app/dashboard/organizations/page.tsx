'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';

const ORG_TYPES = [
  { value: 'COMMERCE', label: 'Commerce', short: 'COM', grad: 'from-blue-500 to-cyan-500' },
  { value: 'HOTEL', label: 'Hotel', short: 'HTL', grad: 'from-purple-500 to-pink-500' },
  { value: 'ONG', label: 'ONG', short: 'ONG', grad: 'from-green-500 to-emerald-500' },
  { value: 'MICROFINANCE', label: 'Microfinance', short: 'MFC', grad: 'from-amber-500 to-orange-500' },
  { value: 'BANQUE', label: 'Banque', short: 'BNQ', grad: 'from-slate-600 to-slate-800' },
  { value: 'INTERNE', label: 'Interne', short: 'NEX', grad: 'from-rose-500 to-red-600' },
];

type FilterType = 'ALL' | 'COMMERCE' | 'HOTEL' | 'ONG' | 'MICROFINANCE' | 'BANQUE' | 'INTERNE';

function typeMeta(t: string | null) {
  return ORG_TYPES.find(x => x.value === t) || ORG_TYPES[0];
}

function statusMeta(s: string) {
  if (s === 'ACTIVE') return { label: 'Active', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
  if (s === 'SUSPENDED') return { label: 'Suspendue', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: 'Inactive', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [orgToDelete, setOrgToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('COMMERCE');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/organizations', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setOrganizations(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setEditing(null);
    setName(''); setSlug(''); setType('COMMERCE'); setCity('');
    setEmail(''); setPhone(''); setDescription('');
    setError(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(org: any) {
    setEditing(org);
    setName(org.name || ''); setSlug(org.slug || ''); setType(org.type || 'COMMERCE');
    setCity(org.city || ''); setEmail(org.email || ''); setPhone(org.phone || '');
    setDescription(org.description || '');
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/organizations/${editing.id}` : '/api/organizations';
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, type, city, email, phone, description }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Organisation mise a jour' : 'Organisation creee');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!orgToDelete) return;
    setIsDeleting(true);
    await apiFetch(`/api/organizations/${orgToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrgToDelete(null);
    setIsDeleting(false);
    showToast('Organisation supprimee');
    await load();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: organizations.length };
    ORG_TYPES.forEach(t => { c[t.value] = organizations.filter(o => o.type === t.value).length; });
    return c;
  }, [organizations]);

  const filtered = useMemo(() => {
    let list = [...organizations];
    if (filterType !== 'ALL') list = list.filter(o => o.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.name?.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [organizations, filterType, search]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header hero */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organisations</h1>
          <p className="text-slate-500 mt-1">
            {counts.ALL} tenant{counts.ALL > 1 ? 's' : ''} · {counts.INTERNE || 0} interne{(counts.INTERNE || 0) > 1 ? 's' : ''} · {counts.ALL - (counts.INTERNE || 0)} client{(counts.ALL - (counts.INTERNE || 0)) > 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={openCreate}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          >
            Nouvelle organisation
          </Button>
        )}
      </div>

      {/* Barre de recherche + tabs */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher un tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            Tous <span className="opacity-60 ml-1">{counts.ALL}</span>
          </button>
          {ORG_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value as FilterType)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                filterType === t.value
                  ? `bg-gradient-to-r ${t.grad} text-white shadow-md`
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              {t.label} <span className="opacity-60 ml-1">{counts[t.value] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grille de cartes */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <p className="text-lg font-bold text-slate-700 mb-1">
            {search || filterType !== 'ALL' ? 'Aucun resultat' : 'Aucune organisation'}
          </p>
          <p className="text-sm text-slate-400">
            {search || filterType !== 'ALL' ? 'Essayez de modifier vos filtres' : 'Creez votre premier tenant'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(org => {
            const tm = typeMeta(org.type);
            const sm = statusMeta(org.status || 'ACTIVE');
            const usersCount = org._count?.users ?? org.users?.length ?? 0;
            const custCount = org._count?.customers ?? 0;
            const subsCount = org.subscriptions?.length || 0;
            const isMenuOpen = openMenu === org.id;

            return (
              <div
                key={org.id}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Bandeau gradient */}
                <div className={`h-24 bg-gradient-to-br ${tm.grad} relative overflow-hidden`}>
                  {/* Cercles décoratifs */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"></div>
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10"></div>

                  {/* Badge type */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] font-black tracking-wider">
                      {tm.short}
                    </span>
                  </div>

                  {/* Menu kebab */}
                  {isOwner && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : org.id); }}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="1.5"/>
                          <circle cx="12" cy="12" r="1.5"/>
                          <circle cx="19" cy="12" r="1.5"/>
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-20"
                        >
                          <button
                            onClick={() => { setOpenMenu(null); openEdit(org); }}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => { setOpenMenu(null); setOrgToDelete(org); }}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition border-t border-slate-100"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Avatar XL */}
                  <div className="absolute -bottom-7 left-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl font-black text-slate-900 border-4 border-white">
                      {org.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div className="pt-9 px-5 pb-5">
                  <h3 className="font-black text-slate-900 text-base truncate leading-tight">
                    {org.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {org.slug}
                  </p>

                  {/* Localisation */}
                  {org.city && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {org.city}
                    </div>
                  )}

                  {/* Stats mini */}
                  <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-900">{usersCount}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Users</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                      <p className="text-lg font-black text-slate-900">{custCount}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Clients</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-900">{subsCount}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Abo.</p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="flex items-center justify-between mt-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${sm.bg} ${sm.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`}></span>
                      {sm.label}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 tracking-wider">
                      {tm.label.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier l organisation' : 'Nouvelle organisation'}
        subtitle={editing ? editing.name : 'Creez un nouveau tenant'}
        icon={<span className="text-2xl font-bold">+</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="org-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="org-form" onSubmit={save} className="space-y-6">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identite</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nom" required>
                <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nirina Hotel" required />
              </FormField>
              <FormField label="Slug" required hint="Identifiant unique">
                <Input type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="nirina-hotel" className="font-mono" required />
              </FormField>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type et localisation</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type">
                <Select value={type} onChange={e => setType(e.target.value)}>
                  {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Ville">
                <Input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Antananarivo" />
              </FormField>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@nirina.com" />
              </FormField>
              <FormField label="Telephone">
                <Input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+261 34 12 345 67" />
              </FormField>
            </div>
          </div>

          <FormField label="Description">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!orgToDelete}
        title="Supprimer l organisation"
        message={`Voulez-vous vraiment supprimer "${orgToDelete?.name}" ? Toutes les donnees seront perdues.`}
        onClose={() => setOrgToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
