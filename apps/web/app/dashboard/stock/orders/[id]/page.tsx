'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Modal, Button, FormField, Input, Textarea } from '../../../../../components/ui';

const STATUS_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Brouillon', color: '#64748b', bg: 'bg-slate-100',   text: 'text-slate-700' },
  SENT:      { label: 'Envoyee',   color: '#0891b2', bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  PARTIAL:   { label: 'Partielle', color: '#d97706', bg: 'bg-amber-100',   text: 'text-amber-700' },
  RECEIVED:  { label: 'Recue',     color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: 'Annulee',   color: '#dc2626', bg: 'bg-red-100',     text: 'text-red-700' },
};

function getStatusMeta(s: string) {
  return STATUS_META[s] || STATUS_META.DRAFT;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal édition
  const [showEdit, setShowEdit] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLines, setEditLines] = useState<{ stockItemId: string; quantity: string; unitCost: string }[]>([]);

  // Modal réception
  const [showReceive, setShowReceive] = useState(false);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');
  const [receiveMap, setReceiveMap] = useState<Record<string, string>>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [o, s, i, w] = await Promise.all([
      apiFetch(`/api/stock/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/suppliers', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    if (o.error || o.statusCode === 404) {
      router.push('/dashboard/stock/orders');
      return;
    }
    setOrder(o);
    setSuppliers(Array.isArray(s) ? s : []);
    setItems(Array.isArray(i) ? i : []);
    setWarehouses(Array.isArray(w) ? w : []);
    setReceiveWarehouseId(w.find((x: any) => x.isDefault)?.id || w[0]?.id || '');
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, [id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // ═══ ACTIONS ═══
  async function sendOrder() {
    if (!confirm('Envoyer cette commande au fournisseur ?')) return;
    await apiFetch(`/api/stock/orders/${id}/send`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    showToast('Commande envoyee');
    await load();
  }

  async function cancelOrder() {
    if (!confirm('Annuler cette commande ?')) return;
    await apiFetch(`/api/stock/orders/${id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    showToast('Commande annulee');
    await load();
  }

  async function deleteOrder() {
    if (!confirm('Supprimer definitivement cette commande ?')) return;
    await apiFetch(`/api/stock/orders/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    showToast('Commande supprimee');
    router.push('/dashboard/stock/orders');
  }

  // ═══ EDITION ═══
  function openEdit() {
    setEditSupplierId(order.supplierId);
    setEditExpectedDate(order.expectedDate ? order.expectedDate.slice(0, 10) : '');
    setEditNotes(order.notes || '');
    setEditLines(order.items.map((it: any) => ({
      stockItemId: it.stockItemId,
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
    })));
    setShowEdit(true);
  }

  function addEditLine() {
    setEditLines(prev => [...prev, { stockItemId: '', quantity: '', unitCost: '' }]);
  }
  function updateEditLine(idx: number, patch: any) {
    setEditLines(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }
  function removeEditLine(idx: number) {
    setEditLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveEdit() {
    setSaving(true);
    const res = await apiFetch(`/api/stock/orders/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedDate: editExpectedDate || null,
        notes: editNotes,
        items: editLines.filter(l => l.stockItemId && parseFloat(l.quantity) > 0),
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('Commande mise a jour');
      setShowEdit(false);
      await load();
    } else {
      const d = await res.json();
      showToast(d.message || 'Erreur');
    }
  }

  // ═══ RECEPTION ═══
  function openReceive() {
    const map: Record<string, string> = {};
    order.items.forEach((it: any) => {
      map[it.id] = String(it.quantity - (it.receivedQty || 0));
    });
    setReceiveMap(map);
    setShowReceive(true);
  }

  async function confirmReceive() {
    setSaving(true);
    const payload = {
      warehouseId: receiveWarehouseId,
      items: Object.entries(receiveMap)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([itemId, qty]) => ({ itemId, receivedQty: parseFloat(qty) })),
    };
    const res = await apiFetch(`/api/stock/orders/${id}/receive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      showToast('Reception enregistree, stock mis a jour');
      setShowReceive(false);
      await load();
    } else {
      const d = await res.json();
      showToast(d.message || 'Erreur');
    }
  }

  // ═══ IMPRESSION ═══
  function printPO() {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    const lines = order.items.map((it: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${it.stockItem?.name || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${it.quantity} ${it.stockItem?.unit || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${(it.unitCost || 0).toLocaleString('fr-FR')} Ar</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">${(it.total || 0).toLocaleString('fr-FR')} Ar</td>
      </tr>
    `).join('');

    win.document.write(`
      <html><head><title>Bon de commande ${order.reference}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
        .logo small { display: block; font-size: 10px; color: #64748b; letter-spacing: 2px; margin-top: 2px; }
        .ref { text-align: right; }
        .ref .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .ref .value { font-size: 20px; font-weight: 900; font-family: monospace; color: #0f172a; }
        h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .info-block { background: #f8fafc; padding: 12px 15px; border-radius: 8px; border-left: 3px solid #0f172a; }
        .info-block .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 4px; }
        .info-block .value { font-size: 14px; font-weight: bold; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #0f172a; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .total-box { background: #0f172a; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .total-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .total-box .amount { font-size: 24px; font-weight: 900; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; text-align: center; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
        .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; text-align: center; }
        .notes { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #78350f; }
        .banner { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; }
        .banner-commande { background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%); color: white; }
        .banner-icon { font-size: 32px; }
        .banner-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-bottom: 3px; }
        .banner-sub { font-size: 11px; opacity: 0.85; letter-spacing: 0.5px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1px; }
        .status-draft { background: #e2e8f0; color: #334155; }
        .status-sent { background: #cffafe; color: #0e7490; }
      </style></head><body>
        <div class="banner banner-commande">
          <div class="banner-icon">&#x1F4CB;</div>
          <div>
            <div class="banner-title">BON DE COMMANDE</div>
            <div class="banner-sub">Document a transmettre au fournisseur</div>
          </div>
        </div>

        <div class="header">
          <div>
            <div class="logo">NEXUS OS<small>COMMANDE FOURNISSEUR</small></div>
          </div>
          <div class="ref">
            <div class="label">Reference</div>
            <div class="value">${order.reference}</div>
            <div class="label" style="margin-top:6px">Date</div>
            <div style="font-size:12px;font-weight:bold">${fmtDate(order.createdAt)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <div class="label">Fournisseur</div>
            <div class="value">${order.supplier?.name || ''}</div>
            ${order.supplier?.contactName ? `<div style="font-size:11px;color:#475569;margin-top:2px">Contact : ${order.supplier.contactName}</div>` : ''}
            ${order.supplier?.phone ? `<div style="font-size:11px;color:#475569">Tel : ${order.supplier.phone}</div>` : ''}
            ${order.supplier?.email ? `<div style="font-size:11px;color:#475569">Email : ${order.supplier.email}</div>` : ''}
          </div>
          <div class="info-block">
            <div class="label">Livraison souhaitee</div>
            <div class="value">${order.expectedDate ? fmtDate(order.expectedDate) : 'Non precisee'}</div>
            ${order.supplier?.leadTimeDays ? `<div style="font-size:11px;color:#475569;margin-top:2px">Delai habituel : ${order.supplier.leadTimeDays} jours</div>` : ''}
          </div>
        </div>

        <h1>Articles commandes</h1>

        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th style="text-align:center">Quantite</th>
              <th style="text-align:right">Prix unitaire</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${lines}</tbody>
        </table>

        <div class="total-box">
          <div class="label">Total commande</div>
          <div class="amount">${order.totalAmount.toLocaleString('fr-FR')} Ar</div>
        </div>

        ${order.notes ? `<div class="notes" style="margin-top:20px"><strong>Notes :</strong> ${order.notes}</div>` : ''}

        <div class="signatures">
          <div class="sig-box">Signature fournisseur</div>
          <div class="sig-box">Signature acheteur</div>
        </div>

        <div class="footer">
          Document genere par NEXUS OS le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function printGRN() {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    const lines = order.items.map((it: any) => {
      const received = it.receivedQty || 0;
      const ordered = it.quantity;
      const gap = ordered - received;
      const hasGap = Math.abs(gap) > 0.001;
      const unit = it.stockItem?.unit || '';
      const name = it.stockItem?.name || '';
      const cost = (it.unitCost || 0).toLocaleString('fr-FR');
      const totalRec = (received * (it.unitCost || 0)).toLocaleString('fr-FR');
      const gapCell = hasGap
        ? '<span style="color:#dc2626;font-weight:bold">' + gap + '</span>'
        : '<span style="color:#059669;font-weight:bold">OK</span>';
      const cls = hasGap ? ' class="variation-row"' : '';
      return '<tr' + cls + '>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0">' + name + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">' + ordered + ' ' + unit + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold;color:#059669">' + received + ' ' + unit + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">' + gapCell + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">' + cost + ' Ar</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">' + totalRec + ' Ar</td>' +
        '</tr>';
    }).join('');

    const totalReceived = order.items.reduce((s: number, it: any) => s + (it.receivedQty || 0) * it.unitCost, 0);
    const totalGap = order.totalAmount - totalReceived;
    const statusBadge = order.status === 'PARTIAL' ? 'RECEPTION PARTIELLE' : 'RECEPTION COMPLETE';
    const statusCls = order.status === 'PARTIAL' ? 'status-partial' : 'status-full';
    const gapLine = totalGap > 0 ? '<div class="gap">Ecart vs commande : - ' + totalGap.toLocaleString('fr-FR') + ' Ar</div>' : '';
    const supName = order.supplier?.name || '';
    const supContact = order.supplier?.contactName ? '<div style="font-size:11px;color:#475569;margin-top:2px">Contact : ' + order.supplier.contactName + '</div>' : '';
    const supPhone = order.supplier?.phone ? '<div style="font-size:11px;color:#475569">Tel : ' + order.supplier.phone + '</div>' : '';
    const notesBlock = order.notes ? '<div class="notes" style="margin-top:20px"><strong>Notes :</strong> ' + order.notes + '</div>' : '';
    const receiveDate = order.receivedAt ? fmtDate(order.receivedAt) : fmtDate(new Date().toISOString());
    const now = new Date();

    win.document.write(
      '<html><head><title>Bon de reception ' + order.reference + '</title>' +
      '<style>' +
      '@page { size: A4; margin: 15mm; }' +
      'body { font-family: Arial, sans-serif; color: #0f172a; font-size: 13px; }' +
      '.banner { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; }' +
      '.banner-icon { font-size: 32px; }' +
      '.banner-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-bottom: 3px; }' +
      '.banner-sub { font-size: 11px; opacity: 0.85; letter-spacing: 0.5px; }' +
      '.header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }' +
      '.logo { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }' +
      '.logo small { display: block; font-size: 10px; color: #64748b; letter-spacing: 2px; margin-top: 2px; }' +
      '.ref { text-align: right; }' +
      '.ref .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }' +
      '.ref .value { font-size: 20px; font-weight: 900; font-family: monospace; color: #0f172a; }' +
      'h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0; }' +
      '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }' +
      '.info-block { background: #f0fdf4; padding: 12px 15px; border-radius: 8px; border-left: 3px solid #059669; }' +
      '.info-block .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 4px; }' +
      '.info-block .value { font-size: 14px; font-weight: bold; color: #0f172a; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
      'thead th { background: #059669; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }' +
      '.variation-row { background: #fef3c7; }' +
      '.total-box { background: #0f172a; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }' +
      '.total-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }' +
      '.total-box .amount { font-size: 24px; font-weight: 900; }' +
      '.total-box .gap { font-size: 12px; color: #fca5a5; margin-top: 4px; }' +
      '.notes { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #78350f; }' +
      '.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }' +
      '.sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; text-align: center; }' +
      '.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1px; }' +
      '.status-partial { background: #fef3c7; color: #78350f; }' +
      '.status-full { background: #d1fae5; color: #065f46; }' +
      '.footer-note { font-size: 10px; color: #64748b; text-align: center; margin-top: 20px; padding: 10px; border-top: 1px dashed #cbd5e1; }' +
      '</style></head><body>' +
      '<div class="banner">' +
      '<div class="banner-icon">&#x1F4E6;</div>' +
      '<div>' +
      '<div class="banner-title">BON DE RECEPTION</div>' +
      '<div class="banner-sub">Document de livraison signe a la remise des marchandises</div>' +
      '</div>' +
      '</div>' +
      '<div class="header">' +
      '<div><div class="logo">NEXUS OS<small>RECEPTION MARCHANDISES</small></div></div>' +
      '<div class="ref">' +
      '<div class="label">Reference commande</div>' +
      '<div class="value">' + order.reference + '</div>' +
      '<div class="label" style="margin-top:6px">Date de reception</div>' +
      '<div style="font-size:12px;font-weight:bold">' + receiveDate + '</div>' +
      '</div></div>' +
      '<div class="info-grid">' +
      '<div class="info-block">' +
      '<div class="label">Fournisseur livreur</div>' +
      '<div class="value">' + supName + '</div>' +
      supContact + supPhone +
      '</div>' +
      '<div class="info-block">' +
      '<div class="label">Statut de la commande</div>' +
      '<div style="margin-top:4px"><span class="status-badge ' + statusCls + '">' + statusBadge + '</span></div>' +
      '</div>' +
      '</div>' +
      '<h1>Detail des marchandises recues</h1>' +
      '<table><thead><tr>' +
      '<th>Article</th>' +
      '<th style="text-align:center">Qte commandee</th>' +
      '<th style="text-align:center">Qte recue</th>' +
      '<th style="text-align:center">Ecart</th>' +
      '<th style="text-align:right">P.U.</th>' +
      '<th style="text-align:right">Total recu</th>' +
      '</tr></thead><tbody>' + lines + '</tbody></table>' +
      '<div class="total-box">' +
      '<div><div class="label">Total facture (recu)</div>' + gapLine + '</div>' +
      '<div class="amount">' + totalReceived.toLocaleString('fr-FR') + ' Ar</div>' +
      '</div>' +
      notesBlock +
      '<div style="background:#f0fdf4;border:2px solid #059669;border-radius:10px;padding:15px;margin-top:20px">' +
      '<p style="font-size:11px;color:#065f46;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Verification obligatoire a la livraison</p>' +
      '<ul style="font-size:11px;color:#0f172a;margin:0;padding-left:20px;line-height:1.8">' +
      '<li>Verifier chaque article physiquement (quantite et qualite)</li>' +
      '<li>Signaler tout ecart, casse ou marchandise non conforme</li>' +
      '<li>Faire signer le livreur en presence du responsable reception</li>' +
      '<li>Conserver ce bon pour rapprochement avec la facture fournisseur</li>' +
      '</ul></div>' +
      '<div class="signatures">' +
      '<div class="sig-box">Nom et signature du livreur</div>' +
      '<div class="sig-box">Nom et signature du responsable reception</div>' +
      '</div>' +
      '<div class="footer-note">' +
      'Document "Bon de reception" - fait foi pour la marchandise reellement livree<br>' +
      'Genere par NEXUS OS le ' + now.toLocaleDateString('fr-FR') + ' a ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
      '</div>' +
      '</body></html>'
    );
    win.document.close();
    setTimeout(() => win.print(), 400);
  }



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) return null;

  const sm = getStatusMeta(order.status);
  const isDraft = order.status === 'DRAFT';
  const isSent = order.status === 'SENT' || order.status === 'PARTIAL';
  const totalReceived = order.items.reduce((s: number, it: any) => s + (it.receivedQty || 0) * it.unitCost, 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm">
        <a href="/dashboard/stock/orders" className="text-slate-500 hover:text-teal-600">Commandes</a>
        <span className="text-slate-300">›</span>
        <span className="font-mono font-bold text-slate-900">{order.reference}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0"
            style={{ background: sm.color }}
          >
            {order.supplier?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-slate-900 font-mono">{order.reference}</h1>
              <span className={'text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md ' + sm.bg + ' ' + sm.text}>
                {sm.label.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-700">{order.supplier?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Cree le {fmtDateTime(order.createdAt)}
              {order.createdBy && ` par ${order.createdBy.name || order.createdBy.email}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total commande</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{order.totalAmount.toLocaleString('fr-FR')} <span className="text-sm">Ar</span></p>
            {order.status === 'PARTIAL' && (
              <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                {totalReceived.toLocaleString('fr-FR')} Ar recus
              </p>
            )}
          </div>
        </div>

        {/* Timeline statut */}
        <div className="px-6 py-4 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <TimelineStep label="Cree" date={order.createdAt} done />
          <div className="w-6 h-0.5 bg-slate-300"></div>
          <TimelineStep label="Envoye" date={isDraft ? null : order.updatedAt} done={!isDraft} />
          <div className="w-6 h-0.5 bg-slate-300"></div>
          <TimelineStep
            label={order.status === 'PARTIAL' ? 'Reception partielle' : 'Recu'}
            date={order.receivedAt}
            done={order.status === 'RECEIVED' || order.status === 'PARTIAL'}
          />
        </div>
      </div>

      {/* Meta infos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Fournisseur</p>
          <p className="font-bold text-slate-900">{order.supplier?.name || '—'}</p>
          {order.supplier?.phone && <p className="text-xs text-slate-500 mt-0.5">{order.supplier.phone}</p>}
          {order.supplier?.email && <p className="text-xs text-slate-500">{order.supplier.email}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Date prevue</p>
          <p className="font-bold text-slate-900">{order.expectedDate ? fmtDate(order.expectedDate) : 'Non precisee'}</p>
          {order.supplier?.leadTimeDays != null && (
            <p className="text-xs text-slate-500 mt-0.5">Delai : {order.supplier.leadTimeDays}j</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Articles</p>
          <p className="font-bold text-slate-900">{order.items.length} ligne{order.items.length > 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.items.reduce((s: number, it: any) => s + it.quantity, 0)} unites totales
          </p>
        </div>
      </div>

      {/* Tableau articles */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Articles commandes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Qte commandee</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Qte recue</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">P.U.</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it: any) => {
                const fullReceived = it.receivedQty >= it.quantity;
                return (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{it.stockItem?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {it.stockItem?.sku || '—'} · stock actuel {it.stockItem?.currentStock} {it.stockItem?.unit}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900 tabular-nums">
                      {it.quantity} <span className="text-xs text-slate-400">{it.stockItem?.unit}</span>
                    </td>
                    <td className="p-3 text-center tabular-nums">
                      {it.receivedQty > 0 ? (
                        <span className={'font-black ' + (fullReceived ? 'text-emerald-600' : 'text-amber-600')}>
                          {it.receivedQty} <span className="text-xs">{it.stockItem?.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-700">
                      {it.unitCost.toLocaleString('fr-FR')} Ar
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                      {it.total.toLocaleString('fr-FR')} Ar
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="p-3 text-right font-black text-slate-700 text-sm uppercase tracking-wider">
                  Total general
                </td>
                <td className="p-3 text-right font-black text-slate-900 text-lg tabular-nums">
                  {order.totalAmount.toLocaleString('fr-FR')} Ar
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-1">Notes</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <button
          onClick={printPO}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition inline-flex items-center gap-2"
          title="Bon de commande (avant livraison)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Bon de commande
        </button>

        {(order.status === 'RECEIVED' || order.status === 'PARTIAL') && (
          <button
            onClick={printGRN}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition inline-flex items-center gap-2"
            title="Bon de reception (apres livraison)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Bon de reception
          </button>
        )}

        {isDraft && (
          <>
            <button
              onClick={openEdit}
              className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition"
            >
              Modifier
            </button>
            <button
              onClick={sendOrder}
              className="px-4 py-2.5 bg-cyan-500 text-white rounded-xl font-black text-sm hover:bg-cyan-600 transition"
            >
              Envoyer au fournisseur
            </button>
          </>
        )}

        {isSent && (
          <button
            onClick={openReceive}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-600 transition"
          >
            Receptionner
          </button>
        )}

        <div className="ml-auto flex gap-2">
          {!['RECEIVED', 'CANCELLED'].includes(order.status) && (
            <button
              onClick={cancelOrder}
              className="px-4 py-2.5 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition"
            >
              Annuler
            </button>
          )}
          {['DRAFT', 'CANCELLED'].includes(order.status) && (
            <button
              onClick={deleteOrder}
              className="px-4 py-2.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl font-bold text-sm hover:bg-red-100 transition"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* ══════ MODAL EDITION ══════ */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Modifier la commande"
        subtitle={order.reference}
        icon={<span className="text-2xl font-bold">✎</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Annuler</Button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fournisseur" hint="Non modifiable">
              <Input type="text" value={order.supplier?.name || ''} disabled className="bg-slate-100 cursor-not-allowed" />
            </FormField>
            <FormField label="Date prevue">
              <Input type="date" value={editExpectedDate} onChange={e => setEditExpectedDate(e.target.value)} />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Articles</label>
              <button type="button" onClick={addEditLine} className="text-xs font-bold text-teal-600 hover:underline">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {editLines.map((line, idx) => {
                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0);
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={line.stockItemId}
                        onChange={e => {
                          const it = items.find((x: any) => x.id === e.target.value);
                          updateEditLine(idx, { stockItemId: e.target.value, unitCost: it?.costPrice?.toString() || '' });
                        }}
                        className="col-span-6 px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold"
                      >
                        <option value="">- Choisir -</option>
                        {items.map((i: any) => (
                          <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number" step="0.01" value={line.quantity}
                        onChange={e => updateEditLine(idx, { quantity: e.target.value })}
                        placeholder="0"
                        className="col-span-2 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-center tabular-nums"
                      />
                      <input
                        type="number" value={line.unitCost}
                        onChange={e => updateEditLine(idx, { unitCost: e.target.value })}
                        placeholder="0"
                        className="col-span-3 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-right tabular-nums"
                      />
                      <button type="button" onClick={() => removeEditLine(idx)} className="col-span-1 text-red-500 hover:bg-red-100 rounded-lg font-black text-lg transition">×</button>
                    </div>
                    {lineTotal > 0 && (
                      <p className="text-[10px] text-right mt-1 text-slate-500">
                        Sous-total : <span className="font-black text-slate-900">{lineTotal.toLocaleString('fr-FR')} Ar</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <FormField label="Notes">
            <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
          </FormField>
        </div>
      </Modal>

      {/* ══════ MODAL RECEPTION ══════ */}
      <Modal
        open={showReceive}
        onClose={() => setShowReceive(false)}
        title="Receptionner la commande"
        subtitle={order.reference + ' · ' + (order.supplier?.name || '')}
        icon={<span className="text-2xl font-bold">↓</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowReceive(false)}>Annuler</Button>
            <button
              onClick={confirmReceive}
              disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving ? 'Reception...' : 'Confirmer la reception'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Magasin de reception">
            <select
              value={receiveWarehouseId}
              onChange={e => setReceiveWarehouseId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </FormField>

          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Quantites recues</p>
            <div className="space-y-2">
              {order.items.map((it: any) => {
                const remaining = it.quantity - (it.receivedQty || 0);
                return (
                  <div key={it.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{it.stockItem?.name}</p>
                      <p className="text-[10px] text-slate-500">
                        Commande : {it.quantity} {it.stockItem?.unit}
                        {it.receivedQty > 0 && ` · deja recu ${it.receivedQty}`}
                      </p>
                    </div>
                    <input
                      type="number" step="0.01"
                      value={receiveMap[it.id] || ''}
                      onChange={e => setReceiveMap(m => ({ ...m, [it.id]: e.target.value }))}
                      placeholder={String(remaining)}
                      className="w-28 px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-black text-slate-900 text-center tabular-nums focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <span className="text-xs font-bold text-slate-500 w-12 text-right">{it.stockItem?.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sous-composant Timeline ───
function TimelineStep({ label, date, done }: { label: string; date: string | null; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={'w-3 h-3 rounded-full shrink-0 ' + (done ? 'bg-emerald-500' : 'bg-slate-300')}></div>
      <div>
        <p className={'text-xs font-black ' + (done ? 'text-slate-900' : 'text-slate-400')}>{label}</p>
        <p className="text-[10px] text-slate-400">{date ? fmtDateTime(date) : 'En attente'}</p>
      </div>
    </div>
  );
}
