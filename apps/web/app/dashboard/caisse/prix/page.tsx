'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';

const CATEGORY_STYLES: Record<string, { icon: string; gradient: string; badge: string; badgeText: string; label: string }> = {
  BOUTIQUE:           { icon: '🛒', gradient: 'from-pink-500 to-rose-600',    badge: 'bg-pink-100',    badgeText: 'text-pink-700',    label: 'Boutique' },
  MINIBAR:            { icon: '🍷', gradient: 'from-purple-500 to-indigo-600', badge: 'bg-purple-100',  badgeText: 'text-purple-700',  label: 'Minibar' },
  RESTAURANT_ENTREE:  { icon: '🥗', gradient: 'from-lime-500 to-green-600',   badge: 'bg-lime-100',    badgeText: 'text-lime-700',    label: 'Entree' },
  RESTAURANT_PLAT:    { icon: '🍽️', gradient: 'from-orange-500 to-red-600',    badge: 'bg-orange-100',  badgeText: 'text-orange-700',  label: 'Plat' },
  RESTAURANT_DESSERT: { icon: '🍰', gradient: 'from-fuchsia-500 to-pink-600', badge: 'bg-fuchsia-100', badgeText: 'text-fuchsia-700', label: 'Dessert' },
  RESTAURANT_BOISSON: { icon: '☕', gradient: 'from-blue-500 to-cyan-600',    badge: 'bg-blue-100',    badgeText: 'text-blue-700',    label: 'Boisson' },
  SPA:                { icon: '💆', gradient: 'from-teal-500 to-emerald-600', badge: 'bg-teal-100',    badgeText: 'text-teal-700',    label: 'Spa' },
  SERVICE:            { icon: '⚙️', gradient: 'from-slate-500 to-slate-700',  badge: 'bg-slate-100',   badgeText: 'text-slate-700',   label: 'Service' },
  OTHER:              { icon: '📦', gradient: 'from-slate-400 to-slate-600',  badge: 'bg-slate-100',   badgeText: 'text-slate-600',   label: 'Autre' },
  ROOM_TYPE:          { icon: '🛏️', gradient: 'from-amber-500 to-orange-600', badge: 'bg-amber-100',   badgeText: 'text-amber-700',   label: 'Type chambre' },
  ROOM:               { icon: '🚪', gradient: 'from-blue-500 to-cyan-600',    badge: 'bg-blue-100',    badgeText: 'text-blue-700',    label: 'Chambre' },
  UNKNOWN:            { icon: '📦', gradient: 'from-slate-400 to-slate-600',  badge: 'bg-slate-100',   badgeText: 'text-slate-600',   label: 'Autre' },
};

function getCatStyle(r: any) {
  if (r.type === 'MENU' && r.category && CATEGORY_STYLES[r.category]) return CATEGORY_STYLES[r.category];
  if (r.type === 'ROOM_TYPE') return CATEGORY_STYLES.ROOM_TYPE;
  if (r.type === 'ROOM') return CATEGORY_STYLES.ROOM;
  return CATEGORY_STYLES.UNKNOWN;
}

export default function PrixPage() {
  const [menu, setMenu] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | 'MENU' | 'ROOMS' | 'TYPES'>('ALL');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    Promise.all([
      fetch('/api/pos/menu', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/hotel/rooms', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/hotel/room-types', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([m, r, rt]) => {
        setMenu(Array.isArray(m) ? m : []);
        setRooms(Array.isArray(r) ? r : []);
        setRoomTypes(Array.isArray(rt) ? rt : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const s = search.toLowerCase().trim();
    const out: any[] = [];

    if (category === 'ALL' || category === 'MENU') {
      menu.filter(m => !s || m.name.toLowerCase().includes(s) || (m.description || '').toLowerCase().includes(s))
        .forEach(m => out.push({
          type: 'MENU',
          name: m.name,
          description: m.description,
          category: m.category,
          price: m.price,
        }));
    }

    if (category === 'ALL' || category === 'TYPES') {
      roomTypes.filter(t => !s || t.name.toLowerCase().includes(s))
        .forEach(t => out.push({
          type: 'ROOM_TYPE',
          name: t.name,
          description: t.description,
          category: t.capacity + ' pers.',
          price: t.basePrice,
          suffix: '/nuit',
        }));
    }

    if (category === 'ALL' || category === 'ROOMS') {
      rooms.filter(r => !s || r.number.toLowerCase().includes(s) || (r.roomType?.name || '').toLowerCase().includes(s))
        .forEach(r => out.push({
          type: 'ROOM',
          name: 'Chambre ' + r.number,
          description: r.roomType?.name,
          category: 'Etage ' + (r.floor || '-'),
          price: r.roomType?.basePrice,
          suffix: '/nuit',
        }));
    }

    return out;
  }, [menu, rooms, roomTypes, search, category]);

  const pag = usePagination(results, { perPageDefault: 30 });

  useEffect(() => { pag.setPage(1); }, [search, category]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Consultation des prix</h1>
            <p className="text-xs text-slate-500">Recherchez rapidement un prix a communiquer au client</p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher un produit, une chambre, un service... (ex: Coca, Suite, 101)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white text-slate-900 font-medium transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtres + compteur */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {[
            { v: 'ALL' as const,   l: 'Tout',           i: '📋' },
            { v: 'MENU' as const,  l: 'Produits',       i: '🛒' },
            { v: 'TYPES' as const, l: 'Types chambres', i: '🛏️' },
            { v: 'ROOMS' as const, l: 'Chambres',       i: '🚪' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setCategory(f.v)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                category === f.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {f.i} {f.l}
            </button>
          ))}
          <span className="ml-auto text-xs font-bold text-slate-400">
            {results.length} resultat{results.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Resultats */}
      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔍</div>
          <p className="text-slate-500 font-medium">Aucun resultat</p>
          <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-cle</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pag.pageItems.map((r, i) => {
              const cat = getCatStyle(r);
              return (
                <div key={r.type + '-' + i} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-teal-300 transition group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={'w-11 h-11 rounded-xl bg-gradient-to-br ' + cat.gradient + ' text-white flex items-center justify-center text-lg shrink-0 shadow-sm'}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">{r.name}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{r.description || r.category || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={'inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ' + cat.badge + ' ' + cat.badgeText}>
                      {cat.label}
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {(r.price || 0).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1">Ar</span>
                      {r.suffix && <span className="text-[10px] text-slate-400 ml-1">{r.suffix}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={pag.page}
            totalPages={pag.totalPages}
            onPageChange={pag.setPage}
            perPage={pag.perPage}
            perPageOptions={pag.perPageOptions}
            onPerPageChange={pag.setPerPage}
            total={pag.total}
          />
        </>
      )}
    </div>
  );
}
