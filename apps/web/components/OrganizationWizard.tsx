
'use client';

import { useState, useEffect } from 'react';
import { apiFetch, unwrap } from '../lib/api';
import { Modal, Button, FormField, Input, Select } from './ui';

// ═════════════════════════════════════════════════════════════
//  CONFIG
// ═════════════════════════════════════════════════════════════

const ORG_TYPES = [
  { value: 'HOTEL',       label: 'Hôtel',       icon: '🏨', grad: 'from-purple-500 to-pink-500' },
  { value: 'COMMERCE',    label: 'Commerce',    icon: '🛒', grad: 'from-blue-500 to-cyan-500' },
  { value: 'RESTAURANT',  label: 'Restaurant',  icon: '🍽️', grad: 'from-orange-500 to-red-600' },
  { value: 'ECOLE',       label: 'École',       icon: '🎓', grad: 'from-sky-500 to-indigo-500' },
  { value: 'CLINIQUE',    label: 'Clinique',    icon: '🏥', grad: 'from-teal-500 to-emerald-600' },
  { value: 'ONG',         label: 'ONG',         icon: '🌍', grad: 'from-green-500 to-emerald-500' },
  { value: 'MICROFINANCE',label: 'Microfinance',icon: '💰', grad: 'from-amber-500 to-orange-500' },
  { value: 'BANQUE',      label: 'Banque',      icon: '🏦', grad: 'from-slate-600 to-slate-800' },
];

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ═════════════════════════════════════════════════════════════
//  WIZARD
// ═════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (org: any) => void;
}

