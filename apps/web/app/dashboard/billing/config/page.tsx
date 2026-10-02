'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import { Select } from '../../../../components/ui';

const COUNTRIES = [
  'Madagascar', 'France', 'Belgique', 'Suisse', 'Canada',
  'Île Maurice', 'Comores', 'Mayotte', 'Réunion', 'Autre',
];

const COLOR_PALETTE = [
  '#0f172a', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f59e0b', '#10b981', '#ef4444',
];

export default function BillingConfigPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Madagascar');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState('20');
  const [vatLabel, setVatLabel] = useState('TVA');
  const [invoicePrefix, setInvoicePrefix] = useState('FAC');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Paiement à réception de facture');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function loadOrgs() {
    const res = await apiFetch('/api/organizations/clients', { headers });
    const data = await res.json();
    setOrgs(Array.isArray(data) ? data : []);
    if (Array.isArray(data) && data.length > 0) {
      setSelectedOrg(data[0].id);
    }
  }

  async function loadConfig(orgId: string) {
    if (!orgId) return;
    setLoading(true);
    const res = await apiFetch(`/api/billing-config/organization/${orgId}`, { headers });
    if (res.ok) {
      const c = await res.json();
      setConfig(c);
      setLegalName(c.legalName || '');
      setTaxId(c.taxId || '');
      setVatNumber(c.vatNumber || '');
      setAddressLine1(c.addressLine1 || '');
      setAddressLine2(c.addressLine2 || '');
      setPostalCode(c.postalCode || '');
      setCity(c.city || '');
      setCountry(c.country || 'Madagascar');
      setVatEnabled(c.vatEnabled || false);
      setVatRate(String(c.vatRate ?? 20));
      setVatLabel(c.vatLabel || 'TVA');
      setInvoicePrefix(c.invoicePrefix || 'FAC');
      setInvoiceFooter(c.invoiceFooter || '');
      setPaymentTerms(c.paymentTerms || 'Paiement à réception de facture');
      setLogoUrl(c.logoUrl || '');
      setPrimaryColor(c.primaryColor || '#0f172a');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrgs().catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedOrg) loadConfig(selectedOrg).catch(console.error);
  }, [selectedOrg]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function save() {
    if (!selectedOrg) return;
    setSaving(true);
    const res = await apiFetch(`/api/billing-config/organization/${selectedOrg}`, {
      method: 'POST', headers,
      body: JSON.stringify({
        legalName, taxId, vatNumber,
        addressLine1, addressLine2, postalCode, city, country,
        vatEnabled, vatRate: parseFloat(vatRate) || 0, vatLabel,
        invoicePrefix, invoiceFooter, paymentTerms,
        logoUrl, primaryColor,
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('Configuration enregistrée');
      const c = await res.json();
      setConfig(c);
    } else {
      const d = await res.json();
      showToast(d.message || 'Erreur');
    }
  }

  async function openInvoicePreview() {
    if (!selectedOrg) return;
    const body = {
      subtotal: 100000,
      organizationName: selectedOrgData?.name,
      customer: {
        name: 'Client Exemple',
        email: 'client@exemple.mg',
        phone: '+261 34 00 000 00',
        city: 'Antananarivo',
      },
      items: [
        { description: 'Module Caisse — Octobre 2026', quantity: 1, unitPrice: 30000, total: 30000 },
        { description: 'Module Réservation — Octobre 2026', quantity: 1, unitPrice: 25000, total: 25000 },
        { description: 'Module Stock — Octobre 2026', quantity: 1, unitPrice: 45000, total: 45000 },
      ],
    };

    const res = await apiFetch(`/api/billing-config/organization/${selectedOrg}/preview-html`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const html = await res.text();
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  const selectedOrgData = orgs.find((o) => o.id === selectedOrg);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Facturation</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Configuration TVA</h1>
          <p className="text-slate-500 mt-1 text-sm">Identité fiscale, TVA et branding des factures</p>
        </div>
        <a href="/dashboard/billing" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
          ← Retour facturation
        </a>
      </div>

      {/* Sélection organisation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
          Organisation à configurer
        </label>
        <Select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} — {o.type || 'Client'}
            </option>
          ))}
        </Select>
      </div>

      {selectedOrgData && (
        <>
          {/* Section : Identité fiscale */}
          <Section icon="🏢" title="Identité fiscale">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Raison sociale">
                <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)}
                  className="input" placeholder="Nom légal sur la facture" />
              </Field>
              <Field label="NIF / IFU / SIRET">
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)}
                  className="input" placeholder="Numéro d'identification fiscale" />
              </Field>
              <Field label="N° TVA intracommunautaire" hint="Optionnel">
                <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)}
                  className="input" placeholder="FR12345678901" />
              </Field>
              <Field label="Pays">
                <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          </Section>

          {/* Section : Adresse */}
          <Section icon="📍" title="Adresse de facturation">
            <div className="space-y-3">
              <Field label="Adresse ligne 1">
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                  className="input" placeholder="N° de rue + nom de rue" />
              </Field>
              <Field label="Adresse ligne 2" hint="Optionnel">
                <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)}
                  className="input" placeholder="Bâtiment, étage…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code postal">
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    className="input" placeholder="101" />
                </Field>
                <Field label="Ville">
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="input" placeholder="Antananarivo" />
                </Field>
              </div>
            </div>
          </Section>

          {/* Section : TVA */}
          <Section icon="💰" title="TVA">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-4">
              <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">Activer la TVA sur les factures</p>
                <p className="text-xs text-slate-500">Si décoché, les factures seront émises sans TVA</p>
              </div>
            </div>

            {vatEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Taux (%)">
                  <input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)}
                    className="input" placeholder="20" />
                </Field>
                <Field label="Libellé">
                  <input type="text" value={vatLabel} onChange={(e) => setVatLabel(e.target.value)}
                    className="input" placeholder="TVA" />
                </Field>
              </div>
            )}
          </Section>

          {/* Section : Facture */}
          <Section icon="📄" title="Modèle de facture">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Field label="Préfixe de numérotation" hint="Ex: FAC → FAC-2026-0001">
                <input type="text" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  className="input font-mono" placeholder="FAC" maxLength={10} />
              </Field>
              <Field label="Conditions de paiement">
                <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
                  className="input" placeholder="Paiement à réception" />
              </Field>
            </div>
            <Field label="Mentions de pied de facture" hint="SIRET, RCS, mentions légales…">
              <textarea value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)} rows={3}
                className="input resize-none" placeholder="Ex: TVA non applicable, art. 293 B du CGI" />
            </Field>
          </Section>

          {/* Section : Branding */}
          <Section icon="🎨" title="Branding PDF">
            <div className="space-y-3">
              <Field label="URL du logo" hint="Format carré conseillé (200×200 px)">
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  className="input font-mono text-xs" placeholder="https://votre-domaine.com/logo.png" />
              </Field>
              <Field label="Couleur principale">
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => setPrimaryColor(c)}
                      className={'w-9 h-9 rounded-lg transition ' + (primaryColor === c ? 'ring-4 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110')}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer" />
                </div>
              </Field>
            </div>
          </Section>

          {/* Preview Aperçu */}
          <Section icon="👁️" title="Aperçu">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50">
              <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6" style={{ borderTop: `4px solid ${primaryColor}` }}>
                <div className="flex items-start justify-between mb-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-12 object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-lg" style={{ background: primaryColor }}>
                      {selectedOrgData.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Facture</p>
                    <p className="text-sm font-black text-slate-900 font-mono">
                      {invoicePrefix}-{new Date().getFullYear()}-0001
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-black text-slate-900">{legalName || selectedOrgData.name}</p>
                  {addressLine1 && <p className="text-[11px] text-slate-600">{addressLine1}</p>}
                  {addressLine2 && <p className="text-[11px] text-slate-600">{addressLine2}</p>}
                  {postalCode && city && <p className="text-[11px] text-slate-600">{postalCode} {city}</p>}
                  {taxId && <p className="text-[10px] text-slate-400 mt-1">NIF : {taxId}</p>}
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Sous-total HT</span>
                    <span className="font-bold tabular-nums">100 000 Ar</span>
                  </div>
                  {vatEnabled && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">{vatLabel} {vatRate}%</span>
                      <span className="font-bold tabular-nums">
                        {(100000 * parseFloat(vatRate) / 100).toLocaleString('fr-FR')} Ar
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                    <span className="font-black text-slate-900">Total TTC</span>
                    <span className="font-black tabular-nums" style={{ color: primaryColor }}>
                      {vatEnabled
                        ? (100000 * (1 + parseFloat(vatRate) / 100)).toLocaleString('fr-FR')
                        : '100 000'} Ar
                    </span>
                  </div>
                </div>

                {invoiceFooter && (
                  <p className="text-[9px] text-slate-400 mt-4 pt-3 border-t border-slate-100 italic">
                    {invoiceFooter}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Actions */}
          <div className="sticky bottom-4 bg-white rounded-xl border border-slate-200 p-4 shadow-lg flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Les modifications s'appliquent aux <strong>nouvelles factures</strong> de <strong>{selectedOrgData.name}</strong>
            </p>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : '✓ Enregistrer la configuration'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

function Section({ icon, title, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
