'use client';

import { useEffect, useState } from 'react';
import { apiFetch, clearTokens } from '../../lib/api';

export default function MaintenancePage() {
  const [info, setInfo] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('maintenance_info');
      if (raw) setInfo(JSON.parse(raw));
    } catch { /* ignore */ }

    // Détecte si l'utilisateur connecté est super admin (pour lui montrer un bouton d'accès)
    apiFetch('/api/auth/me').then((r) => {
      if (r.ok) return r.json();
      return null;
    }).then((u) => {
      if (u?.role === 'SUPER_ADMIN') setIsSuperAdmin(true);
    }).catch(() => {});
  }, []);

  function logout() {
    clearTokens();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl shadow-2xl mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-3">Maintenance en cours</h1>
        <p className="text-slate-300 text-base leading-relaxed mb-8">
          {info?.message || 'La plateforme est en maintenance. Merci de revenir dans quelques minutes.'}
        </p>

        {info?.scheduledEnd && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/10">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Retour prévu</p>
            <p className="text-white font-bold text-base">
              {new Date(info.scheduledEnd).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg transition"
          >
            ↻ Réessayer
          </button>

          {isSuperAdmin ? (
            <a
              href="/dashboard"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold transition"
            >
              Accès Super Admin
            </a>
          ) : (
            <button
              onClick={logout}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold transition"
            >
              Se déconnecter
            </button>
          )}
        </div>

        <p className="text-slate-500 text-xs mt-10">
          NEXUS OS · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
