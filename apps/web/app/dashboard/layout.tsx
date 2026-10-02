'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, logout as apiLogout } from '../../lib/api';
import { useRouter, usePathname } from 'next/navigation';
import CommandPalette from '../../components/CommandPalette';
import ImpersonationBanner from '../../components/ImpersonationBanner';

// ═════════════════════════════════════════════════════════════
//  HOOKS
// ═════════════════════════════════════════════════════════════

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ═════════════════════════════════════════════════════════════
//  CONFIG
// ═════════════════════════════════════════════════════════════

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  organizations: 'Organisations',
  users: 'Utilisateurs',
  modules: 'Modules & Services',
  subscriptions: 'Abonnements',
  billing: 'Facturation',
  storage: 'Stockage',
  'tenant-admins': 'Admins des Tenants',
  crm: 'CRM',
  partners: 'Partenaires',
  interactions: 'Interactions',
  analytics: 'Analytics',
  documents: 'Documents',
  caisse: 'Caisse',
  pos: 'Vente / POS',
  tables: 'Plan de salle',
  prix: 'Consultation prix',
  folios: 'Folios clients',
  credits: 'Crédits',
  journal: 'Journal de caisse',
  reservations: 'Réservations',
  planning: 'Planning',
  kanban: 'Vue Kanban',
  'night-audit': 'Rapport du jour',
  chambres: 'Chambres',
  checkin: 'Check-in / out',
  housekeeping: 'Housekeeping',
  stock: 'Stock',
  warehouses: 'Magasins',
  transfers: 'Transferts',
  movements: 'Mouvements',
  suppliers: 'Fournisseurs',
  recipes: 'Recettes',
  orders: 'Commandes',
  reports: 'Rapports',
  inventory: 'Inventaire',
  sales: 'Ventes',
  audit: 'Journal d\'audit',
};

// Actions réservées au SUPER_ADMIN (créer des tenants, users globaux, etc.)
const ADMIN_ACTIONS: Record<string, { label: string; href: string }> = {
  '/dashboard': { label: 'Nouvelle organisation', href: '/dashboard/organizations?new=1' },
  '/dashboard/organizations': { label: 'Nouvelle organisation', href: '/dashboard/organizations?new=1' },
  '/dashboard/users': { label: 'Nouvel utilisateur', href: '/dashboard/users' },
  '/dashboard/modules': { label: 'Nouveau module', href: '/dashboard/modules' },
};

// Actions accessibles à tous les rôles (métier de l'organisation)
const ORG_ACTIONS: Record<string, { label: string; href: string }> = {
  '/dashboard/crm': { label: 'Nouveau partenaire', href: '/dashboard/crm/partners?new=1' },
  '/dashboard/crm/partners': { label: 'Nouveau partenaire', href: '/dashboard/crm/partners?new=1' },
  '/dashboard/caisse': { label: 'Nouveau mouvement', href: '/dashboard/caisse/journal' },
  '/dashboard/caisse/tables': { label: 'Nouvelle table', href: '/dashboard/caisse/tables' },
  '/dashboard/caisse/pos': { label: 'Nouvelle commande', href: '/dashboard/caisse/pos' },
  '/dashboard/reservations': { label: 'Nouvelle réservation', href: '/dashboard/reservations' },
  '/dashboard/reservations/chambres': { label: 'Nouvelle chambre', href: '/dashboard/reservations/chambres' },
  '/dashboard/stock': { label: 'Nouvel article', href: '/dashboard/stock' },
};

// ═════════════════════════════════════════════════════════════
//  SUB-MENUS
// ═════════════════════════════════════════════════════════════

type SubItem = { path: string; label: string };

