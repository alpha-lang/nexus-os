/**
 * Génère le HTML d'une facture (prêt à imprimer en PDF via window.print()).
 * Le client ouvre l'endpoint dans un nouvel onglet → window.print() → Save as PDF.
 */
export interface InvoiceData {
  number: string;
  date: string;
  dueDate?: string;
  organization: {
    name: string;
    legalName?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    taxId?: string | null;
    vatNumber?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    taxId?: string | null;
  };
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  vatEnabled: boolean;
  vatRate: number;
  vatLabel: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  footer?: string | null;
  paymentTerms?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
}

export function renderInvoiceHtml(data: InvoiceData): string {
  const primary = data.primaryColor || '#0f172a';
  const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const lines = data.items.map((it) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${it.description}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${it.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(it.unitPrice)} Ar</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">${fmt(it.total)} Ar</td>
    </tr>
  `).join('');

  const vatLine = data.vatEnabled ? `
    <tr>
      <td style="padding:6px 8px;text-align:right;color:#64748b">${data.vatLabel} ${data.vatRate}%</td>
      <td style="padding:6px 8px;text-align:right;font-weight:600">${fmt(data.vatAmount)} Ar</td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${data.number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; background: white; }
  .actions { position: fixed; top: 20px; right: 20px; z-index: 100; display: flex; gap: 8px; }
  .btn { padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-primary { background: ${primary}; color: white; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary { background: white; color: #0f172a; border: 1px solid #cbd5e1; }
  .invoice { max-width: 800px; margin: 40px auto; padding: 40px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid ${primary}; margin-bottom: 30px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo { width: 56px; height: 56px; border-radius: 12px; background: ${primary}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; }
  .company-name { font-size: 20px; font-weight: 900; color: #0f172a; }
  .company-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { margin: 0; font-size: 28px; font-weight: 900; color: ${primary}; letter-spacing: 1px; }
  .invoice-num { font-size: 13px; font-weight: bold; font-family: 'Courier New', monospace; color: #0f172a; margin-top: 4px; }
  .invoice-date { font-size: 11px; color: #64748b; margin-top: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .party h3 { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0; }
  .party p { font-size: 12px; color: #475569; margin: 2px 0; line-height: 1.5; }
  .party strong { color: #0f172a; font-weight: 700; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #f8fafc; padding: 12px 8px; text-align: left; font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
  .totals table { width: 300px; margin: 0; }
  .totals td { font-size: 13px; padding: 6px 8px; }
  .total-row td { border-top: 2px solid ${primary}; padding-top: 12px; font-size: 18px; font-weight: 900; color: ${primary}; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; line-height: 1.6; text-align: center; }
  .legal { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #e2e8f0; font-style: italic; }
  @media print {
    .actions { display: none !important; }
    .invoice { margin: 0; padding: 0; }
    body { background: white; }
  }
</style>
</head>
<body>

<div class="actions">
  <button class="btn btn-secondary" onclick="window.close()">Fermer</button>
  <button class="btn btn-primary" onclick="window.print()">📥 Télécharger PDF</button>
</div>

<div class="invoice">
  <div class="header">
    <div class="brand">
      ${data.logoUrl
        ? `<img src="${data.logoUrl}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:12px">`
        : `<div class="logo">${data.organization.name?.charAt(0).toUpperCase() || 'N'}</div>`}
      <div>
        <div class="company-name">${data.organization.legalName || data.organization.name}</div>
        <div class="company-meta">${data.organization.city || ''}${data.organization.country ? ' · ' + data.organization.country : ''}</div>
      </div>
    </div>
    <div class="invoice-title">
      <h1>FACTURE</h1>
      <div class="invoice-num">${data.number}</div>
      <div class="invoice-date">Émise le ${fmtDate(data.date)}</div>
      ${data.dueDate ? `<div class="invoice-date">Échéance : ${fmtDate(data.dueDate)}</div>` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Émetteur</h3>
      <p><strong>${data.organization.legalName || data.organization.name}</strong></p>
      ${data.organization.addressLine1 ? `<p>${data.organization.addressLine1}</p>` : ''}
      ${data.organization.addressLine2 ? `<p>${data.organization.addressLine2}</p>` : ''}
      ${data.organization.postalCode || data.organization.city
        ? `<p>${data.organization.postalCode || ''} ${data.organization.city || ''}</p>` : ''}
      ${data.organization.country ? `<p>${data.organization.country}</p>` : ''}
      ${data.organization.email ? `<p>${data.organization.email}</p>` : ''}
      ${data.organization.phone ? `<p>${data.organization.phone}</p>` : ''}
      ${data.organization.taxId ? `<p style="margin-top:6px;font-size:10px;color:#94a3b8">NIF : ${data.organization.taxId}</p>` : ''}
      ${data.organization.vatNumber ? `<p style="font-size:10px;color:#94a3b8">TVA : ${data.organization.vatNumber}</p>` : ''}
    </div>
    <div class="party">
      <h3>Client</h3>
      <p><strong>${data.customer.name}</strong></p>
      ${data.customer.address ? `<p>${data.customer.address}</p>` : ''}
      ${data.customer.city ? `<p>${data.customer.city}</p>` : ''}
      ${data.customer.email ? `<p>${data.customer.email}</p>` : ''}
      ${data.customer.phone ? `<p>${data.customer.phone}</p>` : ''}
      ${data.customer.taxId ? `<p style="margin-top:6px;font-size:10px;color:#94a3b8">NIF : ${data.customer.taxId}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Description</th>
        <th style="text-align:center;width:80px">Qté</th>
        <th style="text-align:right;width:140px">P.U.</th>
        <th style="text-align:right;width:140px">Total</th>
      </tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td style="text-align:right;color:#64748b">Sous-total HT</td>
        <td style="text-align:right;font-weight:600">${fmt(data.subtotal)} Ar</td>
      </tr>
      ${vatLine}
      <tr class="total-row">
        <td style="text-align:right">Total TTC</td>
        <td style="text-align:right">${fmt(data.total)} Ar</td>
      </tr>
    </table>
  </div>

  ${data.paymentTerms ? `
    <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:11px;color:#475569">
      <strong style="color:#0f172a">Conditions de paiement :</strong> ${data.paymentTerms}
    </div>
  ` : ''}

  <div class="footer">
    ${data.organization.legalName || data.organization.name}
    ${data.organization.addressLine1 ? ` · ${data.organization.addressLine1}` : ''}
    ${data.organization.city ? ` · ${data.organization.city}` : ''}
    ${data.organization.email ? `<br>${data.organization.email}` : ''}
    ${data.organization.phone ? ` · ${data.organization.phone}` : ''}
  </div>

  ${data.footer ? `<div class="legal">${data.footer}</div>` : ''}
</div>

<script>
  // Auto-print si demandé via ?print=1
  if (new URLSearchParams(location.search).get('print') === '1') {
    window.addEventListener('load', () => setTimeout(() => window.print(), 300));
  }
</script>
</body>
</html>`;
}