export default function OrganizationWizard({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 — Organisation
  const [type, setType] = useState('HOTEL');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Étape 2 — Admin
  const [createAdmin, setCreateAdmin] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  // Étape 3 — Modules + Abonnement
  const [allModules, setAllModules] = useState<any[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState('TRIAL');
  const [billingPeriod, setBillingPeriod] = useState('MONTHLY');
  const [loadingModules, setLoadingModules] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setType('HOTEL');
      setName(''); setSlug(''); setCity(''); setEmail(''); setPhone('');
      setSlugManuallyEdited(false);
      setCreateAdmin(true);
      setAdminEmail(''); setAdminPassword(''); setAdminName('');
      setSelectedModules([]);
      setSubscriptionStatus('TRIAL');
      setBillingPeriod('MONTHLY');
    }
  }, [open]);

  // Auto-slug
  useEffect(() => {
    if (!slugManuallyEdited && name.trim()) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  // Charger les modules quand on arrive à l'étape 3
  useEffect(() => {
    if (step === 3 && allModules.length === 0) {
      setLoadingModules(true);
      apiFetch('/api/modules', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setAllModules(unwrap(data)))
        .catch(console.error)
        .finally(() => setLoadingModules(false));
    }
  }, [step, allModules.length, token]);

  // Modules filtrés par type
  const modulesForType = allModules.filter((m) => {
    if (m.status !== 'ACTIVE') return false;
    if (!m.types) return true;
    return m.types.split(',').map((t: string) => t.trim()).includes(type);
  });

  // Total mensuel
  const totalMonthly = selectedModules.reduce((sum, id) => {
    const mod = allModules.find((m) => m.id === id);
    return sum + (mod?.price || 0);
  }, 0);

  // ─── Navigation ───
  function canGoNext(): boolean {
    if (step === 1) {
      return name.trim().length >= 2 && slug.trim().length >= 2 && type.length > 0;
    }
    if (step === 2) {
      if (!createAdmin) return true;
      return (
        adminEmail.trim().length > 0 &&
        adminPassword.length >= 8 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)
      );
    }
    return true;
  }

  function next() {
    if (!canGoNext()) return;
    setError(null);
    setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
    setError(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const body: any = {
        name: name.trim(),
        slug: slug.trim(),
        type,
        city: city.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      if (createAdmin) {
        body.adminEmail = adminEmail.trim();
        body.adminPassword = adminPassword;
        body.adminName = adminName.trim() || name.trim();
      }

      if (selectedModules.length > 0) {
        body.subscriptionStatus = subscriptionStatus;
        body.billingPeriod = billingPeriod;
        body.moduleIds = selectedModules;
      }

      const res = await apiFetch('/api/organizations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la création');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // ═════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle organisation"
      subtitle={
        step === 1 ? 'Étape 1/3 — Informations'
        : step === 2 ? 'Étape 2/3 — Administrateur'
        : 'Étape 3/3 — Modules & abonnement'
      }
      icon={<span className="text-2xl font-bold">+</span>}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : back}
            className="px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext()}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="px-6 py-2.5 bg-linear-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Création...' : '✓ Créer l\'organisation'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* ─── Stepper ─── */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center flex-1 gap-2">
              <div className={
                'w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition ' +
                (n < step ? 'bg-emerald-500 text-white' :
                 n === step ? 'bg-slate-900 text-white' :
                 'bg-slate-200 text-slate-400')
              }>
                {n < step ? '✓' : n}
              </div>
              {n < 3 && (
                <div className={'flex-1 h-0.5 rounded-full transition ' + (n < step ? 'bg-emerald-500' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ═══════════════ ÉTAPE 1 ═══════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Type en grille de cartes */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Type d'organisation <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ORG_TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={
                        'relative rounded-xl p-3 text-center transition ' +
                        (active
                          ? `bg-linear-to-br ${t.grad} text-white shadow-md scale-[1.02]`
                          : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400')
                      }
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="text-[10px] font-black tracking-wide uppercase leading-tight">
                        {t.label}
                      </div>
                      {active && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 text-[10px] font-black">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField label="Nom de l'organisation" required>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hôtel Colbert"
                autoFocus
                required
              />
            </FormField>

            <FormField label="Slug (identifiant unique)" required hint="Utilisé dans l'URL, unique à toutes les organisations">
              <Input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase());
                  setSlugManuallyEdited(true);
                }}
                placeholder="hotel-colbert"
                className="font-mono"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ville">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Antananarivo"
                />
              </FormField>
              <FormField label="Téléphone">
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+261 34 12 345 67"
                />
              </FormField>
            </div>

            <FormField label="Email de contact">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@organisation.mg"
              />
            </FormField>
          </div>
        )}

        {/* ═══════════════ ÉTAPE 2 ═══════════════ */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-lg shrink-0">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">Administrateur de l'organisation</p>
                <p className="text-xs text-slate-500 mt-1">
                  Cet utilisateur pourra gérer les utilisateurs, les données et les modules
                  de <strong>{name}</strong>.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createAdmin}
                onChange={(e) => setCreateAdmin(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Créer un compte administrateur maintenant
              </span>
            </label>

            {createAdmin && (
              <>
                <FormField label="Email de l'administrateur" required>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder={`admin@${slug || 'organisation'}.mg`}
                    required
                  />
                </FormField>

                <FormField label="Nom complet">
                  <Input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </FormField>

                <FormField label="Mot de passe temporaire" required hint="Minimum 8 caractères — l'utilisateur pourra le changer après connexion">
                  <Input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="TempPass123!"
                    className="font-mono"
                    required
                  />
                </FormField>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <strong>⚠️ Notez ce mot de passe</strong> — il ne sera plus affiché après la création.
                  L'admin devra le changer à sa première connexion.
                </div>
              </>
            )}

            {!createAdmin && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                L'organisation sera créée sans administrateur. Vous pourrez en ajouter plus tard
                depuis la page <strong>Utilisateurs</strong>.
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ ÉTAPE 3 ═══════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Abonnement */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Statut de l'abonnement">
                <Select
                  value={subscriptionStatus}
                  onChange={(e) => setSubscriptionStatus(e.target.value)}
                >
                  <option value="TRIAL">Essai gratuit (TRIAL)</option>
                  <option value="ACTIVE">Actif (facturé)</option>
                  <option value="SUSPENDED">Suspendu</option>
                </Select>
              </FormField>
              <FormField label="Période de facturation">
                <Select
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                >
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">Trimestriel</option>
                  <option value="ANNUAL">Annuel</option>
                </Select>
              </FormField>
            </div>

            {/* Modules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Modules à activer
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedModules.length} sélectionné{selectedModules.length > 1 ? 's' : ''}
                    {totalMonthly > 0 && ` · ${totalMonthly.toLocaleString('fr-FR')} Ar / mois`}
                  </p>
                </div>
                {modulesForType.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedModules(
                      selectedModules.length === modulesForType.length
                        ? []
                        : modulesForType.map((m) => m.id)
                    )}
                    className="text-xs font-bold text-teal-600 hover:underline"
                  >
                    {selectedModules.length === modulesForType.length ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                )}
              </div>

              {loadingModules ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Chargement des modules...
                </div>
              ) : modulesForType.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">
                    Aucun module disponible pour le type <strong>{type}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {modulesForType.map((m) => {
                    const checked = selectedModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={
                          'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' +
                          (checked
                            ? 'bg-teal-50 border-teal-400'
                            : 'bg-white border-slate-200 hover:border-slate-400')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModules([...selectedModules, m.id]);
                            } else {
                              setSelectedModules(selectedModules.filter((id) => id !== m.id));
                            }
                          }}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {m.route}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-900 text-sm tabular-nums">
                            {m.price > 0 ? m.price.toLocaleString('fr-FR') : 'Gratuit'}
                          </div>
                          {m.price > 0 && (
                            <div className="text-[9px] text-slate-400">Ar / mois</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Récap */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">
                Récapitulatif
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Organisation</span>
                  <span className="font-bold">{name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="font-bold">
                    {ORG_TYPES.find((t) => t.value === type)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admin</span>
                  <span className="font-bold truncate max-w-[200px]">
                    {createAdmin && adminEmail ? adminEmail : 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Abonnement</span>
                  <span className="font-bold">
                    {subscriptionStatus} · {billingPeriod.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-400">
                    {selectedModules.length} module{selectedModules.length > 1 ? 's' : ''}
                  </span>
                  <span className="font-black text-teal-400 tabular-nums">
                    {totalMonthly.toLocaleString('fr-FR')} Ar / mois
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