const SUBMENUS: Record<string, SubItem[]> = {
  '/dashboard/caisse': [
    { path: '/dashboard/caisse', label: "Vue d'ensemble" },
    { path: '/dashboard/caisse/pos', label: 'Vente / POS' },
    { path: '/dashboard/caisse/tables', label: 'Plan de salle' },
    { path: '/dashboard/caisse/prix', label: 'Consultation prix' },
    { path: '/dashboard/caisse/folios', label: 'Folios clients' },
    { path: '/dashboard/caisse/credits', label: 'Crédits' },
    { path: '/dashboard/caisse/journal', label: 'Journal de caisse' },
  ],
  '/dashboard/crm': [
    { path: '/dashboard/crm', label: "Vue d'ensemble" },
    { path: '/dashboard/crm/partners', label: 'Partenaires' },
    { path: '/dashboard/crm/analytics', label: 'Analytics' },
    { path: '/dashboard/crm/interactions', label: 'Interactions' },
    { path: '/dashboard/crm/documents', label: 'Documents' },
  ],
  '/dashboard/stock': [
    { path: '/dashboard/stock', label: "Vue d'ensemble" },
    { path: '/dashboard/stock/warehouses', label: 'Magasins' },
    { path: '/dashboard/stock/transfers', label: 'Transferts' },
    { path: '/dashboard/stock/movements', label: 'Mouvements' },
    { path: '/dashboard/stock/suppliers', label: 'Fournisseurs' },
    { path: '/dashboard/stock/recipes', label: 'Recettes' },
    { path: '/dashboard/stock/orders', label: 'Commandes' },
    { path: '/dashboard/stock/reports', label: 'Rapports' },
    { path: '/dashboard/stock/inventory', label: 'Inventaire' },
  ],
  '/dashboard/reservations': [
    { path: '/dashboard/reservations', label: 'Réservations' },
    { path: '/dashboard/reservations/planning', label: 'Planning' },
    { path: '/dashboard/reservations/kanban', label: 'Vue Kanban' },
    { path: '/dashboard/reservations/night-audit', label: 'Rapport du jour' },
    { path: '/dashboard/reservations/chambres', label: 'Chambres' },
    { path: '/dashboard/reservations/checkin', label: 'Check-in / out' },
    { path: '/dashboard/reservations/housekeeping', label: 'Housekeeping' },
  ],
};

