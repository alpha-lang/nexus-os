'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { Modal, Button, Badge, FormField, Input, Select, Textarea } from '../../../../components/ui';

const CATEGORIES = [
  { value: 'ROOM', label: 'Chambre', icon: '🛏️' },
  { value: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
  { value: 'SPA', label: 'Spa', icon: '💆' },
  { value: 'MINIBAR', label: 'Minibar', icon: '🍷' },
  { value: 'LAUNDRY', label: 'Blanchisserie', icon: '👕' },
  { value: 'TRANSPORT', label: 'Transport', icon: '🚗' },
  { value: 'OTHER', label: 'Autre', icon: '📦' },
];

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [folio, setFolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [chargeToDelete, setChargeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('RESTAURANT');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch(`/api/hotel/reservations/${id}/folio`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Introuvable');
    setFolio(await res.json());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  async function saveCharge(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const res = await apiFetch(`/api/hotel/reservations/${id}/folio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, category, quantity: parseInt(quantity), unitPrice: parseFloat(unitPrice) }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setDescription(''); setCategory('RESTAURANT'); setQuantity('1'); setUnitPrice('');
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!chargeToDelete) return;
    setIsDeleting(true);
    await apiFetch(`/api/hotel/folio/${chargeToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
    setChargeToDelete(null); setIsDeleting(false);
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;
  if (error || !folio) return <div className="p-6 text-red-600">{error || 'Erreur'}</div>;

  const r = folio.reservation;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <a href="/dashboard/reservations" className="hover:text-teal-600">Réservations</a>
        <span>›</span>
        <span className="text-slate-900 font-medium">{r.reference}</span>
      </div>

      {/* Header */}
      <div className="bg-linear-to-br from-slate-900 via-blue-900 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20 font-mono">
                {r.reference}
              </span>
              <Badge variant={r.status === 'CHECKED_IN' ? 'success' : r.status === 'CONFIRMED' ? 'info' : 'warning'}>
                {r.status}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">
              {r.customer?.firstName} {r.customer?.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-blue-100">
              <span>🛏️ Chambre {r.room?.number} ({r.room?.roomType?.name})</span>
              <span>📅 {new Date(r.checkInDate).toLocaleDateString('fr-FR')} → {new Date(r.checkOutDate).toLocaleDateString('fr-FR')}</span>
              <span>🌙 {folio.nights} nuit{folio.nights > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Folio / Résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">🧾 Extras ({r.folioCharges.length})</h3>
            <Button size="sm" onClick={() => setShowModal(true)} icon={<span>+</span>}>Ajouter un extra</Button>
          </div>

          {r.folioCharges.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Aucun extra pour cette réservation
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Description</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Catégorie</th>
                  <th className="p-3 text-center font-semibold text-slate-600">Qté</th>
                  <th className="p-3 text-right font-semibold text-slate-600">P.U.</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Total</th>
                  <th className="p-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.folioCharges.map((c: any) => {
                  const cat = CATEGORIES.find((x) => x.value === c.category) || CATEGORIES[6];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{c.description}</td>
                      <td className="p-3"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{cat.icon} {cat.label}</span></td>
                      <td className="p-3 text-center">{c.quantity}</td>
                      <td className="p-3 text-right text-slate-600">{c.unitPrice.toLocaleString('fr-FR')} Ar</td>
                      <td className="p-3 text-right font-semibold">{c.total.toLocaleString('fr-FR')} Ar</td>
                      <td className="p-3 text-center">
                        <button onClick={() => setChargeToDelete(c)} className="text-red-600 hover:underline text-xs">Suppr.</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Résumé total */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Résumé</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Chambre ({folio.nights} nuits)</span>
              <span className="font-medium">{folio.roomTotal.toLocaleString('fr-FR')} Ar</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Extras</span>
              <span className="font-medium">{folio.extrasTotal.toLocaleString('fr-FR')} Ar</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-lg text-slate-900">{folio.grandTotal.toLocaleString('fr-FR')} Ar</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Payé</span>
              <span className="font-medium">{folio.paid.toLocaleString('fr-FR')} Ar</span>
            </div>
            <div className={`flex justify-between pt-3 border-t border-slate-200 ${folio.solde > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span className="font-semibold">Solde</span>
              <span className="font-bold text-xl">{folio.solde.toLocaleString('fr-FR')} Ar</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Ajouter un extra"
        subtitle="Restaurant, spa, minibar…"
        icon={<span className="text-2xl">💰</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <button type="submit" form="charge-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        }
      >
        <form id="charge-form" onSubmit={saveCharge} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Description" required>
            <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dîner, Massage, Coca…" required />
          </FormField>

          <FormField label="Catégorie">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantité">
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
            <FormField label="Prix unitaire (Ar)" required>
              <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="15000" required />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!chargeToDelete}
        title="Supprimer le extra"
        message={`Voulez-vous vraiment supprimer "${chargeToDelete?.description}" ?`}
        onClose={() => setChargeToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
