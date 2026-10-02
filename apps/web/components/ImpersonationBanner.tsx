
'use client';

import { useEffect, useState } from 'react';

/**
 * Bandeau rouge en flux (au-dessus du header) quand on est en mode impersonation.
 * Pousse le contenu vers le bas au lieu de le recouvrir.
 */
export default function ImpersonationBanner() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    function check() {
      try {
        const raw = localStorage.getItem('impersonation');
        if (raw) setInfo(JSON.parse(raw));
        else setInfo(null);
      } catch {
        setInfo(null);
      }
    }
    check();
    window.addEventListener('storage', check);
    const i = setInterval(check, 2000);
    return () => {
      window.removeEventListener('storage', check);
      clearInterval(i);
    };
  }, []);

  async function exitImpersonation() {
    const original = localStorage.getItem('impersonationOriginal');
    if (original) {
      try {
        const parsed = JSON.parse(original);
        localStorage.setItem('token', parsed.token);
        if (parsed.refreshToken) localStorage.setItem('refreshToken', parsed.refreshToken);
      } catch { /* ignore */ }
    }
    localStorage.removeItem('impersonation');
    localStorage.removeItem('impersonationOriginal');
    window.location.href = '/dashboard/organizations';
  }

  if (!info) return null;

  return (
    <div className="bg-red-600 text-white shadow-sm border-b border-red-700">
      <div className="max-w-full px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="text-[11px] font-black tracking-widest shrink-0">MODE IMPERSONATION</span>
          <span className="text-xs text-red-100 truncate hidden sm:inline">
            · Connecté en tant que <strong>{info.target?.email}</strong>
            {info.organization?.name && ' · ' + info.organization.name}
          </span>
        </div>
        <button
          onClick={exitImpersonation}
          className="shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition"
        >
          ← Quitter
        </button>
      </div>
    </div>
  );
}