// ═════════════════════════════════════════════════════════════
//  LAYOUT
// ═════════════════════════════════════════════════════════════

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<any>(null);

  const role = user?.role || 'USER';
  const isOwner = user?.isOwner || false;
  const orgName = user?.organization?.name || '';
  const activeModules = useMemo<{ name: string; route: string | null }[]>(
    () => user?.modules || [],
    [user],
  );

  // ═══ Fetch user ═══
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        localStorage.setItem('role', data.role || 'USER');
        localStorage.setItem('isOwner', data.isOwner ? 'true' : 'false');
        localStorage.setItem('orgType', data.organization?.type || '');
        localStorage.setItem('orgName', data.organization?.name || '');
        localStorage.setItem('userName', data.name || '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // ═══ Auto-expand sub-menu selon route ═══
  useEffect(() => {
    if (!pathname) return;
    const parent = activeModules.find((m) => m.route && pathname.startsWith(m.route + '/'));
    if (parent) setExpandedModule(parent.route);
  }, [pathname, activeModules]);

  // ═══ Impersonation : récupère le nom réel de l'acteur ═══
  useEffect(() => {
    const raw = localStorage.getItem('impersonation');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setImpersonation(parsed);
      } catch { /* ignore */ }
    } else {
      setImpersonation(null);
    }
  }, [pathname]);

  // ═══ Ferme drawer mobile à chaque navigation ═══
  useEffect(() => {
    setMobileMenuOpen(false);
    setAvatarMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  // ═══ Click outside → ferme menus ═══
  useEffect(() => {
    function onClick() {
      setAvatarMenuOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function isItemActive(itemPath: string): boolean {
    if (itemPath === '/dashboard') return pathname === '/dashboard';
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
  }

  // ═══ MENU ITEMS ═══
  const adminMenu = [
    { path: '/dashboard/organizations', label: 'Organisations', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { path: '/dashboard/users', label: 'Utilisateurs', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/dashboard/modules', label: 'Modules & Services', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { path: '/dashboard/subscriptions', label: 'Abonnements', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/dashboard/billing', label: 'Facturation', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/dashboard/storage', label: 'Stockage', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    { path: '/dashboard/tenant-admins', label: 'Admins des Tenants', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/dashboard/audit', label: 'Journal audit', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { path: '/dashboard/analytics', label: 'Analytics revenus', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const baseMenu = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ];

  let menuItems = [...baseMenu];

  if (role === 'SUPER_ADMIN') {
    menuItems = [...baseMenu, ...adminMenu];
  } else {
    const SUBMENU_PATHS = new Set(
      Object.entries(SUBMENUS).flatMap(([parentPath, subs]) =>
        subs.filter((sub) => sub.path !== parentPath).map((sub) => sub.path),
      ),
    );

    activeModules.forEach((mod) => {
      const route = mod.route && mod.route.trim() !== '' ? mod.route : `/dashboard/${slugify(mod.name)}`;
      if (SUBMENU_PATHS.has(route)) return;
      menuItems.push({
        path: route,
        label: mod.name,
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      });
    });

    if (menuItems.length === 1) {
      menuItems.push({
        path: '/dashboard/modules',
        label: 'Mes Modules',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      });
    }
  }

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  async function logout() {
    await apiLogout();
  }

  function openCommandPalette() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  }

  // ═══ BREADCRUMB ═══
  const breadcrumb = useMemo(() => {
    if (!pathname) return [];
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((seg, i) => ({
      label: ROUTE_LABELS[seg] || seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
      isLast: i === segments.length - 1,
    }));
  }, [pathname]);

  // ═══ CONTEXT ACTION ═══
  const contextAction = useMemo(() => {
    if (!pathname) return null;

    const isSuperAdmin = role === 'SUPER_ADMIN';

    // 1. Chercher dans les actions ADMIN (super-admin uniquement)
    if (isSuperAdmin) {
      const adminKeys = Object.keys(ADMIN_ACTIONS).sort((a, b) => b.length - a.length);
      for (const key of adminKeys) {
        if (pathname === key) return ADMIN_ACTIONS[key];
      }
    }

    // 2. Sinon, chercher dans les actions ORG (tous les rôles d'organisation)
    const orgKeys = Object.keys(ORG_ACTIONS).sort((a, b) => b.length - a.length);
    for (const key of orgKeys) {
      if (pathname === key) return ORG_ACTIONS[key];
    }

    return null;
  }, [pathname, role]);

  // ═══ MOBILE BOTTOM NAV (max 4 + "Menu") ═══
  const mobileNavItems = useMemo(() => {
    const items = menuItems.filter((m) => m.path !== '/dashboard').slice(0, 4);
    return items;
  }, [menuItems]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ═══════ MOBILE : Drawer overlay ═══════ */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`
        fixed left-0 top-0 h-screen z-50 flex flex-col
        transition-all duration-200 bg-slate-950 text-slate-300
        ${collapsed ? 'w-16' : 'w-60'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 h-14 px-4 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">NEXUS OS</h1>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {role === 'SUPER_ADMIN' ? 'ADMINISTRATION' : orgName}
              </p>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isItemActive(item.path);
            const submenu = SUBMENUS[item.path];
            const isExpanded = expandedModule === item.path;
            const hasSubmenu = !!submenu && !collapsed;

            return (
              <div key={item.path}>
                {hasSubmenu ? (
                  <button
                    onClick={() => setExpandedModule(isExpanded ? null : item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium
                      transition-colors duration-100 group relative
                      ${active
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal-400 rounded-r" />
                    )}
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                    </svg>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <a
                    href={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium
                      transition-colors duration-100 relative
                      ${active
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal-400 rounded-r" />
                    )}
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                    </svg>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </a>
                )}

                {hasSubmenu && isExpanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-slate-800 space-y-0.5">
                    {submenu.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <a
                          key={sub.path}
                          href={sub.path}
                          className={`
                            block px-2 py-1.5 rounded-md text-[12px] transition-colors duration-100
                            ${subActive
                              ? 'bg-slate-800 text-white font-medium'
                              : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-200'}
                          `}
                        >
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="border-t border-slate-800 p-2">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                {impersonation ? (
                  <>
                    <p className="text-[12px] font-semibold text-white truncate leading-none">
                      {user?.name || 'Utilisateur'}
                    </p>
                    <p className="text-[10px] text-red-400 truncate mt-0.5 font-bold">
                      👁 Impersonné par Elikanto
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] font-semibold text-white truncate leading-none">
                      {user?.name || 'Utilisateur'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {role}{isOwner ? ' · owner' : ''}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={logout}
              className="mt-2 w-full py-1.5 rounded-md bg-slate-900 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-[11px] font-medium transition-colors"
            >
              Déconnexion
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 items-center justify-center shadow-md border border-slate-700 transition"
        >
          <svg className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>

        {/* ═══ BANDEAU IMPERSONATION (si actif) ═══ */}
        <ImpersonationBanner />

        {/* ═══ HEADER ═══ */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-3 sm:px-4 gap-3">

          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb (desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 min-w-0 flex-1">
            {breadcrumb.map((seg, i) => (
              <div key={seg.href} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {seg.isLast ? (
                  <span className="text-sm font-semibold text-slate-900 truncate">{seg.label}</span>
                ) : (
                  <a
                    href={seg.href}
                    className="text-sm text-slate-500 hover:text-slate-900 transition truncate"
                  >
                    {seg.label}
                  </a>
                )}
              </div>
            ))}
          </nav>

          {/* Titre mobile */}
          <div className="md:hidden flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate block">
              {breadcrumb[breadcrumb.length - 1]?.label || 'NEXUS OS'}
            </span>
          </div>

          {/* Search (desktop) */}
          <button
            onClick={openCommandPalette}
            className="hidden lg:flex items-center gap-2 w-64 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-teal-300 rounded-md text-xs text-slate-500 transition group shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">⌘K</kbd>
          </button>

          {/* Context action */}
          {contextAction && (
            <a
              href={contextAction.href}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden lg:inline">{contextAction.label}</span>
            </a>
          )}

          {/* Notifications */}
          <button
            onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
            className="relative w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* Avatar */}
          <button
            onClick={(e) => { e.stopPropagation(); setAvatarMenuOpen(!avatarMenuOpen); }}
            className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0 hover:opacity-90 transition"
          >
            {initial}
          </button>

          {/* Avatar menu dropdown */}
          {avatarMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-14 w-56 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50"
            >
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Utilisateur'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 mt-1">{role}{isOwner ? ' · owner' : ''}</p>
              </div>
              <a href="/dashboard" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                Mon profil
              </a>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition border-t border-slate-100"
              >
                Déconnexion
              </button>
            </div>
          )}
        </header>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden w-full min-w-0">
          {children}
        </main>

        {/* ═══ STATUS BAR (desktop) ═══ */}
        <footer className="hidden lg:flex h-7 items-center gap-4 px-4 bg-slate-950 text-slate-500 text-[11px] border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connecté</span>
          </div>
          <span className="text-slate-700">·</span>
          <span>v1.0.0</span>
          <span className="text-slate-700">·</span>
          <span>{role.toLowerCase()}</span>
          <div className="ml-auto flex items-center gap-3">
            <span>© {new Date().getFullYear()} NEXUS OS</span>
          </div>
        </footer>

        {/* ═══ MOBILE BOTTOM NAV ═══ */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-1 pb-safe">
          {/* Accueil */}
          <a
            href="/dashboard"
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-md transition ${
              pathname === '/dashboard' ? 'text-teal-600' : 'text-slate-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">Accueil</span>
          </a>

          {/* 4 modules principaux */}
          {mobileNavItems.slice(0, 3).map((item) => {
            const active = isItemActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-md transition ${
                  active ? 'text-teal-600' : 'text-slate-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium truncate max-w-[60px]">{item.label}</span>
              </a>
            );
          })}

          {/* Menu (drawer) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-md text-slate-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </nav>
      </div>

      <CommandPalette />
    </div>
  );
}
