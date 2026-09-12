'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [createUser, setCreateUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('USER');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/organizations/clients', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setOrganizations(data); })
      .catch(console.error);

    fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCustomers(data); else setCustomers([]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers';
    const body: any = { firstName, lastName, email, phone, address, city, organizationId };
    if (createUser && isOwner) {
      body.createUser = true;
      body.userEmail = userEmail;
      body.userPassword = userPassword;
      body.userRole = userRole;
    }
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setAddress(''); setCity(''); setOrganizationId('');
      setCreateUser(false); setUserEmail(''); setUserPassword(''); setUserRole('USER');
      setShowModal(false); setEditing(null);
      const updated = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      if (Array.isArray(updated)) setCustomers(updated);
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  function requestDelete(customer: any) { setCustomerToDelete(customer); }
  async function confirmDelete() {
    if (!customerToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem('token');
    await fetch(`/api/customers/${customerToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setCustomers(customers.filter(c => c.id !== customerToDelete.id));
    setCustomerToDelete(null); setIsDeleting(false);
  }

  function openEdit(customer: any) {
    setEditing(customer);
    setFirstName(customer.firstName); setLastName(customer.lastName); setEmail(customer.email || ''); setPhone(customer.phone || ''); setAddress(customer.address || ''); setCity(customer.city || ''); setOrganizationId(customer.organizationId || '');
    setShowModal(true);
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">Gérez les clients de vos organisations</p>
        </div>
        {isOwner && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-linear-to-r from-blue-600 to-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2 justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Ajouter
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">Nom complet</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Organisation</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Email</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Téléphone</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Rôle</th>
              {isOwner && <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-900">{c.firstName} {c.lastName}</td>
                <td className="p-4 text-slate-600">{c.organization?.name || '—'}</td>
                <td className="p-4 text-slate-600">{c.email || '—'}</td>
                <td className="p-4 text-slate-600">{c.phone || '—'}</td>
                <td className="p-4">{c.user?.role ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{c.user.role}</span> : <span className="text-slate-400">—</span>}</td>
                {isOwner && (
                  <td className="p-4">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline mr-2">Modifier</button>
                    <button onClick={() => requestDelete(c)} className="text-red-600 hover:underline">Supprimer</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-900">{c.firstName} {c.lastName}</h3>
              {c.user?.role && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{c.user.role}</span>}
            </div>
            <p className="text-sm text-slate-500">🏢 {c.organization?.name || '—'}</p>
            <p className="text-sm text-slate-500">{c.email || '—'}</p>
            <p className="text-sm text-slate-500">{c.phone || '—'}</p>
            {isOwner && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(c)} className="text-blue-600 text-sm hover:underline">Modifier</button>
                <button onClick={() => requestDelete(c)} className="text-red-600 text-sm hover:underline">Supprimer</button>
              </div>
            )}
          </div>
        ))}
        {customers.length === 0 && <div className="text-center py-10 text-slate-400">Aucun client</div>}
      </div>

      {/* Modal (seulement si Owner) */}
      {isOwner && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{editing ? 'Modifier' : 'Ajouter'} un client</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
            <form onSubmit={createCustomer} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Organisation *</label><select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900 bg-white" required><option value="">— Sélectionner —</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ville</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent text-slate-900" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition">{editing ? 'Enregistrer' : 'Créer'}</button>
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1 bg-gray-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!customerToDelete} title="Confirmer la suppression" message={`Voulez-vous vraiment supprimer ${customerToDelete?.firstName} ${customerToDelete?.lastName} ?`} onClose={() => setCustomerToDelete(null)} onConfirm={confirmDelete} isLoading={isDeleting} />
    </div>
  );
}
