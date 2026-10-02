'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

interface Health {
  status: string;
  uptimeHuman?: string;
  checks?: { database?: { latencyMs?: number; status?: string } };
}

export default function StatusIndicator() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  async function ping() {
    try {
      const res = await apiFetch('/api/health');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHealth(data);
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    ping();
    const i = setInterval(ping, 30000);
    return () => clearInterval(i);
  }, []);

  const dbOk = health?.checks?.database?.status === 'ok';
  const dbLatency = health?.checks?.database?.latencyMs ?? null;

  const globalOk = !error && health?.status === 'healthy';

  return (
    <button
      onClick={ping}
      title={
        error
          ? 'API injoignable'
          : globalOk
          ? `API OK · DB ${dbLatency}ms · Uptime ${health?.uptimeHuman || '?'}`
          : 'Statut dégradé'
      }
      className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white text-[11px] font-bold text-slate-600 transition shrink-0"
    >
      <span className={
        'w-1.5 h-1.5 rounded-full ' +
        (error ? 'bg-red-500' : globalOk ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
      } />
      <span className="font-mono">
        {error ? 'OFFLINE' : globalOk ? `${dbLatency}ms` : 'DEGRADED'}
      </span>
    </button>
  );
}
