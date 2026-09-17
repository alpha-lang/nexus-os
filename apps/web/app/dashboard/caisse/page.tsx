'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import type { ReactNode } from 'react';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';

const CATEGORIES: Record<string, { label: string; tile: string }> = {
  RESTAURANT_ENTREE:  { label: 'Entrées',   tile: 'bg-linear-to-br from-lime-500 to-green-600' },
  RESTAURANT_PLAT:    { label: 'Plats',     tile: 'bg-linear-to-br from-orange-500 to-red-500' },
  RESTAURANT_DESSERT: { label: 'Desserts',  tile: 'bg-linear-to-br from-pink-400 to-fuchsia-500' },
  RESTAURANT_BOISSON: { label: 'Boissons',  tile: 'bg-linear-to-br from-blue-500 to-cyan-500' },
  MINIBAR:            { label: 'Minibar',   tile: 'bg-linear-to-br from-indigo-500 to-purple-600' },
  SPA:                { label: 'Spa',       tile: 'bg-linear-to-br from-teal-500 to-emerald-500' },
  BOUTIQUE:           { label: 'Boutique',  tile: 'bg-linear-to-br from-pink-500 to-rose-500' },
  SERVICE:            { label: 'Services',  tile: 'bg-linear-to-br from-slate-500 to-slate-700' },
  OTHER:              { label: 'Autres',    tile: 'bg-linear-to-br from-slate-400 to-slate-600' },
};

function CategoryIcon({ category, className = 'w-5 h-5' }: { category: string; className?: string }) {
  const icons: Record<string, ReactNode> = {
    RESTAURANT_ENTREE: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
    RESTAURANT_PLAT: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>),
    RESTAURANT_DESSERT: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0A2.702 2.702 0 014.5 16c-.454-.303-.977-.454-1.5-.454M12 3v3m-4.5 6c0-1.5 1.5-3 3-3s3 1.5 3 3" /></svg>),
    RESTAURANT_BOISSON: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3h14l-1 10a5 5 0 01-5 4h-2a5 5 0 01-5-4L5 3zm5 14v4h4v-4M8 8h8" /></svg>),
    MINIBAR: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>),
    SPA: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>),
    BOUTIQUE: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>),
    SERVICE: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
    OTHER: (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
  };
  return <>{icons[category] || icons.OTHER}</>;
}

const ORDER_STATUS: Record<string, { label: string; variant: any }> = {
  PENDING:   { label: 'À envoyer', variant: 'warning' },
  PREPARING: { label: 'En cuisine', variant: 'info' },
  SERVED:    { label: 'Servi',      variant: 'success' },
  PAID:      { label: 'Payé',       variant: 'neutral' },
  CANCELLED: { label: 'Annulé',     variant: 'danger' },
};

