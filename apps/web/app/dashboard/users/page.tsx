'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select } from '../../../components/ui';

const ROLES = [
  { value: 'USER', label: 'Utilisateur', color: '#64748b' },
  { value: 'COMMERCIAL', label: 'Commercial', color: '#3b82f6' },
  { value: 'MANAGER', label: 'Manager', color: '#6366f1' },
  { value: 'RECEPTION', label: 'Reception', color: '#14b8a6' },
  { value: 'FINANCE', label: 'Finance', color: '#10b981' },
  { value: 'RH', label: 'RH', color: '#ec4899' },
  { value: 'STOCK_MANAGER', label: 'Stock', color: '#f59e0b' },
  { value: 'IT_TECH', label: 'IT', color: '#06b6d4' },
  { value: 'AUDITOR', label: 'Auditeur', color: '#8b5cf6' },
  { value: 'ADMIN', label: 'Admin', color: '#f97316' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: '#ef4444' },
];

function roleMeta(r: string) {
  return ROLES.find(x => x.value === r) || { value: r, label: r, color: '#64748b' };
}
function initialOf(u: any): string {
  const s = (u.name || u.email || '?').trim();
  const c = s.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

const SEGMENTS = [
  { key: 'all', label: 'Tous' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'MANAGER', label: 'Managers' },
  { key: 'RECEPTION', label: 'Reception' },
  { key: 'COMMERCIAL', label: 'Commerciaux' },
  { key: 'others', label: 'Autres' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [onlyActive, setOnlyActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [organizationId, setOrganizationId] = useState('');

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [uRes, oRes] = await Promise.all([
      apiFetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch('/api/organizations', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [u, o] = await Promise.all([uRes.json(), oRes.json()]);
    setUsers(Array.isArray(u) ? u : []);
    setOrganizations(Array.isArray(o) ? o : []);
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
    setEmail(''); setPassword(''); setName('');
    setRole('USER'); setOrganizationId('');
    setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(u: any) {
    setEditing(u);
    setEmail(u.email || ''); setName(u.name || '');
    setRole(u.role || 'USER'); setOrganizationId(u.organizationId || '');
    setPassword('');
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/users/${editing.id}` : '/api/users';
    const body: any = { email, name, role, organizationId };
    if (password) body.password = password;
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Utilisateur mis a jour' : 'Utilisateur cree');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    setIsDeleting(true);
    await apiFetch(`/api/users/${userToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setUserToDelete(null);
    setIsDeleting(false);
    showToast('Utilisateur supprime');
    await load();
  }

  // Segments counts
  const segCounts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    SEGMENTS.forEach(s => {
      if (s.key === 'all') return;
      if (s.key === 'others') {
        c[s.key] = users.filter(u => !['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'COMMERCIAL'].includes(u.role)).length;
      } else if (s.key === 'ADMIN') {
        c[s.key] = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
      } else {
        c[s.key] = users.filter(u => u.role === s.key).length;
      }
    });
    return c;
  }, [users]);

  // Filtre
  const filtered = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organization?.name?.toLowerCase().includes(q)
      );
    }
    if (segment === 'ADMIN') list = list.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    else if (segment === 'others') list = list.filter(u => !['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'COMMERCIAL'].includes(u.role));
    else if (segment !== 'all') list = list.filter(u => u.role === segment);

    if (onlyActive) list = list.filter(u => u.isActive);

    return list;
  }, [users, search, segment, onlyActive]);

  // Groupement par initiale
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach(u => {
      const init = initialOf(u);
      if (!map.has(init)) map.set(init, []);
      map.get(init)!.push(u);
    });
    // Trie chaque groupe alphabétiquement
    map.forEach(arr => arr.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')));
    // Retourne sous forme triée par lettre
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header épuré */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Repertoire</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} personne{users.length > 1 ? 's' : ''}
            {onlyActive && users.length > 0 && ` · ${users.filter(u => u.isActive).length} active${users.filter(u => u.isActive).length > 1 ? 's' : ''}`}
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={openCreate}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          >
            Ajouter
          </Button>
        )}
      </div>

      {/* Barre de recherche style spotlight */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Rechercher une personne, un email, une organisation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-teal-100 focus:border-teal-400 transition"
        />
      </div>

      {/* Segmented control */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {SEGMENTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                segment === s.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.label}
              <span className={`ml-1.5 text-[10px] ${segment === s.key ? 'text-teal-600' : 'text-slate-400'}`}>
                {segCounts[s.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle actifs seulement */}
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span
            onClick={() => setOnlyActive(!onlyActive)}
            className={`relative w-10 h-5 rounded-full transition-colors ${onlyActive ? 'bg-teal-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${onlyActive ? 'translate-x-5' : ''}`}></span>
          </span>
          <span className="text-xs font-semibold text-slate-600">Actifs uniquement</span>
        </label>

        <div className="ml-auto text-xs text-slate-400 font-bold">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste groupée par initiale */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p className="text-slate-600 font-bold">Aucun utilisateur trouve</p>
          <p className="text-xs text-slate-400 mt-1">Essayez de modifier vos filtres ou votre recherche</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([letter, list]) => (
            <div key={letter}>
              {/* Lettre en header */}
              <div className="flex items-center gap-3 mb-2 sticky top-2 z-10">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  {letter}
                </div>
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 tracking-widest">
                  {list.length}
                </span>
              </div>

              {/* Contact rows */}
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {list.map(u => {
                  const rm = roleMeta(u.role);
                  const isMenuOpen = openMenu === u.id;
                  return (
                    <div key={u.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition relative">
                      {/* Avatar rond */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm" style={{ background: rm.color }}>
                        {(u.name?.charAt(0) || u.email?.charAt(0) || '?').toUpperCase()}
                      </div>

                      {/* Nom + email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{u.name || u.email?.split('@')[0]}</p>
                          {u.isOwner && (
                            <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">OWNER</span>
                          )}
                          {!u.isActive && (
                            <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">INACTIF</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono truncate">{u.email}</p>
                      </div>

                      {/* Organisation - caché sur mobile */}
                      <div className="hidden md:block text-right shrink-0 w-32">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Organisation</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{u.organization?.name || '-'}</p>
                      </div>

                      {/* Badge role */}
                      <div className="hidden lg:block shrink-0">
                        <span className="text-[10px] font-black tracking-widest px-2 py-1 rounded-lg" style={{ background: `${rm.color}18`, color: rm.color }}>
                          {rm.label.toUpperCase()}
                        </span>
                      </div>

                      {/* Kebab menu */}
                      {isOwner && (
                        <div className="shrink-0 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : u.id); }}
                            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
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
                              className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-30"
                            >
                              <button
                                onClick={() => { setOpenMenu(null); openEdit(u); }}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Modifier
                              </button>
                              <button
                                onClick={() => { setOpenMenu(null); setUserToDelete(u); }}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-t border-slate-100"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier l utilisateur' : 'Nouvel utilisateur'}
        subtitle={editing ? editing.email : 'Ajoutez une personne au repertoire'}
        icon={<span className="text-2xl font-bold">+</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="user-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Email" required>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@email.com" required />
          </FormField>

          <FormField label={editing ? 'Mot de passe (vide pour garder)' : 'Mot de passe'} required={!editing}>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" />
          </FormField>

          <FormField label="Nom complet">
            <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" />
          </FormField>

          <FormField label="Organisation">
            <Select value={organizationId} onChange={e => setOrganizationId(e.target.value)}>
              <option value="">Aucune</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Role">
            <Select value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!userToDelete}
        title="Supprimer l utilisateur"
        message={`Voulez-vous vraiment supprimer ${userToDelete?.name || userToDelete?.email} ?`}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
