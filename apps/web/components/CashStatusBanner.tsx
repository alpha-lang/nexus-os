'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

/**
 * Affiche un bandeau rouge quand aucune caisse n'est ouverte.
 * Se rafraîchit toutes les 30 secondes.
 */
export default function CashStatusBanner() {
  const [openCount, setOpenCount] = useState<number | null>(null);

  async function check() {
    try {
      const res = await apiFetch('/api/cash/stats');
      if (!res.ok) return;
      const data = await res.json();
      setOpenCount(data.openRegisters ?? 0);
    } catch {
      // silencieux
    }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ne rien afficher pendant le chargement ou si une caisse est ouverte
  if (openCount === null || openCount > 0) return null;

  return (
    <div className="no-print bg-red-50 border-l-4 border-red-500 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">
          Aucune caisse ouverte
        </h3>
        <p className="text-xs text-red-700 mt-0.5">
          Ouvrez une caisse avant d'encaisser un acompte, une vente POS ou un paiement folio.
        </p>
      </div>
      <Link
        href="/dashboard/caisse/journal"
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-black transition"
      >
        Ouvrir la caisse
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
    </div>
  );
}
