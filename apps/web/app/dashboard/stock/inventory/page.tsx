'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, unwrap } from '../../../../lib/api';

type Tab = 'new' | 'history';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('new');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('Inventaire mensuel');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [itemsLoading, setItemsLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // ═══ LOADERS ═══
  async function loadWarehouses() {
    const res = await apiFetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } });
    const list = unwrap(await res.json());
    setWarehouses(list);
    if (list.length > 0 && !warehouseId) setWarehouseId(list[0].id);
  }

  async function loadItemsForWarehouse(whId: string) {
    if (!whId) { setItems([]); return; }
    setItemsLoading(true);
    const res = await apiFetch(`/api/stock/warehouses/${whId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setItems([]); setItemsLoading(false); return; }
    const detail = await res.json();
    const mapped = (detail.items || []).map((it: any) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      unit: it.unit,
      category: it.category,
      currentStock: it.quantity,
      minStock: it.minStock,
      maxStock: it.maxStock,
      costPrice: it.costPrice,
    }));
    setItems(mapped);
    setItemsLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const res = await apiFetch('/api/stock/inventory/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setHistory(data.sessions || []);
      setHistorySummary(data.summary || {});
    }
    setHistoryLoading(false);
  }

  async function openDetail(reference: string) {
    setDetailLoading(true);
    setDetail({ reference }); // placeholder pour ouvrir le drawer
    const res = await apiFetch(`/api/stock/inventory/detail/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }

  // ═══ EFFECTS ═══
  useEffect(() => {
    loadWarehouses().catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'new') loadItemsForWarehouse(warehouseId).catch(console.error);
    if (tab === 'history') loadHistory().catch(console.error);
  }, [tab, warehouseId]);

  // ═══ IMPRESSION : FICHE VIERGE (avant comptage) ═══
  function printBlankSheet() {
    const wh = warehouses.find((w) => w.id === warehouseId);
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    const rows = filtered.map((it, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">
          <div style="font-weight:bold;color:#0f172a">${it.name}</div>
          <div style="font-size:10px;color:#94a3b8;font-family:monospace">${it.sku || ''}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b">
          ${it.currentStock} ${it.unit}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">
          <div style="border-bottom:1px solid #94a3b8;height:24px;width:80px;margin:0 auto"></div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">
          <div style="border-bottom:1px solid #94a3b8;height:24px;width:60px;margin:0 auto"></div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;width:60px"></td>
      </tr>
    `).join('');

    win.document.write(`
      <html><head><title>Fiche de comptage - ${wh?.name || ''}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
        .banner { background: #0f172a; color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
        .banner-icon { font-size: 28px; }
        .banner-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
        .banner-sub { font-size: 11px; opacity: 0.85; }
        .header { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #0f172a; }
        .logo { font-size: 22px; font-weight: 900; }
        .logo small { display: block; font-size: 10px; color: #64748b; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 11px; }
        .info-block { background: #f8fafc; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #0f172a; }
        .info-block .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 3px; }
        .info-block .value { font-size: 13px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #0f172a; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; text-align: center; }
      </style></head><body>
        <div class="banner">
          <div class="banner-icon">📋</div>
          <div>
            <div class="banner-title">FICHE DE COMPTAGE</div>
            <div class="banner-sub">À remplir manuellement lors du comptage physique</div>
          </div>
        </div>
        <div class="header">
          <div class="logo">NEXUS OS<small>INVENTAIRE PHYSIQUE</small></div>
          <div style="text-align:right;font-size:11px">
            <div><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
            <div><strong>Magasin :</strong> ${wh?.name || '—'}</div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-block"><div class="label">Magasin</div><div class="value">${wh?.name || '—'}</div></div>
          <div class="info-block"><div class="label">Opérateur</div><div class="value">___________________</div></div>
          <div class="info-block"><div class="label">Heure début / fin</div><div class="value">_____ / _____</div></div>
        </div>
        <table>
          <thead><tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Article</th>
            <th style="text-align:center;width:80px">Théorique</th>
            <th style="text-align:center;width:110px">Physique (1)</th>
            <th style="text-align:center;width:90px">Physique (2)</th>
            <th style="width:60px"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="signatures">
          <div class="sig-box">Signature opérateur</div>
          <div class="sig-box">Signature responsable</div>
        </div>
        <div class="footer">
          Document généré par NEXUS OS le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ═══ IMPRESSION : RAPPORT DÉTAILLÉ ═══
  function printInventoryReport() {
    if (!detail) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    const lines = (detail.lines || []).map((l: any) => `
      <tr style="${l.isLoss ? 'background:#fef2f2' : 'background:#f0fdf4'}">
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">
          <div style="font-weight:bold">${l.name}</div>
          <div style="font-size:10px;color:#94a3b8;font-family:monospace">${l.sku || ''}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold;color:${l.isLoss ? '#dc2626' : '#059669'}">
          ${l.isLoss ? '' : '+'}${l.quantity} ${l.unit}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;color:${l.isLoss ? '#dc2626' : '#059669'}">
          ${l.isLoss ? '-' : '+'}${l.value.toLocaleString('fr-FR')} Ar
        </td>
      </tr>
    `).join('');

    const s = detail.summary || {};

    win.document.write(`
      <html><head><title>Rapport inventaire ${detail.reference}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
        .banner { background: linear-gradient(135deg, #1e40af, #0891b2); color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
        .banner-icon { font-size: 28px; }
        .banner-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
        .banner-sub { font-size: 11px; opacity: 0.85; }
        .header { display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 3px solid #0f172a; margin-bottom: 20px; }
        .logo { font-size: 22px; font-weight: 900; }
        .logo small { display: block; font-size: 10px; color: #64748b; letter-spacing: 2px; }
        .ref { font-family: monospace; font-size: 20px; font-weight: 900; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-block { background: #f8fafc; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #0f172a; }
        .info-block .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 4px; }
        .info-block .value { font-size: 14px; font-weight: bold; }
        .kpi-grid { display: grid; grid-template-columns: 4fr; gap: 10px; margin-bottom: 20px; }
        .kpi { padding: 12px; border-radius: 8px; text-align: center; }
        .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 3px; }
        .kpi-value { font-size: 18px; font-weight: 900; }
        .kpi-red { background: #fef2f2; color: #991b1b; border: 2px solid #fca5a5; }
        .kpi-green { background: #f0fdf4; color: #065f46; border: 2px solid #86efac; }
        .kpi-blue { background: #eff6ff; color: #1e40af; border: 2px solid #93c5fd; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        thead th { background: #0f172a; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; text-align: center; }
        .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; }
      </style></head><body>
        <div class="banner">
          <div class="banner-icon">📊</div>
          <div>
            <div class="banner-title">RAPPORT D'INVENTAIRE</div>
            <div class="banner-sub">Écarts constatés et valeurs ajustées</div>
          </div>
        </div>
        <div class="header">
          <div class="logo">NEXUS OS<small>RAPPORT INVENTAIRE</small></div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#64748b;letter-spacing:1px">RÉFÉRENCE</div>
            <div class="ref">${detail.reference}</div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-block">
            <div class="label">Magasin</div>
            <div class="value">${detail.warehouse?.name || '—'}</div>
            ${detail.warehouse?.location ? `<div style="font-size:11px;color:#475569">${detail.warehouse.location}</div>` : ''}
          </div>
          <div class="info-block">
            <div class="label">Date & opérateur</div>
            <div class="value">${detail.date ? new Date(detail.date).toLocaleDateString('fr-FR') : '—'}</div>
            <div style="font-size:11px;color:#475569">par ${detail.user?.name || detail.user?.email || '—'}</div>
          </div>
        </div>
        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="kpi kpi-blue"><div class="kpi-label">Articles</div><div class="kpi-value">${s.itemsCount || 0}</div></div>
          <div class="kpi kpi-red"><div class="kpi-label">Pertes</div><div class="kpi-value">-${(s.totalLossValue || 0).toLocaleString('fr-FR')} Ar</div></div>
          <div class="kpi kpi-green"><div class="kpi-label">Gains</div><div class="kpi-value">+${(s.totalGainValue || 0).toLocaleString('fr-FR')} Ar</div></div>
        </div>
        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Détail des ajustements</h3>
        <table>
          <thead><tr>
            <th>Article</th>
            <th style="text-align:center">Écart</th>
            <th style="text-align:right">Valeur</th>
          </tr></thead>
          <tbody>${lines}</tbody>
        </table>
        <div style="margin-top:15px;padding:12px;background:#0f172a;color:white;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px">Motif</div>
          <div style="font-size:14px;font-weight:bold">${detail.reason || '—'}</div>
        </div>
        <div class="signatures">
          <div class="sig-box">Signature opérateur</div>
          <div class="sig-box">Signature responsable</div>
        </div>
        <div class="footer">
          Document généré par NEXUS OS le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ═══ SUBMIT ═══
  async function submit() {
    if (!warehouseId) return;
    setSubmitting(true);
    const payload = {
      warehouseId,
      reason,
      counts: Object.entries(counts).map(([itemId, qty]) => ({ itemId, quantity: parseFloat(qty) || 0 })),
    };
    const res = await apiFetch('/api/stock/inventory/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setCounts({});
      await loadItemsForWarehouse(warehouseId);
    }
  }

  const filtered = items.filter((i) => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()));
  const countedCount = Object.keys(counts).length;

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Contrôle physique</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventaire</h1>
          <p className="text-slate-500 mt-1">
            Comparez le stock physique au stock théorique
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex gap-1">
        <button
          onClick={() => setTab('new')}
          className={'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition ' + (
            tab === 'new' ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          ➕ Nouvel inventaire
        </button>
        <button
          onClick={() => setTab('history')}
          className={'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5 ' + (
            tab === 'history' ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          📋 Historique
          {history.length > 0 && (
            <span className={'text-[10px] font-black px-1.5 py-0.5 rounded-md ' + (tab === 'history' ? 'bg-white/25' : 'bg-slate-200 text-slate-700')}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════ TAB NOUVEL INVENTAIRE ═══════════════ */}
      {tab === 'new' && (
        <>
          {/* Paramètres */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Magasin</label>
              <select
                value={warehouseId}
                onChange={(e) => { setWarehouseId(e.target.value); setCounts({}); }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? '⭐' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Motif</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer articles..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Résultat */}
          {result && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                ✓
              </div>
              <div className="flex-1">
                <p className="text-emerald-800 font-black text-sm">
                  Inventaire enregistré
                </p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  Référence <span className="font-mono font-bold">{result.reference}</span> · {result.count} ajustement{result.count > 1 ? 's' : ''} appliqué{result.count > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => openDetail(result.reference)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shrink-0"
              >
                Voir le rapport
              </button>
            </div>
          )}

          {/* Tableau saisie */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Théorique</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Physique</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">
                        {itemsLoading ? 'Chargement…' : items.length === 0 ? 'Aucun article dans ce magasin' : 'Aucun article ne correspond au filtre'}
                      </td>
                    </tr>
                  )}
                  {filtered.map((it) => {
                    const theoretical = it.currentStock;
                    const physStr = counts[it.id];
                    const phys = physStr === '' || physStr === undefined ? null : parseFloat(physStr);
                    const diff = phys === null ? null : phys - theoretical;
                    const hasValue = physStr !== '' && physStr !== undefined;
                    return (
                      <tr key={it.id} className={'hover:bg-slate-50 ' + (hasValue && diff !== 0 ? 'bg-amber-50/30' : '')}>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700 tabular-nums">
                          {theoretical} <span className="text-xs text-slate-400">{it.unit}</span>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            step="0.001"
                            value={physStr || ''}
                            onChange={(e) => setCounts((prev) => ({ ...prev, [it.id]: e.target.value }))}
                            placeholder={String(theoretical)}
                            className="w-28 px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-black text-slate-900 text-center tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          />
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {diff === null ? (
                            <span className="text-slate-300">—</span>
                          ) : diff === 0 ? (
                            <span className="text-emerald-600 font-bold text-xs">OK</span>
                          ) : diff > 0 ? (
                            <span className="text-blue-600 font-black">+{diff.toFixed(2)} {it.unit}</span>
                          ) : (
                            <span className="text-red-600 font-black">{diff.toFixed(2)} {it.unit}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-2xl border border-slate-200 p-4 sticky bottom-4 shadow-lg">
            <div className="text-xs text-slate-500">
              <span className="font-black text-slate-900">{countedCount}</span> article{countedCount > 1 ? 's' : ''} compté{countedCount > 1 ? 's' : ''}
              {' · '}
              <span className="font-black text-slate-900">{items.length}</span> références dans le magasin
            </div>
            <div className="flex gap-2">
              <button
                onClick={printBlankSheet}
                className="px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1.5"
                title="Imprimer la fiche de comptage vierge"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Fiche vierge
              </button>
              <button
                onClick={submit}
                disabled={submitting || countedCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? 'Enregistrement...' : `Valider (${countedCount})`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ TAB HISTORIQUE ═══════════════ */}
      {tab === 'history' && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Sessions</p>
              <p className="text-2xl font-black tabular-nums text-teal-400">{historySummary?.totalSessions || 0}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">inventaires passés</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-red-200">
              <p className="text-[10px] text-red-700 uppercase font-black tracking-widest mb-1">Pertes cumulées</p>
              <p className="text-2xl font-black text-red-600 tabular-nums">{(historySummary?.totalLossValue || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Ar de manquants</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-emerald-200">
              <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Gains cumulés</p>
              <p className="text-2xl font-black text-emerald-600 tabular-nums">{(historySummary?.totalGainValue || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Ar retrouvés</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Dernier inventaire</p>
              <p className="text-base font-black text-slate-900">
                {historySummary?.lastInventoryDate ? fmtDate(historySummary.lastInventoryDate) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">par RAKOTO</p>
            </div>
          </div>

          {/* Liste sessions */}
          {historyLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📋</div>
              <p className="text-lg font-bold text-slate-700 mb-1">Aucun inventaire</p>
              <p className="text-sm text-slate-400">Lancez votre premier comptage physique</p>
              <button
                onClick={() => setTab('new')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg transition"
              >
                + Nouvel inventaire
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((s) => {
                const hasLoss = s.totalLossValue > 0;
                const net = s.netValue;
                return (
                  <button
                    key={s.reference}
                    onClick={() => openDetail(s.reference)}
                    className="w-full text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-lg transition overflow-hidden"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className={'w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md shrink-0 ' + (
                        hasLoss ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                      )}>
                        {hasLoss ? '↓' : '✓'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm">{s.reference}</span>
                          <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {s.warehouse?.code}
                          </span>
                          {hasLoss && (
                            <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-red-100 text-red-700">
                              -{s.totalLossValue.toLocaleString('fr-FR')} Ar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {fmtDate(s.date)} · {s.warehouse?.name} · par {s.user?.name || s.user?.email || '—'}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-6 shrink-0 pr-4">
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Articles</p>
                          <p className="text-base font-black text-slate-900 tabular-nums">{s.itemsCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-red-500 uppercase font-black tracking-widest">Pertes</p>
                          <p className="text-base font-black text-red-600 tabular-nums">
                            {s.totalLossQty > 0 ? `-${s.totalLossQty}` : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest">Gains</p>
                          <p className="text-base font-black text-emerald-600 tabular-nums">
                            {s.totalGainQty > 0 ? `+${s.totalGainQty}` : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Net</p>
                          <p className={'text-base font-black tabular-nums ' + (net >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {net >= 0 ? '+' : ''}{net.toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ DRAWER DÉTAIL INVENTAIRE ═══════════ */}
      {detail && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetail(null)}></div>
          <div className="relative w-full max-w-3xl bg-white shadow-2xl h-full overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">Rapport d'inventaire</p>
                      <h2 className="text-2xl font-black font-mono">{detail.reference}</h2>
                      <p className="text-xs text-blue-200 mt-1">
                        {detail.date ? fmtDate(detail.date) : '—'} · {detail.warehouse?.name} · par {detail.user?.name || detail.user?.email || '—'}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={printInventoryReport}
                        className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-bold transition flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                        </svg>
                        Imprimer
                      </button>
                      <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl transition">×</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
                      <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest">Articles</p>
                      <p className="text-base font-black tabular-nums">{detail.summary?.itemsCount || 0}</p>
                    </div>
                    <div className="bg-red-500/20 rounded-xl px-3 py-2 border border-red-400/40">
                      <p className="text-[9px] text-red-200 uppercase font-black tracking-widest">Pertes</p>
                      <p className="text-base font-black tabular-nums text-red-300">-{(detail.summary?.totalLossValue || 0).toLocaleString('fr-FR')}</p>
                      <p className="text-[9px] text-red-300">Ar</p>
                    </div>
                    <div className="bg-emerald-500/20 rounded-xl px-3 py-2 border border-emerald-400/40">
                      <p className="text-[9px] text-emerald-200 uppercase font-black tracking-widest">Gains</p>
                      <p className="text-base font-black tabular-nums text-emerald-300">+{(detail.summary?.totalGainValue || 0).toLocaleString('fr-FR')}</p>
                      <p className="text-[9px] text-emerald-300">Ar</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
                      <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest">Motif</p>
                      <p className="text-xs font-bold truncate">{detail.reason || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    Détail des ajustements ({detail.lines?.length || 0})
                  </h3>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Article</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Écart</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Valeur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(detail.lines || []).map((l: any, i: number) => (
                          <tr key={i} className={l.isLoss ? 'bg-red-50/40' : 'bg-emerald-50/40'}>
                            <td className="p-3">
                              <p className="font-bold text-slate-900 text-sm">{l.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{l.sku || '—'}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={'inline-flex items-center gap-1 font-black tabular-nums ' + (l.isLoss ? 'text-red-600' : 'text-emerald-600')}>
                                {l.isLoss ? '' : '+'}{l.quantity} <span className="text-xs">{l.unit}</span>
                              </span>
                            </td>
                            <td className={'p-3 text-right font-bold tabular-nums ' + (l.isLoss ? 'text-red-600' : 'text-emerald-600')}>
                              {l.isLoss ? '-' : '+'}{l.value.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-400">Ar</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
