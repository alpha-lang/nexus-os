'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, FormField, Input, Textarea } from '../../../../components/ui';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [yieldCount, setYieldCount] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<{ stockItemId: string; quantity: string; unit: string }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [r, i, m] = await Promise.all([
      fetch('/api/stock/recipes', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/pos/menu', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setRecipes(Array.isArray(r) ? r : []);
    setItems(Array.isArray(i) ? i : []);
    setMenuItems(Array.isArray(m) ? m : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setName(''); setYieldCount('1'); setSellingPrice(''); setMenuItemId('');
    setNotes(''); setIngredients([{ stockItemId: '', quantity: '', unit: 'kg' }]);
    setError(null); setEditing(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(r: any) {
    setEditing(r);
    setName(r.name);
    setYieldCount(String(r.yield || 1));
    setSellingPrice(r.sellingPrice?.toString() || '');
    setMenuItemId(r.menuItemId || '');
    setNotes(r.notes || '');
    setIngredients(r.ingredients.map((i: any) => ({ stockItemId: i.stockItemId, quantity: String(i.quantity), unit: i.unit })));
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/stock/recipes/${editing.id}` : '/api/stock/recipes';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, yield: parseInt(yieldCount) || 1,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        menuItemId: menuItemId || null,
        notes,
        ingredients: ingredients.filter(i => i.stockItemId && i.quantity),
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Recette mise a jour' : 'Recette creee');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  function addIngredientRow() {
    setIngredients(prev => [...prev, { stockItemId: '', quantity: '', unit: 'kg' }]);
  }
  function updateIngredient(idx: number, patch: any) {
    setIngredients(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }
  function removeIngredientRow(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }

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

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Fiches techniques</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recettes</h1>
          <p className="text-slate-500 mt-1">Cout de revient et marge par plat</p>
        </div>
        <Button onClick={openCreate} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          Nouvelle recette
        </Button>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-semibold">Aucune recette</p>
          <p className="text-xs text-slate-400 mt-1">Creez vos fiches techniques pour calculer le cout de revient</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-base truncate">{r.name}</h3>
                    <p className="text-[10px] text-orange-100 mt-0.5">
                      {r.yield > 1 ? `${r.yield} portions` : '1 portion'} · {r.ingredients.length} ingredient{r.ingredients.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Ingredients</p>
                  <div className="space-y-1 text-xs">
                    {r.ingredients.slice(0, 4).map((ing: any) => (
                      <div key={ing.id} className="flex justify-between text-slate-700">
                        <span className="truncate">{ing.stockItem?.name}</span>
                        <span className="font-bold tabular-nums shrink-0 ml-2">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                    {r.ingredients.length > 4 && (
                      <p className="text-slate-400 text-[10px]">+{r.ingredients.length - 4} autres</p>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Cout revient</span>
                    <span className="font-bold text-slate-900 tabular-nums">{Math.round(r.costPerPortion || 0).toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Prix vente</span>
                    <span className="font-bold text-slate-900 tabular-nums">{(r.sellingPrice || 0).toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="font-black text-slate-700">Marge</span>
                    <span className={'font-black tabular-nums ' + ((r.marginPct || 0) > 50 ? 'text-emerald-600' : (r.marginPct || 0) > 30 ? 'text-amber-600' : 'text-red-600')}>
                      {Math.round(r.margin || 0).toLocaleString('fr-FR')} Ar ({Math.round(r.marginPct || 0)}%)
                    </span>
                  </div>
                </div>
                <button onClick={() => openEdit(r)} className="w-full py-2 rounded-lg text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier la recette' : 'Nouvelle recette'}
        subtitle={editing ? editing.name : 'Creez une fiche technique'}
        icon={<span className="text-2xl font-bold">+</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button type="submit" form="recipe-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="recipe-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Nom de la recette" required>
            <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Salade Cesar" required />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Portions">
              <Input type="number" value={yieldCount} onChange={e => setYieldCount(e.target.value)} min="1" />
            </FormField>
            <FormField label="Prix vente (Ar)">
              <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
            </FormField>
            <FormField label="Plat lie (POS)">
              <select value={menuItemId} onChange={e => setMenuItemId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
                <option value="">Aucun</option>
                {menuItems.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Ingredients</label>
              <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-teal-600 hover:underline">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select
                    value={ing.stockItemId}
                    onChange={e => updateIngredient(idx, { stockItemId: e.target.value })}
                    className="col-span-6 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                  >
                    <option value="">Article...</option>
                    {items.filter((i: any) => i.isIngredient).map((i: any) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    value={ing.quantity}
                    onChange={e => updateIngredient(idx, { quantity: e.target.value })}
                    placeholder="Qte"
                    className="col-span-3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={e => updateIngredient(idx, { unit: e.target.value })}
                    placeholder="kg"
                    className="col-span-2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg font-bold transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <FormField label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
