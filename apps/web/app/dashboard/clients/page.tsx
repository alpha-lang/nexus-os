'use client';

import { useState, useEffect, useMemo } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, PageHeader, FormField, Input, Select } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';

export default function ClientsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'city'>('recent');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  // Reset pagination quand filtres changent
  useEffect(() => {
    pag.setPage(1);
  }, [search, cityFilter, sort]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => { if (c.city) set.add(c.city); });
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers;
    if (cityFilter) list = list.filter((c) => c.city === cityFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(s) ||
          c.lastName?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => {
      if (sort === 'name') {
        const an = (a.firstName || '') + ' ' + (a.lastName || '');
        const bn = (b.firstName || '') + ' ' + (b.lastName || '');
        return an.localeCompare(bn);
      }
      if (sort === 'city') return (a.city || '').localeCompare(b.city || '');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [customers, search, cityFilter, sort]);

  const pag = usePagination(filtered, { perPageDefault: 12 });

  function openModal(c?: any) {
    setError(null);
    if (c) {
      setEditing(c);
      setFirstName(c.firstName); setLastName(c.lastName);
      setEmail(c.email || ''); setPhone(c.phone || '');
      setAddress(c.address || ''); setCity(c.city || '');
    } else {
      setEditing(null);
      setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      setAddress(''); setCity('');
    }
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email: email || null, phone: phone || null, address: address || null, city: city || null }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setEditing(null);
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!customerToDelete) return;
    setIsDeleting(true);
    await fetch(`/api/customers/${customerToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
    setCustomerToDelete(null);
    setIsDeleting(false);
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const withEmail = filtered.filter((c) => c.email).length;
  const withPhone = filtered.filter((c) => c.phone).length;
  const previewInitials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        subtitle={`${filtered.length} client${filtered.length > 1 ? 's' : ''} • ${withEmail} avec email • ${withPhone} avec téléphone`}
        actions={
          <Button
            onClick={() => openModal()}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nouveau client
          </Button>
        }
      />

      {/* Barre recherche + filtre */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Rechercher par nom, email, telephone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 cursor-pointer"
          >
            <option value="recent">Plus recents</option>
            <option value="name">Nom A-Z</option>
            <option value="city">Ville</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            <span className="font-semibold">{filtered.length}</span> client{filtered.length > 1 ? 's' : ''}
            {(search || cityFilter) && (
              <button
                onClick={() => { setSearch(''); setCityFilter(''); }}
                className="ml-2 text-teal-600 hover:underline font-medium"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Client</th>
                <th className="p-4 font-semibold text-slate-600">Contact</th>
                <th className="p-4 font-semibold text-slate-600">Ville</th>
                <th className="p-4 font-semibold text-slate-600">Adresse</th>
                <th className="p-4 font-semibold text-slate-600">Créé le</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pag.pageItems.map((c) => (
                <tr key={c.id} className="hover:bg-teal-50/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`/dashboard/crm/${c.id}`}
                          className="font-medium text-slate-900 hover:text-teal-600 hover:underline"
                        >
                          {c.firstName} {c.lastName}
                        </a>
                        {c.user && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Compte</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="text-sm">{c.email || '—'}</div>
                    <div className="text-xs text-slate-500">{c.phone || ''}</div>
                  </td>
                  <td className="p-4 text-slate-600">{c.city || '—'}</td>
                  <td className="p-4 text-slate-500 text-xs max-w-xs truncate">{c.address || '—'}</td>
                  <td className="p-4 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => openModal(c)} className="text-blue-600 text-sm hover:underline mr-2">Modifier</button>
                    <button onClick={() => setCustomerToDelete(c)} className="text-red-600 text-sm hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucun client</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL avec UI Kit */}
      <Pagination
        page={pag.page}
        totalPages={pag.totalPages}
        onPageChange={pag.setPage}
        perPage={pag.perPage}
        perPageOptions={pag.perPageOptions}
        onPerPageChange={pag.setPerPage}
        total={pag.total}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier le client' : 'Nouveau client'}
        subtitle={editing ? `Fiche de ${editing.firstName} ${editing.lastName}` : 'Créez une nouvelle fiche client'}
        icon={
          previewInitials ? (
            <span className="text-white font-bold text-lg">{previewInitials}</span>
          ) : (
            <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )
        }
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <button
              type="submit"
              form="client-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {editing ? 'Enregistrer' : 'Créer le client'}
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="client-form" onSubmit={save} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Identité */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identité</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Prénom" required>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  required
                />
              </FormField>
              <FormField label="Nom" required>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@email.com"
                />
              </FormField>
              <FormField label="Téléphone">
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+261 34 12 345 67"
                />
              </FormField>
            </div>
          </div>

          {/* Localisation */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Localisation</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ville">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Antananarivo"
                />
              </FormField>
              <FormField label="Adresse">
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Lot II M 12 Bis"
                />
              </FormField>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!customerToDelete}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer ${customerToDelete?.firstName} ${customerToDelete?.lastName} ?`}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