const SERVICE_TYPES = [
  { id: 'DINE_IN'  as const, label: 'Sur place',  desc: 'Choisir une table', gradient: 'from-orange-500 to-red-500',  icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z' },
  { id: 'ROOM'     as const, label: 'En chambre', desc: 'Client en séjour',  gradient: 'from-amber-500 to-orange-500', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'TAKEAWAY' as const, label: 'Comptoir',   desc: 'À emporter',        gradient: 'from-blue-500 to-cyan-500',    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
];

const PAYMENT_METHODS = [
  { id: 'CASH',        label: 'Espèces',       sublabel: 'Cash',           bg: 'bg-linear-to-br from-green-500 to-emerald-600',  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { id: 'CARD',        label: 'Carte',         sublabel: 'Visa / Master',  bg: 'bg-linear-to-br from-blue-500 to-indigo-600',    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { id: 'MOBILE',      label: 'Mobile Money',  sublabel: 'MVola / Orange', bg: 'bg-linear-to-br from-purple-500 to-pink-600',    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { id: 'ROOM_CHARGE', label: 'En chambre',    sublabel: 'Folio client',   bg: 'bg-linear-to-br from-amber-500 to-orange-600',   icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { id: 'CREDIT',      label: 'À crédit',      sublabel: 'Ardoise',        bg: 'bg-linear-to-br from-slate-500 to-slate-700',    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg> },
];

export default function CaissePage() {
  const [tab, setTab] = useState<'active' | 'new' | 'history' | 'menu'>('active');
  const [menu, setMenu] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [histSearch, setHistSearch] = useState('');
  const [histPreset, setHistPreset] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [histStatus, setHistStatus] = useState<string>('ALL');
  const [histMode, setHistMode] = useState<string>('ALL');
  const [histSort, setHistSort] = useState<'recent' | 'old' | 'amount-desc' | 'amount-asc'>('recent');
  const [stats, setStats] = useState<any>(null);
  const [foliosCount, setFoliosCount] = useState(0);
  const [creditsCount, setCreditsCount] = useState(0);
  const [roomReservations, setRoomReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewFlow, setShowNewFlow] = useState(false);
  const [newStep, setNewStep] = useState<'type' | 'table' | 'room' | 'cart'>('type');
  const [newServiceType, setNewServiceType] = useState<'DINE_IN' | 'ROOM' | 'TAKEAWAY' | null>(null);
  const [newTable, setNewTable] = useState<any>(null);
  const [newReservation, setNewReservation] = useState<any>(null);
  const [newCart, setNewCart] = useState<{ menuItem: any; quantity: number }[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [showAddItems, setShowAddItems] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [menuItemToDelete, setMenuItemToDelete] = useState<any>(null);
  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState('');
  const [mCategory, setMCategory] = useState('RESTAURANT_PLAT');
  const [mDescription, setMDescription] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('RESTAURANT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [m, t, o, h, st, r, foliosRes, creditsRes] = await Promise.all([
      apiFetch('/api/pos/menu', { headers }).then(r => r.json()),
      apiFetch('/api/pos/tables', { headers }).then(r => r.json()),
      apiFetch('/api/pos/orders/active', { headers }).then(r => r.json()),
      apiFetch('/api/pos/orders', { headers }).then(r => r.json()),
      apiFetch('/api/pos/stats', { headers }).then(r => r.json()),
      apiFetch('/api/hotel/reservations?status=CHECKED_IN', { headers }).then(r => r.json()),
      apiFetch('/api/pos/folios', { headers }).then(r => r.json()),
      apiFetch('/api/pos/credits', { headers }).then(r => r.json()),
    ]);
    setMenu(Array.isArray(m) ? m : []);
    setTables(Array.isArray(t) ? t : []);
    setActiveOrders(Array.isArray(o) ? o : []);
    setHistoryOrders(Array.isArray(h) ? h : []);
    setStats(st);
    setRoomReservations(Array.isArray(r) ? r : []);
    setFoliosCount(Array.isArray(foliosRes) ? foliosRes.length : 0);
    setCreditsCount(Array.isArray(creditsRes) ? creditsRes.length : 0);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const i = setInterval(() => load().catch(console.error), 20000);
    return () => clearInterval(i);
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function startNewFlow() {
    setNewStep('type'); setNewServiceType(null); setNewTable(null);
    setNewReservation(null); setNewCart([]); setNewNotes('');
    setShowNewFlow(true);
  }

  function pickServiceType(type: any) {
    setNewServiceType(type);
    if (type === 'DINE_IN') setNewStep('table');
    else if (type === 'ROOM') setNewStep('room');
    else setNewStep('cart');
  }

  function pickTable(t: any) { setNewTable(t); setNewStep('cart'); }
  function pickRoom(r: any) { setNewReservation(r); setNewStep('cart'); }

  function addToNewCart(item: any) {
    setLastAdded(item.id);
    setTimeout(() => setLastAdded(null), 500);
    setNewCart(prev => {
      const ex = prev.find(x => (x.menuItem?.id || '') === item.id);
      if (ex) return prev.map(x => (x.menuItem?.id || '') === item.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function updateNewQty(id: string, qty: number) {
    if (qty <= 0) return setNewCart(p => p.filter(x => (x.menuItem?.id || '') !== id));
    setNewCart(p => p.map(x => (x.menuItem?.id || '') === id ? { ...x, quantity: qty } : x));
  }

  const newTotal = newCart.reduce((s, x) => s + (x.menuItem?.price || 0) * x.quantity, 0);
  const newItemCount = newCart.reduce((s, x) => s + x.quantity, 0);

  async function saveNewOrder() {
    if (newCart.length === 0) return;
    setError(null); setSaving(true);
    const res = await apiFetch('/api/pos/orders', {
      method: 'POST', headers,
      body: JSON.stringify({
        serviceType: newServiceType,
        tableId: newServiceType === 'DINE_IN' ? newTable?.id : null,
        reservationId: newServiceType === 'ROOM' ? newReservation?.id : null,
        roomNumber: newServiceType === 'ROOM' ? newReservation?.room?.number : null,
        notes: newNotes,
        items: newCart.map(x => ({ menuItemId: (x.menuItem?.id || ''), quantity: x.quantity })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const order = await res.json();
      showToast(`Commande #${order.id.slice(-4).toUpperCase()} créée`);
      setShowNewFlow(false);
      await load();
      printTicket(order, newTable, newReservation);
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  function printTicket(order: any, table: any, reservation: any) {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const orderId = order.id.slice(-4).toUpperCase();
    const now = new Date();
    const lines = order.items.map((it: any) => `<tr><td style="padding:3px 0">${(it.quantity || 0)}x</td><td style="padding:3px 0">${(it.menuItem?.name || 'Article')}</td><td style="text-align:right;padding:3px 0">${(it.unitPrice * (it.quantity || 0)).toLocaleString('fr-FR')}</td></tr>`).join('');
    win.document.write(`<html><head><title>Bon #${orderId}</title><style>
      @page{size:80mm auto;margin:5mm}
      body{font-family:'Courier New',monospace;font-size:12px;width:72mm;color:#000}
      h1{text-align:center;font-size:16px;margin:5px 0;border-bottom:2px dashed #000;padding-bottom:8px}
      .info{margin:3px 0;font-size:11px}
      .info b{font-size:14px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      th{text-align:left;border-bottom:1px dashed #000;padding:4px 0;font-size:11px}
      .total{border-top:2px solid #000;margin-top:8px;padding-top:8px;text-align:right;font-size:16px;font-weight:bold}
      .footer{text-align:center;margin-top:15px;font-size:10px;color:#666;border-top:1px dashed #000;padding-top:5px}
    </style></head><body>
      <h1>BON DE COMMANDE</h1>
      <div class="info"><b>#${orderId}</b></div>
      <div class="info">${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
      ${table?`<div class="info"><b>TABLE ${table.number}</b></div>`:''}
      ${reservation?`<div class="info"><b>CHAMBRE ${reservation.room?.number}</b></div>`:''}
      ${!table&&!reservation?'<div class="info"><b>A EMPORTER</b></div>':''}
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0">
      <table><thead><tr><th>Qte</th><th>Article</th><th style="text-align:right">Prix</th></tr></thead><tbody>${lines}</tbody></table>
      ${order.notes?`<div style="margin:8px 0;padding:5px;background:#f5f5f5;font-style:italic">Note: ${order.notes}</div>`:''}
      <div class="total">TOTAL : ${order.total.toLocaleString('fr-FR')} Ar</div>
      <div class="footer">Merci<br>NEXUS OS</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function printReceipt(order: any, table: any, reservation: any) {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const orderId = order.id.slice(-4).toUpperCase();
    const now = new Date();
    const items = order.items.map((it: any) =>
      `<tr><td style="padding:3px 0">${(it.quantity || 0)}x</td><td style="padding:3px 0">${(it.menuItem?.name || 'Article')}</td><td style="text-align:right;padding:3px 0">${(it.unitPrice * (it.quantity || 0)).toLocaleString('fr-FR')}</td></tr>`
    ).join('');
    const total = order.total || 0;
    const paid = order.paidAmount || 0;
    const remaining = total - paid;
    const method = getOrderPaymentMode(order);
    const methodLabel: Record<string, string> = {
      CASH: 'Especes',
      CARD: 'Carte bancaire',
      MOBILE: 'Mobile Money',
      ROOM_CHARGE: 'Chambre (folio)',
      CREDIT: 'Credit',
    };
    const lastPayment = order.payments && order.payments.length > 0
      ? order.payments[order.payments.length - 1]
      : null;
    const payDate = lastPayment?.createdAt ? new Date(lastPayment.createdAt) : now;

    win.document.write(`<html><head><title>Recu #${orderId}</title><style>
      @page{size:80mm auto;margin:5mm}
      body{font-family:'Courier New',monospace;font-size:12px;width:72mm;color:#000}
      h1{text-align:center;font-size:16px;margin:5px 0;border-bottom:2px solid #000;padding-bottom:8px}
      .recu{text-align:center;font-size:13px;font-weight:bold;background:#000;color:#fff;padding:4px 0;margin:6px 0;letter-spacing:2px}
      .info{margin:3px 0;font-size:11px}
      .info b{font-size:14px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      th{text-align:left;border-bottom:1px dashed #000;padding:4px 0;font-size:11px}
      .total{border-top:2px solid #000;margin-top:8px;padding-top:8px;text-align:right;font-size:16px;font-weight:bold}
      .pay{border-top:1px dashed #000;margin-top:8px;padding-top:8px;font-size:12px}
      .pay .row{display:flex;justify-content:space-between;margin:4px 0}
      .remaining{color:#c00;font-weight:bold}
      .paid{color:#060;font-weight:bold;font-size:14px;text-align:center;padding:6px 0;border:2px solid #060;margin-top:8px}
      .footer{text-align:center;margin-top:15px;font-size:10px;color:#666;border-top:1px dashed #000;padding-top:5px}
    </style></head><body>
      <h1>RECU</h1>
      <div class="recu">PAIEMENT ENREGISTRE</div>
      <div class="info"><b>#${orderId}</b></div>
      <div class="info">Emis le ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
      ${table ? `<div class="info"><b>TABLE ${table.number}</b></div>` : ''}
      ${reservation ? `<div class="info"><b>CHAMBRE ${reservation.room?.number}</b></div>` : ''}
      ${!table && !reservation ? '<div class="info"><b>A EMPORTER</b></div>' : ''}
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0">
      <table>
        <thead><tr><th>Qte</th><th>Article</th><th style="text-align:right">Prix</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="total">TOTAL : ${total.toLocaleString('fr-FR')} Ar</div>
      <div class="pay">
        <div class="row"><span>Mode de paiement</span><b>${methodLabel[method] || method}</b></div>
        <div class="row"><span>Paye le</span><b>${payDate.toLocaleDateString('fr-FR')} ${payDate.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</b></div>
        <div class="row"><span>Montant paye</span><b>${paid.toLocaleString('fr-FR')} Ar</b></div>
        ${remaining > 0 ? `<div class="row remaining"><span>Reste a payer</span><b>${remaining.toLocaleString('fr-FR')} Ar</b></div>` : ''}
      </div>
      ${order.paymentStatus === 'PAID' && paid >= total ? '<div class="paid">SOLDÉ — PAYÉ</div>' : ''}
      ${lastPayment?.notes ? `<div style="margin-top:8px;font-size:10px;font-style:italic;color:#555">Note : ${lastPayment.notes}</div>` : ''}
      <div class="footer">Merci de votre visite<br>NEXUS OS</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }


  function openOrder(order: any) {
    setSelectedOrder(order);
    setShowPayModal(false);
    setShowAddItems(false);
    setPayMethod('CASH');
    setPayAmount('');
    setPaymentNotes('');
  }

  async function payOrderNow(amount: number) {
    if (!selectedOrder) return;

    // Récupérer le reste réel dû
    const remain = (selectedOrder.total || 0) - (selectedOrder.paidAmount || 0);

    // Cas spécial : CREDIT
    if (payMethod === 'CREDIT') {
      const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}/credit`, {
        method: 'POST', headers,
        body: JSON.stringify({ notes: paymentNotes }),
      });
      if (res.ok) {
        showToast('Commande enregistree a credit');
        setShowPayModal(false);
        setSelectedOrder(null);
        setPaymentNotes('');
        await load();
      } else {
        const d = await res.json();
        showToast(d.message || 'Erreur');
      }
      return;
    }

    // Cas spécial : ROOM_CHARGE
    if (payMethod === 'ROOM_CHARGE') {
      if (!selectedOrder.reservationId) {
        showToast('Aucune chambre rattachee');
        return;
      }
      const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}/defer`, {
        method: 'POST', headers,
        body: JSON.stringify({ reservationId: selectedOrder.reservationId }),
      });
      if (res.ok) {
        showToast('Commande reportee au folio');
        setShowPayModal(false);
        setSelectedOrder(null);
        await load();
      } else {
        const d = await res.json();
        showToast(d.message || 'Erreur');
      }
      return;
    }

    // CASH / CARD / MOBILE
    let amountToPay = amount;

    if (payMethod === 'CASH') {
      // Le montant reçu peut être > remain (avec monnaie)
      // On envoie le montant réellement dû
      const received = parseFloat(payAmount) || 0;
      if (received < remain) {
        showToast(`Manque ${(remain - received).toLocaleString('fr-FR')} Ar`);
        return;
      }
      amountToPay = remain;
    }

    if (!amountToPay || amountToPay <= 0) {
      showToast('Montant invalide');
      return;
    }

    const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}/pay`, {
      method: 'POST', headers,
      body: JSON.stringify({ amount: amountToPay, method: payMethod, notes: paymentNotes }),
    });

    if (res.ok) {
      const updated = await res.json();
      showToast(updated.paymentStatus === 'PAID' ? 'Commande encaissee' : 'Paiement partiel enregistre');
      setPayAmount(''); setShowPayModal(false); setPaymentNotes('');
      await load();
      if (updated.paymentStatus === 'PAID') {
        printReceipt(updated, updated.table, updated.reservation);
        setSelectedOrder(null);
      }
    } else {
      const d = await res.json();
      showToast(d.message || 'Erreur');
    }
  }

  async function sendToKitchen(orderId: string) {
    await apiFetch(`/api/pos/orders/${orderId}/kitchen`, { method: 'PATCH', headers });
    showToast('Envoyé en cuisine');
    await load(); setSelectedOrder(null);
  }

  async function cancelOrder(orderId: string) {
    if (!confirm('Annuler cette commande ?')) return;
    await apiFetch(`/api/pos/orders/${orderId}/cancel`, { method: 'PATCH', headers, body: JSON.stringify({}) });
    showToast('Commande annulée');
    await load(); setSelectedOrder(null);
  }

  async function updateItemQty(itemId: string, qty: number) {
    await apiFetch(`/api/pos/orders/items/${itemId}`, { method: 'PATCH', headers, body: JSON.stringify({ quantity: qty }) });
    const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}`, { headers });
    setSelectedOrder(await res.json()); await load();
  }

  async function removeItem(itemId: string) {
    await apiFetch(`/api/pos/orders/items/${itemId}`, { method: 'DELETE', headers });
    const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}`, { headers });
    setSelectedOrder(await res.json()); await load();
  }

  async function addItemsToSelected() {
    if (newCart.length === 0) return;
    await apiFetch(`/api/pos/orders/${selectedOrder.id}/items`, {
      method: 'POST', headers,
      body: JSON.stringify({ items: newCart.map(x => ({ menuItemId: (x.menuItem?.id || ''), quantity: x.quantity })) }),
    });
    setNewCart([]); setShowAddItems(false);
    const res = await apiFetch(`/api/pos/orders/${selectedOrder.id}`, { headers });
    setSelectedOrder(await res.json());
    showToast('Articles ajoutés'); await load();
  }

  function openMenuModal(item?: any) {
    if (item) {
      setEditingMenuItem(item);
      setMName(item.name); setMPrice(item.price.toString());
      setMCategory(item.category || 'RESTAURANT_PLAT'); setMDescription(item.description || '');
    } else {
      setEditingMenuItem(null);
      setMName(''); setMPrice(''); setMCategory('RESTAURANT_PLAT'); setMDescription('');
    }
    setShowMenuModal(true);
  }

  async function saveMenuItem(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const method = editingMenuItem ? 'PATCH' : 'POST';
    const url = editingMenuItem ? `/api/pos/menu/${editingMenuItem.id}` : '/api/pos/menu';
    const res = await apiFetch(url, { method, headers, body: JSON.stringify({ name: mName, price: parseFloat(mPrice) || 0, category: mCategory, description: mDescription }) });
    setSaving(false);
    if (res.ok) { setShowMenuModal(false); setEditingMenuItem(null); await load(); }
  }

  async function deleteMenuItem() {
    if (!menuItemToDelete) return;
    await apiFetch(`/api/pos/menu/${menuItemToDelete.id}`, { method: 'DELETE', headers });
    setMenuItemToDelete(null); await load();
  }

  const filteredMenu = useMemo(() => {
    let list = menu.filter(m => m.isAvailable);
    if (categoryFilter) list = list.filter(m => m.category === categoryFilter);
    if (search) list = list.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [menu, categoryFilter, search]);

  // Détecte le mode de paiement d'une commande
  function getOrderPaymentMode(o: any): string {
    // 1. Dernier OrderPayment
    if (o.payments && o.payments.length > 0) {
      const last = o.payments[o.payments.length - 1];
      if (last?.method) return last.method;
    }
    // 2. Note CREDIT
    if (o.notes?.includes('CREDIT')) return 'CREDIT';
    // 3. Note ROOM_CHARGE / folio
    if (o.notes?.includes('ROOM_CHARGE') || o.notes?.includes('folio')) return 'ROOM_CHARGE';
    // 4. Fallback : si payé
    if (o.paymentStatus === 'PAID') return 'CASH';
    return '—';
  }

  // Labels colorés par mode
  const MODE_META: Record<string, { label: string; bg: string; color: string }> = {
    CASH:        { label: 'Espèces',      bg: 'bg-green-100',  color: 'text-green-800' },
    CARD:        { label: 'Carte',        bg: 'bg-blue-100',   color: 'text-blue-800' },
    MOBILE:      { label: 'Mobile',       bg: 'bg-purple-100', color: 'text-purple-800' },
    ROOM_CHARGE: { label: 'Chambre',      bg: 'bg-amber-100',  color: 'text-amber-800' },
    CREDIT:      { label: 'Crédit',       bg: 'bg-orange-100', color: 'text-orange-800' },
    '—':         { label: '—',            bg: 'bg-slate-100',  color: 'text-slate-600' },
  };

  // ─── Filtre historique caisse ───
  const histFiltered = (() => {
    let list = [...historyOrders];

    // Preset date
    if (histPreset !== 'all') {
      const now = Date.now();
      const conf = histPreset === 'today' ? 86400000 : histPreset === 'week' ? 7 * 86400000 : 30 * 86400000;
      const from = now - conf;
      list = list.filter(o => new Date(o.createdAt).getTime() >= from);
    }

    // Statut
    if (histStatus !== 'ALL') list = list.filter(o => o.paymentStatus === histStatus);

    // Mode paiement
    if (histMode !== 'ALL') list = list.filter(o => getOrderPaymentMode(o) === histMode);

    // Recherche
    if (histSearch.trim()) {
      const q = histSearch.toLowerCase();
      list = list.filter(o => {
        const id = o.id.slice(-4).toLowerCase();
        const table = (o.table?.number || '').toLowerCase();
        const room = (o.roomNumber || '').toLowerCase();
        const items = (o.items || []).map((it: any) => (it.menuItem?.name || '').toLowerCase()).join(' ');
        return id.includes(q) || table.includes(q) || room.includes(q) || items.includes(q);
      });
    }

    // Tri
    list.sort((a, b) => {
      if (histSort === 'amount-desc') return (b.total || 0) - (a.total || 0);
      if (histSort === 'amount-asc') return (a.total || 0) - (b.total || 0);
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return histSort === 'old' ? da - db : db - da;
    });

    return list;
  })();

  const histTotals = histFiltered.reduce(
    (acc, o) => {
      acc.ca += o.total || 0;
      acc.paid += o.paidAmount || 0;
      acc.count += 1;
      return acc;
    },
    { ca: 0, paid: 0, count: 0 }
  );
  const histAvg = histTotals.count > 0 ? Math.round(histTotals.ca / histTotals.count) : 0;

  const pagHist = usePagination(histFiltered, { perPageDefault: 20 });

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;

  const remaining = selectedOrder ? ((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0)) : 0;
  const change = parseFloat(payAmount) - remaining;

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div className="bg-linear-to-r from-slate-900 via-blue-900 to-teal-900 rounded-2xl px-4 py-3 text-white shadow-lg flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Caisse</h1>
            <p className="text-[10px] text-blue-200 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/caisse/prix" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
            Prix
          </a>
          <a href="/dashboard/caisse/folios" className="relative inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
            Folios
            {foliosCount > 0 && (
              <span className="bg-amber-400 text-slate-900 rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-black">
                {foliosCount}
              </span>
            )}
          </a>
          <a href="/dashboard/caisse/credits" className="relative inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 border border-white/20 text-xs font-semibold transition">
            Crédits
            {creditsCount > 0 && (
              <span className="bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-black">
                {creditsCount}
              </span>
            )}
          </a>
          <div className="bg-white/10 rounded-lg px-3 py-1.5 border border-white/20 text-center">
            <p className="text-[9px] text-blue-200 uppercase font-semibold">En cours</p>
            <p className="text-sm font-bold leading-tight">{stats?.activeOrders || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-1.5 border border-white/20 text-center">
            <p className="text-[9px] text-blue-200 uppercase font-semibold">Encaissé</p>
            <p className="text-sm font-bold leading-tight">{(stats?.cashToday || 0).toLocaleString('fr-FR')} Ar</p>
          </div>
        </div>
      </div>

      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex flex-wrap gap-1">
        {[
          { v: 'active' as const, l: `En cours (${activeOrders.length})` },
          { v: 'new' as const,    l: 'Nouvelle commande' },
          { v: 'history' as const, l: 'Historique' },
          { v: 'menu' as const,   l: 'Menu' },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${tab === t.v ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>{t.l}</button>
        ))}
      </div>

      {/* ACTIVE */}
      {tab === 'active' && (
        <div>
          {activeOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📋</div>
              <p className="text-slate-500 font-medium">Aucune commande en cours</p>
              <button onClick={() => { setTab('new'); startNewFlow(); }} className="text-teal-600 text-sm hover:underline mt-2">+ Créer une commande</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {activeOrders.map((o) => {
                const meta = ORDER_STATUS[o.status] || ORDER_STATUS.PENDING;
                const isTable = !!o.table;
                const isRoom = !!o.roomNumber;
                const rem = o.total - o.paidAmount;
                return (
                  <button key={o.id} onClick={() => openOrder(o)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${isTable ? 'bg-linear-to-br from-red-500 to-rose-600 text-white border-red-600' : isRoom ? 'bg-linear-to-br from-amber-500 to-orange-600 text-white border-amber-600' : 'bg-linear-to-br from-blue-500 to-cyan-600 text-white border-blue-600'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-xs opacity-80">#{o.id.slice(-4).toUpperCase()}</div>
                      <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-semibold">{meta.label}</span>
                    </div>
                    <div className="text-2xl font-black mb-1">{isTable ? `${o.table.number}` : isRoom ? `Ch.${o.roomNumber}` : 'Comptoir'}</div>
                    <div className="text-[11px] opacity-90 mb-2">{o.items.length} article(s) - {new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="flex items-baseline justify-between pt-2 border-t border-white/20">
                      <span className="text-[10px] uppercase opacity-80">Reste</span>
                      <span className="text-sm font-black">{rem.toLocaleString('fr-FR')} Ar</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NEW */}
      {tab === 'new' && !showNewFlow && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nouvelle commande</h2>
          <p className="text-slate-500 text-sm mb-6">Sélectionnez le type de service</p>
          <button onClick={startNewFlow} className="bg-linear-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition">Démarrer</button>
        </div>
      )}

      {tab === 'new' && showNewFlow && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>}
          {newStep === 'type' && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3">Type de service</h3>
              <div className="grid grid-cols-3 gap-3">
                {SERVICE_TYPES.map(st => (
                  <button key={st.id} onClick={() => pickServiceType(st.id)} className="group bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-teal-400 hover:shadow-lg hover:-translate-y-0.5 transition text-left">
                    <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${st.gradient} flex items-center justify-center mb-3 shadow-md text-white`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={st.icon} /></svg>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-0.5">{st.label}</h4>
                    <p className="text-[10px] text-slate-500">{st.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowNewFlow(false)} className="mt-3 text-xs text-slate-500 hover:underline">Annuler</button>
            </div>
          )}
          {newStep === 'table' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setNewStep('type')} className="text-slate-500 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                <h3 className="font-bold text-slate-900">Choisir une table</h3>
              </div>
              {tables.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Aucune table configurée</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Array.from(new Set(tables.map(t => t.location))).map(loc => (
                      <button key={loc} onClick={() => setLocationFilter(loc)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${locationFilter === loc ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{loc} <span className="text-[10px] opacity-70">({tables.filter(t => t.location === loc).length})</span></button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {tables.filter(t => t.location === locationFilter).map(t => {
                      const free = t.status === 'FREE';
                      return (
                        <button key={t.id} onClick={() => free && pickTable(t)} disabled={!free} className={`aspect-square rounded-xl flex flex-col items-center justify-center font-bold text-sm transition-all ${free ? 'bg-linear-to-br from-green-400 to-emerald-500 text-white hover:-translate-y-0.5 hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                          <span className="text-xl">{t.number}</span>
                          <span className="text-[9px] opacity-80">{t.capacity}p</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {newStep === 'room' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setNewStep('type')} className="text-slate-500 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                <h3 className="font-bold text-slate-900">Choisir une chambre</h3>
              </div>
              {roomReservations.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Aucun client en séjour</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {roomReservations.map(r => (
                    <button key={r.id} onClick={() => pickRoom(r)} className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:shadow-md bg-white transition">
                      <div className="text-xl font-black text-slate-900 mb-1">{r.room?.number}</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">{r.customer?.firstName} {r.customer?.lastName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {newStep === 'cart' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (newServiceType === 'DINE_IN') setNewStep('table'); else if (newServiceType === 'ROOM') setNewStep('room'); else setNewStep('type'); }} className="text-slate-500 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                  <div className="text-xs font-bold text-slate-900">
                    {newServiceType === 'DINE_IN' && newTable && `Table ${newTable.number}`}
                    {newServiceType === 'ROOM' && newReservation && `Ch. ${newReservation.room?.number}`}
                    {newServiceType === 'TAKEAWAY' && 'Comptoir'}
                  </div>
                  <button onClick={() => setShowNewFlow(false)} className="ml-auto text-xs text-red-600 hover:underline">Annuler</button>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => setCategoryFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${!categoryFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Tout ({menu.filter(m => m.isAvailable).length})</button>
                  {Object.entries(CATEGORIES).map(([cat, meta]) => {
                    const count = menu.filter(m => m.category === cat && m.isAvailable).length;
                    if (count === 0) return null;
                    return (
                      <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${categoryFilter === cat ? `${meta.tile} text-white shadow-sm` : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                        <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                        {meta.label} <span className="text-[10px] opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                  {filteredMenu.map(item => {
                    const cat = CATEGORIES[item.category] || CATEGORIES.OTHER;
                    const inCart = newCart.find(c => c.menuItem.id === item.id);
                    const isAdding = lastAdded === item.id;
                    return (
                      <button key={item.id} onClick={() => addToNewCart(item)} className={`group relative rounded-xl overflow-hidden aspect-square transition-all duration-150 ${isAdding ? 'scale-90' : 'hover:-translate-y-1 hover:shadow-2xl'} ${inCart ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`}>
                        <div className={`absolute inset-0 ${cat.tile}`}></div>
                        <div className="relative h-full flex flex-col items-center justify-center p-2 text-white">
                          <div className="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center mb-1"><CategoryIcon category={item.category || 'OTHER'} className="w-4 h-4" /></div>
                          <div className="font-bold text-[10px] text-center line-clamp-2 drop-shadow leading-tight px-0.5">{item.name}</div>
                          <div className="mt-1 bg-white/30 rounded-full px-2 py-0.5 text-[9px] font-black">{item.price.toLocaleString('fr-FR')}</div>
                        </div>
                        {inCart && <div className="absolute top-1 right-1 bg-white text-teal-600 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shadow-md">{inCart.quantity}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="lg:sticky lg:top-20 h-fit">
                <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
                  <div className="bg-linear-to-r from-slate-900 to-blue-900 px-4 py-3 text-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Nouvelle commande</span>
                      <span className="bg-teal-400 text-slate-900 rounded-full px-2.5 py-0.5 text-xs font-black">{newItemCount}</span>
                    </div>
                  </div>
                  {newCart.length > 0 && <button onClick={() => setNewCart([])} className="w-full text-xs text-red-600 hover:bg-red-50 py-1.5 border-b border-slate-200 font-medium transition">Vider le panier</button>}
                  <div className="max-h-[340px] overflow-y-auto bg-slate-50">
                    {newCart.map((x) => {
                      const cat = CATEGORIES[(x.menuItem?.category || 'OTHER')] || CATEGORIES.OTHER;
                      return (
                        <div key={(x.menuItem?.id || '')} className="bg-white mx-2 my-1.5 rounded-xl shadow-sm border border-slate-100 p-2.5">
                          <div className="flex items-start gap-2 mb-2">
                            <div className={`w-9 h-9 rounded-lg ${cat.tile} flex items-center justify-center shrink-0 text-white`}><CategoryIcon category={(x.menuItem?.category || 'OTHER') || 'OTHER'} className="w-4 h-4" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 text-sm truncate">{(x.menuItem?.name || 'Article')}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{(x.menuItem?.price || 0).toLocaleString('fr-FR')} Ar / unité</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-black text-slate-900 text-base">{((x.menuItem?.price || 0) * x.quantity).toLocaleString('fr-FR')}</div>
                              <div className="text-[10px] text-slate-400 font-medium">Ar</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-medium uppercase">Quantité</span>
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                              <button onClick={() => updateNewQty((x.menuItem?.id || ''), x.quantity - 1)} className="w-7 h-7 rounded-md bg-white shadow-sm hover:bg-red-500 hover:text-white text-slate-700 font-black text-base transition flex items-center justify-center border border-slate-200">-</button>
                              <span className="w-7 text-center font-black text-base text-slate-900">{x.quantity}</span>
                              <button onClick={() => updateNewQty((x.menuItem?.id || ''), x.quantity + 1)} className="w-7 h-7 rounded-md bg-white shadow-sm hover:bg-teal-500 hover:text-white text-slate-700 font-black text-base transition flex items-center justify-center border border-slate-200">+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {newCart.length === 0 && <div className="text-center py-14 mx-2"><div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">🛒</div><p className="text-slate-500 text-sm font-medium">Panier vide</p></div>}
                  </div>
                  <div className="p-4 bg-white border-t-2 border-slate-200">
                    <textarea
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    rows={2}
                    placeholder="Note (allergies, preferences...)"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition"
                  />
                    <div className="flex items-baseline justify-between mb-3 pt-3 border-t border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total TTC</div>
                        <div className="text-[10px] text-slate-400">{newItemCount} article{newItemCount > 1 ? 's' : ''}</div>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{newTotal.toLocaleString('fr-FR')} <span className="text-xs">Ar</span></div>
                    </div>
                    <button onClick={saveNewOrder} disabled={saving || newCart.length === 0} className="w-full bg-linear-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? 'Enregistrement...' : 'Enregistrer + Imprimer bon'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="space-y-3">
          {/* Barre filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Rechercher par #id, table, chambre, article..."
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { v: 'today', l: "Aujourd'hui" },
                { v: 'week', l: '7 jours' },
                { v: 'month', l: '30 jours' },
                { v: 'all', l: 'Tout' },
              ] as const).map(p => (
                <button
                  key={p.v}
                  onClick={() => setHistPreset(p.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${histPreset === p.v ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                >
                  {p.l}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1"></span>
              <select
                value={histStatus}
                onChange={e => setHistStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Tous statuts</option>
                <option value="PAID">Payé</option>
                <option value="PARTIAL">Partiel</option>
                <option value="UNPAID">Non payé</option>
                <option value="DEFERRED">Au folio</option>
                <option value="CREDIT">À crédit</option>
                <option value="CANCELLED">Annulé</option>
              </select>
              <select
                value={histMode}
                onChange={e => setHistMode(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Tous modes</option>
                <option value="CASH">Espèces</option>
                <option value="CARD">Carte</option>
                <option value="MOBILE">Mobile</option>
                <option value="ROOM_CHARGE">Chambre</option>
                <option value="CREDIT">Crédit</option>
              </select>
              <select
                value={histSort}
                onChange={e => setHistSort(e.target.value as any)}
                className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="recent">Plus récent</option>
                <option value="old">Plus ancien</option>
                <option value="amount-desc">Montant ↓</option>
                <option value="amount-asc">Montant ↑</option>
              </select>
            </div>
          </div>

          {/* Bandeau totaux */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Commandes</p>
                <p className="text-2xl font-black tabular-nums">{histTotals.count}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-black tabular-nums text-teal-400">{histTotals.ca.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">Ar</span></p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Panier moyen</p>
                <p className="text-2xl font-black tabular-nums">{histAvg.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">Ar</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">#</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">Type</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">Articles</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider text-right">Total</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">Mode</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">Statut</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider">Date</th>
                <th className="p-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagHist.pageItems.map(o => {
                const statusMap: Record<string, { label: string; bg: string; color: string; icon: string }> = {
                  PAID:     { label: 'Payé',       bg: 'bg-green-100',  color: 'text-green-800',  icon: '✅' },
                  PARTIAL:  { label: 'Partiel',    bg: 'bg-amber-100',  color: 'text-amber-800',  icon: '🟡' },
                  UNPAID:   { label: 'Non payé',   bg: 'bg-red-100',    color: 'text-red-800',    icon: '❌' },
                  DEFERRED: { label: 'Au folio',   bg: 'bg-blue-100',   color: 'text-blue-800',   icon: '📤' },
                  CREDIT:   { label: 'À crédit',   bg: 'bg-orange-100', color: 'text-orange-800', icon: '' },
                  CANCELLED:{ label: 'Annulé',     bg: 'bg-slate-200',  color: 'text-slate-700',  icon: '⛔' },
                };
                const st = statusMap[o.paymentStatus] || statusMap.UNPAID;
                const date = new Date(o.createdAt);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-bold text-slate-900">#{o.id.slice(-4).toUpperCase()}</td>
                    <td className="p-3 text-sm font-semibold text-slate-900">
                      {o.table ? 'Table ' + o.table.number : o.roomNumber ? 'Ch. ' + o.roomNumber : 'Comptoir'}
                    </td>
                    <td className="p-3 text-xs font-medium text-slate-800 truncate max-w-xs">
                      {(o.items || []).slice(0, 2).map((it: any) => (it.quantity || 0) + 'x ' + (it.menuItem?.name || '?')).join(', ')}
                      {(o.items?.length || 0) > 2 && <span className="text-slate-500"> +{(o.items?.length || 0) - 2}</span>}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className="text-base font-black text-slate-900">{(o.total || 0).toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-bold text-slate-600 ml-1">Ar</span>
                      {(o.paidAmount || 0) > 0 && (o.paidAmount || 0) < (o.total || 0) && (
                        <div className="text-[10px] font-bold text-amber-700">
                          Paye : {(o.paidAmount || 0).toLocaleString('fr-FR')} Ar
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={'inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ' + (MODE_META[getOrderPaymentMode(o)]?.bg || 'bg-slate-100') + ' ' + (MODE_META[getOrderPaymentMode(o)]?.color || 'text-slate-600')}>
                        {MODE_META[getOrderPaymentMode(o)]?.label || '—'}
                      </span>
                    </td><td className="p-3">
                      <span className={'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ' + st.bg + ' ' + st.color}>
                        <span>{st.icon}</span>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      <div>{date.toLocaleDateString('fr-FR')}</div>
                      <div className="text-slate-500 font-normal">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => { if (o.paymentStatus === 'PAID') printReceipt(o, o.table, o.reservation); else printTicket(o, o.table, o.reservation); }}
                        className={`w-8 h-8 rounded-lg transition inline-flex items-center justify-center ${o.paymentStatus === "PAID" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-700"}`}
                        title={o.paymentStatus === "PAID" ? "Imprimer le reçu" : "Réimprimer le bon de commande"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pagHist.pageItems.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                  {histSearch || histStatus !== 'ALL' || histMode !== 'ALL' || histPreset !== 'all'
                    ? 'Aucune commande ne correspond aux filtres'
                    : "Aucune commande dans l'historique"}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>

          <Pagination
            page={pagHist.page}
            totalPages={pagHist.totalPages}
            onPageChange={pagHist.setPage}
            perPage={pagHist.perPage}
            perPageOptions={pagHist.perPageOptions}
            onPerPageChange={pagHist.setPerPage}
            total={pagHist.total}
          />
        </div>
      )}


      {tab === 'menu' && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => openMenuModal()}>+ Ajouter un produit</Button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {menu.map(item => {
              const cat = CATEGORIES[item.category] || CATEGORIES.OTHER;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:border-teal-300 hover:shadow-md transition group">
                  <div className={`w-10 h-10 rounded-lg ${cat.tile} flex items-center justify-center mb-2 text-white`}><CategoryIcon category={item.category || 'OTHER'} className="w-5 h-5" /></div>
                  <h4 className="font-semibold text-slate-900 text-sm truncate">{item.name}</h4>
                  <p className="text-[10px] text-slate-500">{cat.label}</p>
                  <p className="font-bold text-slate-900 mt-1">{item.price.toLocaleString('fr-FR')} Ar</p>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openMenuModal(item)} className="text-[10px] text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => setMenuItemToDelete(item)} className="text-[10px] text-red-600 hover:underline">Supprimer</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {selectedOrder && !showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className={`px-6 py-5 text-white ${selectedOrder.table ? 'bg-linear-to-r from-red-500 to-rose-600' : selectedOrder.roomNumber ? 'bg-linear-to-r from-amber-500 to-orange-600' : 'bg-linear-to-r from-blue-500 to-cyan-600'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-80 font-mono">#{(selectedOrder?.id || "").slice(-4).toUpperCase()}</div>
                  <h2 className="text-2xl font-black mt-0.5">{selectedOrder.table ? `Table ${selectedOrder.table.number}` : selectedOrder.roomNumber ? `Chambre ${selectedOrder.roomNumber}` : 'Comptoir'}</h2>
                  <p className="text-xs opacity-90 mt-0.5">{ORDER_STATUS[selectedOrder.status]?.label}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase">Articles ({(selectedOrder?.items?.length || 0)})</h3>
                  <button onClick={() => setShowAddItems(!showAddItems)} className="text-xs text-teal-600 hover:underline font-bold">{showAddItems ? '← Masquer' : '+ Ajouter'}</button>
                </div>
                {showAddItems && (
                  <div className="mb-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {filteredMenu.slice(0, 8).map(item => (
                        <button key={item.id} onClick={() => addToNewCart(item)} className="bg-white rounded-lg border border-slate-200 p-2 text-center hover:border-teal-300 text-xs">
                          <div className="truncate font-medium">{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.price.toLocaleString('fr-FR')}</div>
                        </button>
                      ))}
                    </div>
                    {newCart.length > 0 && <button onClick={addItemsToSelected} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-xs font-bold">Ajouter {newCart.length} article(s) - {newCart.reduce((s, x) => s + (x.menuItem?.price || 0) * x.quantity, 0).toLocaleString('fr-FR')} Ar</button>}
                  </div>
                )}
                <div className="space-y-2">
                  {(selectedOrder?.items || []).map((it: any) => (
                    <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{(it.menuItem?.name || 'Article')}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{(it.unitPrice || 0).toLocaleString('fr-FR')} Ar / unité</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-900 text-lg leading-none">{(it.total || 0).toLocaleString('fr-FR')}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Ar</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <button onClick={() => updateItemQty(it.id, (it.quantity || 0) - 1)} className="w-8 h-8 rounded-md bg-white hover:bg-red-500 hover:text-white text-slate-800 font-black text-lg transition flex items-center justify-center border border-slate-200">−</button>
                          <span className="w-10 text-center font-black text-lg text-slate-900">{(it.quantity || 0)}</span>
                          <button onClick={() => updateItemQty(it.id, (it.quantity || 0) + 1)} className="w-8 h-8 rounded-md bg-white hover:bg-teal-500 hover:text-white text-slate-800 font-black text-lg transition flex items-center justify-center border border-slate-200">+</button>
                        </div>
                        <button onClick={() => removeItem(it.id)} className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition">✕ Retirer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl p-4 text-white grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black tabular-nums leading-tight">
                    {(selectedOrder?.total || 0).toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                  {selectedOrder.paidAmount > 0 && (
                    <p className="text-[10px] text-green-300 mt-1.5 tabular-nums">
                      Payé : {(selectedOrder.paidAmount || 0).toLocaleString('fr-FR')} Ar
                    </p>
                  )}
                </div>
                <div className="text-right border-l border-white/20 pl-4">
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">Reste a payer</p>
                  <p className={`text-2xl font-black tabular-nums leading-tight ${(selectedOrder.total - selectedOrder.paidAmount) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {(selectedOrder.total - selectedOrder.paidAmount).toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t bg-white p-4 space-y-2">
              {((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0)) > 0 && (
                <button
                  onClick={() => {
                    setPayAmount((((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toString());
                    setPayMethod('CASH');
                    setShowPayModal(true);
                  }}
                  className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3.5 rounded-2xl font-black text-base shadow-lg transition"
                >
                  Encaisser {(((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toLocaleString("fr-FR")} Ar
                </button>
              )}
              <div className="flex gap-2">
                {selectedOrder.status === 'PENDING' && (
                  <button onClick={() => sendToKitchen(selectedOrder.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm transition">
                    Cuisine
                  </button>
                )}
                <button onClick={() => printTicket(selectedOrder, selectedOrder.table, selectedOrder.reservation)} className="flex-1 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-900 py-2.5 rounded-xl font-bold text-sm transition">
                  Reimprimer
                </button>
                <button onClick={() => cancelOrder(selectedOrder.id)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2.5 rounded-xl font-bold text-sm transition">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAYMENT */}
      {showPayModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/85" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-linear-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">💰 Encaissement</h2>
                  <p className="text-sm text-blue-200 mt-1">
                    Commande #{(selectedOrder?.id || "").slice(-4).toUpperCase()} • {selectedOrder.table ? `Table ${selectedOrder.table.number}` : selectedOrder.roomNumber ? `Ch. ${selectedOrder.roomNumber}` : 'Comptoir'}
                  </p>
                </div>
                <button onClick={() => setShowPayModal(false)} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
              <div className="text-center py-4 bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl text-white">
                <p className="text-xs text-blue-200 font-bold uppercase mb-1">Montant à encaisser</p>
                <p className="text-5xl font-black">{remaining.toLocaleString('fr-FR')}<span className="text-xl ml-2">Ar</span></p>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-3 block">Mode de paiement</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map(m => {
                    const isActive = payMethod === m.id;
                    return (
                      <button key={m.id} onClick={() => setPayMethod(m.id)} className={`relative rounded-2xl p-4 transition-all ${isActive ? `${m.bg} text-white shadow-xl scale-[1.02]` : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-600'}`}>{m.icon}</div>
                        <div className="font-black text-sm">{m.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{m.sublabel}</div>
                        {isActive && <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md"><svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {payMethod === 'CASH' && (
                <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200">
                  <label className="text-xs font-black text-green-800 uppercase mb-3 block">💵 Montant reçu du client</label>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" className="w-full px-5 py-4 bg-white border-2 border-green-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900 font-black text-3xl text-center" autoFocus />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[remaining, 5000, 10000, 20000].map((amt, i) => (
                      <button key={i} onClick={() => setPayAmount(Math.ceil(amt).toString())} className="py-2.5 bg-white border border-green-300 rounded-xl text-xs font-bold text-green-800 hover:bg-green-100 transition">{i === 0 ? 'Exact' : `${(amt / 1000).toFixed(0)}k`}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[2000, 5000, 10000, 20000].map((amt, i) => (
                      <button key={i} onClick={() => setPayAmount((parseInt(payAmount || '0') + amt).toString())} className="py-2.5 bg-white border border-green-300 rounded-xl text-xs font-bold text-green-800 hover:bg-green-100 transition">+{(amt / 1000).toFixed(0)}k</button>
                    ))}
                  </div>
                  {payAmount && parseFloat(payAmount) >= remaining && (
                    <div className="mt-4 bg-white rounded-2xl p-5 border-2 border-green-400 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-green-700 uppercase">💵 Monnaie à rendre</div>
                        <div className="text-xs text-slate-500 mt-0.5">Au client</div>
                      </div>
                      <div className="text-4xl font-black text-green-600">{change.toLocaleString('fr-FR')}<span className="text-lg ml-1">Ar</span></div>
                    </div>
                  )}
                  {payAmount && parseFloat(payAmount) < remaining && (
                    <div className="mt-4 bg-red-50 rounded-2xl p-5 border-2 border-red-300">
                      <p className="text-sm font-black text-red-700">⚠️ Manque {(remaining - parseFloat(payAmount)).toLocaleString('fr-FR')} Ar</p>
                    </div>
                  )}
                </div>
              )}
              {payMethod === 'CARD' && (
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200">
                  <p className="font-bold text-blue-900">💳 Paiement par carte bancaire</p>
                  <p className="text-sm text-blue-700 mt-1">Encaissement sur le TPE. Assurez-vous du succès avant de valider.</p>
                </div>
              )}
              {payMethod === 'MOBILE' && (
                <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200">
                  <p className="font-bold text-purple-900">📱 Paiement Mobile Money</p>
                  <p className="text-sm text-purple-700 mt-1">Vérifiez la confirmation sur votre téléphone.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-[10px] bg-white px-2 py-1 rounded font-bold text-purple-700">MVola</span>
                    <span className="text-[10px] bg-white px-2 py-1 rounded font-bold text-orange-600">Orange Money</span>
                    <span className="text-[10px] bg-white px-2 py-1 rounded font-bold text-red-600">Airtel Money</span>
                  </div>
                </div>
              )}
              {payMethod === 'ROOM_CHARGE' && (
                <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
                  <p className="font-bold text-amber-900">🏨 Ajouter au folio chambre</p>
                  <p className="text-sm text-amber-700 mt-1">Le montant sera ajouté au folio et payé à la fin du séjour.</p>
                  {selectedOrder.roomNumber ? (
                    <div className="mt-3 bg-white rounded-xl px-3 py-2 inline-block border border-amber-300">
                      <span className="text-xs text-slate-500">Chambre</span>
                      <span className="font-black text-amber-800 ml-2">{selectedOrder.roomNumber}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 font-bold mt-2">⚠️ Pas de chambre rattachée à cette commande.</p>
                  )}
                </div>
              )}
              {payMethod === 'CREDIT' && (
                <div className="bg-linear-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border-2 border-slate-300">
                  <p className="font-bold text-slate-900">📋 Vente à crédit</p>
                  <p className="text-sm text-slate-700 mt-1">Le client paiera plus tard. La commande reste en attente.</p>
                </div>
              )}
              {['CASH', 'CARD', 'MOBILE'].includes(payMethod) && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Montant payé (partiel possible)</label>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={remaining.toString()} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 text-slate-900 font-bold text-xl" />
                </div>
              )}
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Note (optionnel)</label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex : Client Rakoto, chambre 202, cheque n°1234..."
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>
            <div className="border-t-2 border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-bold uppercase">À encaisser</p>
                <p className="text-4xl font-black text-slate-900">{remaining.toLocaleString('fr-FR')}<span className="text-lg ml-1">Ar</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPayModal(false)} className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition">Annuler</button>
                <button
                  onClick={() => {
                    // Pour CASH : on envoie le montant à PAYER (pas ce que le client a donné)
                    // Pour CARD/MOBILE : on envoie le reste dû
                    const amountToPay = payMethod === 'CASH'
                      ? Math.min(parseFloat(payAmount) || remaining, remaining)
                      : remaining;
                    payOrderNow(amountToPay);
                  }}
                  disabled={(payMethod === 'CASH' && (!payAmount || parseFloat(payAmount) <= 0)) || (payMethod === 'ROOM_CHARGE' && !selectedOrder.roomNumber)}
                  className="px-8 py-4 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  ✓ {payMethod === 'ROOM_CHARGE' ? 'Reporter au folio' : payMethod === 'CREDIT' ? 'Enregistrer à crédit' : 'Valider le paiement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={showMenuModal} onClose={() => { setShowMenuModal(false); setEditingMenuItem(null); }} title={editingMenuItem ? 'Modifier le produit' : 'Nouveau produit'} icon={<span className="text-2xl">📦</span>} size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowMenuModal(false); setEditingMenuItem(null); }}>Annuler</Button>
            <button type="submit" form="menu-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">{saving ? 'Enregistrement...' : editingMenuItem ? 'Enregistrer' : 'Créer'}</button>
          </div>
        }>
        <form id="menu-form" onSubmit={saveMenuItem} className="space-y-3">
          <FormField label="Nom" required><Input type="text" value={mName} onChange={e => setMName(e.target.value)} required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prix (Ar)" required><Input type="number" value={mPrice} onChange={e => setMPrice(e.target.value)} required /></FormField>
            <FormField label="Catégorie"><Select value={mCategory} onChange={e => setMCategory(e.target.value)}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></FormField>
          </div>
          <FormField label="Description"><Textarea value={mDescription} onChange={e => setMDescription(e.target.value)} rows={2} /></FormField>
        </form>
      </Modal>

      <ConfirmDialog open={!!menuItemToDelete} title="Supprimer le produit" message={`Supprimer "${menuItemToDelete?.name}" ?`} onClose={() => setMenuItemToDelete(null)} onConfirm={deleteMenuItem} />
    </div>
  );
}
