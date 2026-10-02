'use client';

import { useState } from 'react';
import { apiFetch, setTokens } from '../../lib/api';
import { useRouter } from 'next/navigation';

type MultiOrgOption = { slug: string; name: string };
type SuspendedInfo = {
  name: string;
  reason: string;
  suspendedAt?: string;
  slug?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [multiOrg, setMultiOrg] = useState<MultiOrgOption[] | null>(null);
  const [suspendedInfo, setSuspendedInfo] = useState<SuspendedInfo | null>(null);

  async function doLogin(organizationSlug?: string) {
    setLoading(true);
    setError(null);
    try {
      const body: any = { email, password };
      if (organizationSlug) body.organizationSlug = organizationSlug;

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // Multi-organisation : sélection d'organisation requise
        if (data.code === 'MULTI_ORG' && Array.isArray(data.organizations)) {
          setMultiOrg(data.organizations);
          setLoading(false);
          return;
        }
        // Organisation suspendue
        if (data.code === 'ORG_SUSPENDED') {
          setSuspendedInfo({
            name: data.organization?.name || 'Votre organisation',
            reason: data.organization?.reason || 'Non précisée',
            suspendedAt: data.organization?.suspendedAt,
            slug: data.organization?.slug,
          });
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'Erreur de connexion');
      }

      setTokens(data.accessToken || data.token, data.refreshToken);
      localStorage.setItem('role', data.user.role);
      if (data.user.isOwner) localStorage.setItem('isOwner', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doLogin();
  }

  function handlePickOrg(slug: string) {
    setMultiOrg(null);
    doLogin(slug);
  }

  // ═════════════════════════════════════════════════════════════
  //  ÉCRAN 1 — Organisation suspendue
  // ═════════════════════════════════════════════════════════════
  if (suspendedInfo) {
    const suspendedAt = suspendedInfo.suspendedAt
      ? new Date(suspendedInfo.suspendedAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Compte suspendu</h1>
            <p className="text-slate-300 mt-2 text-sm">L&apos;accès est actuellement bloqué</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 space-y-4">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-white/10">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                Organisation
              </p>
              <p className="font-bold text-white text-base">{suspendedInfo.name}</p>
            </div>

            <div className="bg-red-500/15 rounded-xl p-4 border border-red-400/30">
              <p className="text-[10px] text-red-200 uppercase font-black tracking-widest mb-2">
                Motif de suspension
              </p>
              <p className="text-sm text-white font-medium leading-relaxed whitespace-pre-wrap">
                {suspendedInfo.reason}
              </p>
            </div>

            {suspendedAt && (
              <div className="bg-slate-900/40 rounded-xl p-3 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Suspendue le</span>
                <span className="font-bold text-white">{suspendedAt}</span>
              </div>
            )}

            <div className="bg-amber-500/15 rounded-xl p-4 border border-amber-400/30 text-xs text-amber-100 space-y-1">
              <p className="font-bold uppercase tracking-widest text-[10px] mb-1">
                💡 Que faire ?
              </p>
              <p>• Contactez votre administrateur ou le support NEXUS OS</p>
              <p>• Régularisez la situation (facture impayée, etc.)</p>
              <p>• Vos données sont conservées intactes</p>
            </div>

            <button
              onClick={() => {
                setSuspendedInfo(null);
                setError(null);
                setPassword('');
              }}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition text-sm"
            >
              ← Retour à la connexion
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            © {new Date().getFullYear()} NEXUS OS
          </p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  //  ÉCRAN 2 — Sélection d'organisation (multi-tenant)
  // ═════════════════════════════════════════════════════════════
  if (multiOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Choisir une organisation
            </h1>
            <p className="text-slate-300 mt-2 text-sm">
              Votre email est associé à plusieurs organisations
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 space-y-3">
            {multiOrg.map((org) => (
              <button
                key={org.slug}
                onClick={() => handlePickOrg(org.slug)}
                disabled={loading}
                className="w-full flex items-center justify-between gap-3 p-4 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl transition text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {org.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{org.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {org.slug}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}

            <button
              onClick={() => {
                setMultiOrg(null);
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-300 hover:text-white py-2 transition"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  //  ÉCRAN 3 — Login standard
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NEXUS OS</h1>
          <p className="text-slate-300 mt-2">Plateforme de gestion d&apos;entreprise</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                  placeholder="admin@nexus.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © {new Date().getFullYear()} NEXUS OS — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
