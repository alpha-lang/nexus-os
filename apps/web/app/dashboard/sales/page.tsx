'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, Badge, PageHeader, FormField, Input, Select } from '../../../components/ui';

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [catalogItemId, setCatalogItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    Promise.all([
      fetch('/api/sales', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/partners?type=CUSTOMER', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([s, c]) => {
        setSales(Array.isArray(s) ? s : []);
        setCustomers(Array.isArray(c) ? c : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/sales/${editing.id}` : '/api/sales';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customerId || null, catalogItemId, quantity: parseInt(quantity) }),
    });
    setSaving(false);
    if (res.ok) {
      setCustomerId(''); setCatalogItemId(''); setQuantity('1'); setShowModal(false); setEditing(null);
      const updated = await fetch('/api/sales', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      setSales(Array.isArray(updated) ? updated : []);
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!saleToDelete) return;
    setIsDeleting(true);
    await fetch(`/api/sales/${saleToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSales(sales.filter((s) => s.id !== saleToDelete.id));
    setSaleToDelete(null); setIsDeleting(false);
  }

  function openEdit(sale: any) {
    setEditing(sale);
    setCustomerId(sale.customerId || '');
    setCatalogItemId(sale.catalogItemId || '');
    setQuantity(sale.quantity.toString());
    setShowModal(true);
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ventes"
        subtitle={`${sales.length} vente${sales.length > 1 ? 's' : ''} • ${totalRevenue.toLocaleString('fr-FR')} Ar de chiffre d'affaires`}
        actions={
          isOwner && (
            <Button
              onClick={() => { setEditing(null); setCustomerId(''); setCatalogItemId(''); setQuantity('1'); setShowModal(true); }}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
            >
              Nouvelle vente
            </Button>
          )
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Client</th>
                <th className="p-4 font-semibold text-slate-600">Produit</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Qté</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Total</th>
                <th className="p-4 font-semibold text-slate-600">Date</th>
                {isOwner && <th className="p-4 font-semibold text-slate-600 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-teal-50/40 transition">
                  <td className="p-4 text-slate-600">{s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}</td>
                  <td className="p-4 font-medium text-slate-900">{s.catalogItem?.name || s.module?.name || '—'}</td>
                  <td className="p-4 text-center text-slate-600">{s.quantity}</td>
                  <td className="p-4 text-right font-semibold text-slate-900">{s.total.toLocaleString('fr-FR')} Ar</td>
                  <td className="p-4 text-slate-500 text-xs">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td>
                  {isOwner && (
                    <td className="p-4 text-center">
                      <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline mr-2 text-sm">Modifier</button>
                      <button onClick={() => setSaleToDelete(s)} className="text-red-600 hover:underline text-sm">Supprimer</button>
                    </td>
                  )}
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucune vente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? 'Modifier la vente' : 'Nouvelle vente'}
        subtitle="Enregistrez une transaction"
        icon={<span className="text-2xl">💰</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditing(null); }}>Annuler</Button>
            <button type="submit" form="sale-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="sale-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
          <FormField label="Client (optionnel)">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Aucun —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </Select>
          </FormField>
          <FormField label="Produit">
            <Select value={catalogItemId} onChange={(e) => setCatalogItemId(e.target.value)}>
              <option value="">— Choisir —</option>
              {catalogItems.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} en stock)</option>)}
            </Select>
          </FormField>
          <FormField label="Quantité">
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!saleToDelete}
        title="Supprimer la vente"
        message="Voulez-vous vraiment supprimer cette vente ?"
        onClose={() => setSaleToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
