'use client';

import { useState, useEffect, useMemo } from 'react';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Textarea } from '../../../../components/ui';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await fetch('/api/stock/suppliers', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSuppliers(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setName(''); setContactName(''); setPhone(''); setEmail('');
    setAddress(''); setLeadTimeDays(''); setNotes('');
    setError(null); setEditing(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(s: any) {
    setEditing(s);
    setName(s.name || '');
    setContactName(s.contactName || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setLeadTimeDays(s.leadTimeDays?.toString() || '');
    setNotes(s.notes || '');
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/stock/suppliers/${editing.id}` : '/api/stock/suppliers';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contactName, phone, email, address, leadTimeDays, notes }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Fournisseur mis a jour' : 'Fournisseur cree');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    const res = await fetch(`/api/stock/suppliers/${supplierToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Fournisseur supprime');
      await load();
    } else {
      const data = await res.json();
      showToast(data.message || 'Suppression impossible');
    }
    setSupplierToDelete(null);
    setIsDeleting(false);
  }

  const filtered = useMemo(() => {
    let list = [...suppliers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [suppliers, search]);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Partenaires</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fournisseurs</h1>
          <p className="text-slate-500 mt-1">
            {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} enregistre{suppliers.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/dashboard/stock"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition shadow-sm whitespace-nowrap"
          >
            Retour stock
          </a>
          <Button
            onClick={openCreate}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
          )}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-semibold">Aucun fournisseur</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez votre premier fournisseur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition group">
              {/* Bandeau avatar */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-5 py-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-900 font-black text-lg shadow-md shrink-0">
                  {s.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-sm truncate">{s.name}</h3>
                  {s.contactName && (
                    <p className="text-[10px] text-slate-300 truncate">Contact : {s.contactName}</p>
                  )}
                </div>
                {s.leadTimeDays != null && (
                  <span className="text-[10px] font-black tracking-widest bg-white/15 backdrop-blur-sm text-white px-2 py-1 rounded-md border border-white/20 shrink-0">
                    {s.leadTimeDays}J
                  </span>
                )}
              </div>

              {/* Corps */}
              <div className="p-5">
                <div className="space-y-2 mb-4">
                  {s.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-4 shrink-0">📞</span>
                      <span className="font-bold text-slate-900 tabular-nums truncate">{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-4 shrink-0">✉️</span>
                      <span className="text-slate-600 truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-4 shrink-0">📍</span>
                      <span className="text-slate-500 truncate">{s.address}</span>
                    </div>
                  )}
                  {!s.phone && !s.email && !s.address && (
                    <p className="text-xs text-slate-400 italic">Aucune coordonnee</p>
                  )}
                </div>

                {/* Stats */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Articles</p>
                      <p className="text-xl font-black text-slate-900 tabular-nums">{s._count?.items || 0}</p>
                    </div>
                    {s.leadTimeDays != null && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Delai</p>
                        <p className="text-sm font-black text-slate-700">{s.leadTimeDays} jour{s.leadTimeDays > 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 py-2 rounded-lg text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setSupplierToDelete(s)}
                    className="flex-1 py-2 rounded-lg text-xs font-black bg-red-50 text-red-700 hover:bg-red-100 transition"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        subtitle={editing ? editing.name : 'Ajoutez un fournisseur a votre repertoire'}
        icon={<span className="text-2xl font-bold">+</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="supplier-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="supplier-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Nom du fournisseur" required>
            <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Metro Tana" required />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact">
              <Input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jean Paul" />
            </FormField>
            <FormField label="Telephone">
              <Input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+261 34 11 111 11" />
            </FormField>
          </div>

          <FormField label="Email">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@fournisseur.mg" />
          </FormField>

          <FormField label="Adresse">
            <Input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Zone industrielle" />
          </FormField>

          <FormField label="Delai de livraison (jours)" hint="Combien de temps pour recevoir une commande">
            <Input type="number" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} placeholder="2" min="0" />
          </FormField>

          <FormField label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Conditions de paiement, remises..." />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!supplierToDelete}
        title="Supprimer le fournisseur"
        message={`Voulez-vous vraiment supprimer "${supplierToDelete?.name}" ?`}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
