'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════

const NAV = [
  { id: 'intro',         label: '🚀 Introduction' },
  { id: 'auth',          label: '🔑 Authentification' },
  { id: 'endpoints',     label: '🌐 Endpoints REST' },
  { id: 'examples',      label: '�� Exemples cURL' },
  { id: 'webhooks',      label: '🔔 Webhooks' },
  { id: 'signature',     label: '🔒 Vérif. signature' },
  { id: 'limits',        label: '⚡ Limites' },
  { id: 'support',       label: '💬 Support' },
];

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/partners',
    desc: 'Liste paginée des partenaires (clients + fournisseurs)',
    scope: 'READ',
    params: [
      { name: 'type',     type: 'string',  desc: 'CUSTOMER | SUPPLIER | BOTH' },
      { name: 'search',   type: 'string',  desc: 'Recherche par nom, email, téléphone' },
      { name: 'cursor',   type: 'string',  desc: 'Curseur de pagination' },
      { name: 'take',     type: 'number',  desc: 'Nombre de résultats (max 100)' },
    ],
  },
  {
    method: 'GET',
    path: '/partners/:id',
    desc: 'Détail d\'un partenaire',
    scope: 'READ',
    params: [],
  },
  {
    method: 'GET',
    path: '/partners/:id/full',
    desc: 'Détail complet avec historique (réservations, ventes, notes)',
    scope: 'READ',
    params: [],
  },
  {
    method: 'POST',
    path: '/partners',
    desc: 'Créer un partenaire',
    scope: 'WRITE',
    params: [
      { name: 'type',      type: 'string',  desc: 'Requis. CUSTOMER | SUPPLIER | BOTH' },
      { name: 'name',      type: 'string',  desc: 'Requis. Nom / raison sociale' },
      { name: 'firstName', type: 'string',  desc: 'Prénom (si CUSTOMER)' },
      { name: 'lastName',  type: 'string',  desc: 'Nom (si CUSTOMER)' },
      { name: 'email',     type: 'string',  desc: 'Email de contact' },
      { name: 'phone',     type: 'string',  desc: 'Téléphone' },
      { name: 'city',      type: 'string',  desc: 'Ville' },
      { name: 'address',   type: 'string',  desc: 'Adresse' },
    ],
  },
  {
    method: 'GET',
    path: '/stock/items',
    desc: 'Liste des articles de stock',
    scope: 'READ',
    params: [
      { name: 'category', type: 'string',  desc: 'ALIMENTAIRE | BOISSON | ...' },
      { name: 'search',   type: 'string',  desc: 'Recherche par nom / SKU' },
      { name: 'status',   type: 'string',  desc: 'CRITICAL | OUT' },
    ],
  },
  {
    method: 'POST',
    path: '/stock/items',
    desc: 'Créer un article de stock',
    scope: 'WRITE',
    params: [
      { name: 'name',        type: 'string',  desc: 'Requis' },
      { name: 'sku',         type: 'string',  desc: 'Référence unique' },
      { name: 'category',    type: 'string',  desc: 'Catégorie' },
      { name: 'unit',        type: 'string',  desc: 'piece | kg | L ...' },
      { name: 'currentStock', type: 'number', desc: 'Stock initial' },
      { name: 'minStock',    type: 'number',  desc: 'Seuil d\'alerte' },
      { name: 'costPrice',   type: 'number',  desc: 'Prix d\'achat' },
    ],
  },
  {
    method: 'GET',
    path: '/hotel/reservations',
    desc: 'Liste des réservations',
    scope: 'READ',
    params: [
      { name: 'status', type: 'string', desc: 'PENDING | CONFIRMED | CHECKED_IN ...' },
      { name: 'from',   type: 'date',   desc: 'Arrivée min (ISO 8601)' },
      { name: 'to',     type: 'date',   desc: 'Arrivée max (ISO 8601)' },
    ],
  },
  {
    method: 'POST',
    path: '/hotel/reservations',
    desc: 'Créer une réservation',
    scope: 'WRITE',
    params: [
      { name: 'customerId',   type: 'string', desc: 'Requis. ID du client' },
      { name: 'roomId',       type: 'string', desc: 'Requis. ID de la chambre' },
      { name: 'checkInDate',  type: 'date',   desc: 'Requis. ISO 8601' },
      { name: 'checkOutDate', type: 'date',   desc: 'Requis. ISO 8601' },
      { name: 'adults',       type: 'number', desc: 'Défaut : 1' },
      { name: 'children',     type: 'number', desc: 'Défaut : 0' },
      { name: 'totalAmount',  type: 'number', desc: 'Auto-calculé si omis' },
    ],
  },
];

const EVENTS = [
  { event: 'partner.created',           desc: 'Un partenaire est créé',                       payload: ['id', 'name', 'email', 'phone', 'type', 'createdAt'] },
  { event: 'partner.updated',           desc: 'Un partenaire est modifié',                    payload: ['id', 'name', 'changes'] },
  { event: 'reservation.created',       desc: 'Une réservation est créée',                    payload: ['id', 'reference', 'customer', 'roomNumber', 'checkInDate', 'checkOutDate', 'totalAmount', 'status'] },
  { event: 'reservation.updated',       desc: 'Une réservation est modifiée',                 payload: ['id', 'reference', 'changes'] },
  { event: 'reservation.cancelled',     desc: 'Une réservation est annulée',                  payload: ['id', 'reference', 'reason'] },
  { event: 'reservation.checked_in',    desc: 'Un client fait son check-in',                  payload: ['id', 'reference', 'customer', 'roomNumber', 'checkedInAt'] },
  { event: 'reservation.checked_out',   desc: 'Un client fait son check-out',                 payload: ['id', 'reference', 'customer', 'roomNumber', 'totalAmount', 'paidAmount', 'checkedOutAt'] },
  { event: 'sale.completed',            desc: 'Une vente est enregistrée',                    payload: ['id', 'quantity', 'total', 'itemName', 'customer'] },
  { event: 'pos.sale_completed',        desc: 'Une vente POS est encaissée',                  payload: ['id', 'total', 'paidAmount', 'method', 'tableNumber', 'roomNumber', 'itemsCount'] },
  { event: 'payment.received',          desc: 'Un paiement est reçu',                         payload: ['id', 'amount', 'method', 'reference'] },
  { event: 'stock.low',                 desc: 'Un article passe sous son seuil minimum',      payload: ['id', 'name', 'sku', 'currentStock', 'minStock', 'unit'] },
  { event: 'stock.out',                 desc: 'Un article est en rupture de stock',           payload: ['id', 'name', 'sku', 'minStock', 'unit'] },
  { event: 'stock.movement',            desc: 'Un mouvement de stock est enregistré',         payload: ['id', 'itemId', 'type', 'quantity', 'reason'] },
  { event: 'cash.session_opened',       desc: 'Une session de caisse est ouverte',            payload: ['id', 'registerName', 'openingAmount', 'userId'] },
  { event: 'cash.session_closed',       desc: 'Une session de caisse est fermée',             payload: ['id', 'registerName', 'closingAmount', 'difference'] },
  { event: 'ticket.created',            desc: 'Un ticket support est créé',                   payload: ['id', 'reference', 'title', 'priority', 'category'] },
  { event: 'ticket.resolved',           desc: 'Un ticket support est résolu',                 payload: ['id', 'reference', 'resolution'] },
];

// ═══════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════

export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState('intro');

  function scrollTo(id: string) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">Documentation API</h1>
              <p className="text-blue-200 mt-1 text-xs sm:text-sm">Intégrez NEXUS OS dans vos outils externes</p>
            </div>
          </div>
          <p className="text-slate-300 max-w-3xl mt-3 sm:mt-4 text-sm sm:text-base">
            L'API REST NEXUS OS vous permet de lire et écrire vos données (clients, réservations, stock…)
            et de recevoir des événements via webhooks. Simple, sécurisée, versionnée.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <a href="/login" className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs sm:text-sm hover:shadow-lg transition">
              Se connecter pour générer une clé
            </a>
            <a href="#intro" onClick={(e) => { e.preventDefault(); scrollTo('intro'); }} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-xl font-bold text-xs sm:text-sm hover:bg-white/20 transition">
              Commencer →
            </a>
          </div>
        </div>
      </header>

      {/* Layout 2 colonnes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex gap-4 sm:gap-8">
        {/* Sidebar sticky */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">Sommaire</p>
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ' + (
                  activeSection === item.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-200'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-8 sm:space-y-10">
          {/* Intro */}
          <Section id="intro" title="Introduction">
            <p className="text-slate-700 leading-relaxed mb-4">
              L'API NEXUS OS est une API REST moderne avec authentification par clé.
              Toutes les réponses sont en <strong>JSON UTF-8</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoCard icon="🌐" title="URL de base" value="https://api.nexus-os.com" mono />
              <InfoCard icon="📦" title="Format" value="JSON" />
              <InfoCard icon="🔐" title="Auth" value="Header X-API-Key" />
            </div>
          </Section>

          {/* Auth */}
          <Section id="auth" title="Authentification">
            <p className="text-slate-700 leading-relaxed mb-4">
              Toutes les requêtes doivent inclure votre clé API dans le header <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">X-API-Key</code>.
            </p>

            <Step n="1" title="Générez une clé API">
              Rendez-vous sur <a href="/dashboard/api-keys" className="text-teal-600 hover:underline font-bold">/dashboard/api-keys</a> en tant qu'admin de votre organisation.
            </Step>

            <Step n="2" title="Choisissez vos scopes">
              <ul className="space-y-1.5 mt-2">
                <li><code className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-bold">READ</code> — Consulter les données</li>
                <li><code className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold">WRITE</code> — Créer et modifier (inclut READ)</li>
                <li><code className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold">ADMIN</code> — Contrôle total</li>
              </ul>
            </Step>

            <Step n="3" title="Copiez votre clé">
              La clé en clair n'est affichée <strong>qu'une seule fois</strong> à la création. Conservez-la dans un gestionnaire de secrets.
            </Step>

            <CodeBlock label="Header d'authentification">
{`X-API-Key: nexus_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </CodeBlock>
          </Section>

          {/* Endpoints */}
          <Section id="endpoints" title="Endpoints REST">
            <p className="text-slate-700 leading-relaxed mb-6">
              {ENDPOINTS.length} endpoints publics disponibles. Chaque endpoint est protégé par un scope.
            </p>

            <div className="space-y-4">
              {ENDPOINTS.map((ep, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className={'text-[10px] font-black tracking-widest px-2.5 py-1 rounded ' + (
                      ep.method === 'GET'  ? 'bg-emerald-100 text-emerald-700' :
                      ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      ep.method === 'PATCH' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {ep.method}
                    </span>
                    <code className="font-mono text-xs sm:text-sm font-bold text-slate-900 flex-1 truncate">{ep.path}</code>
                    <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {ep.scope}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600 mb-3">{ep.desc}</p>
                    {ep.params.length > 0 && (
                      <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead className="text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="text-left pb-2">Paramètre</th>
                            <th className="text-left pb-2">Type</th>
                            <th className="text-left pb-2">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ep.params.map((p, j) => (
                            <tr key={j}>
                              <td className="py-2 font-mono font-bold text-slate-900">{p.name}</td>
                              <td className="py-2 text-slate-500 font-mono">{p.type}</td>
                              <td className="py-2 text-slate-600">{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Examples */}
          <Section id="examples" title="Exemples cURL">
            <CodeBlock label="Lister les partenaires">
{`curl https://api.nexus-os.com/partners \\
  -H "X-API-Key: $NEXUS_API_KEY"`}
            </CodeBlock>

            <CodeBlock label="Créer un client">
{`curl -X POST https://api.nexus-os.com/partners \\
  -H "X-API-Key: $NEXUS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "CUSTOMER",
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "+261 34 12 345 67"
  }'`}
            </CodeBlock>

            <CodeBlock label="Lister les réservations en cours">
{`curl "https://api.nexus-os.com/hotel/reservations?status=CHECKED_IN" \\
  -H "X-API-Key: $NEXUS_API_KEY"`}
            </CodeBlock>

            <CodeBlock label="Rechercher un article de stock">
{`curl "https://api.nexus-os.com/stock/items?search=farine" \\
  -H "X-API-Key: $NEXUS_API_KEY"`}
            </CodeBlock>
          </Section>

          {/* Webhooks */}
          <Section id="webhooks" title="Webhooks">
            <p className="text-slate-700 leading-relaxed mb-4">
              Recevez une notification <strong>HTTP POST</strong> dès qu'un événement se produit dans votre organisation.
              Chaque payload est signé pour vérifier l'authenticité.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Configuration</p>
              <p className="text-sm text-blue-800">
                Rendez-vous sur <a href="/dashboard/webhooks" className="font-bold underline">/dashboard/webhooks</a> pour
                créer un webhook et choisir vos événements.
              </p>
            </div>

            <h3 className="font-black text-slate-900 text-base mb-3 mt-6">Format du payload</h3>
            <CodeBlock label="Exemple : partner.created">
{`POST https://votre-url.com/webhook
Content-Type: application/json
X-Nexus-Event: partner.created
X-Nexus-Signature: sha256=abc123...
X-Nexus-Delivery: 550e8400-e29b-41d4-a716-446655440000

{
  "event": "partner.created",
  "timestamp": "2026-10-02T14:13:20.497Z",
  "data": {
    "id": "cmuqv73n2000fx1ue2avdfiwj",
    "name": "Alpha Précieux",
    "email": "alpha@gmail.com",
    "phone": "+261352226637",
    "type": "CUSTOMER",
    "createdAt": "2026-10-02T11:13:20.174Z"
  }
}`}
            </CodeBlock>

            <h3 className="font-black text-slate-900 text-base mb-3 mt-6">
              {EVENTS.length} événements disponibles
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3 font-black text-slate-500 uppercase tracking-widest text-[9px]">Event</th>
                    <th className="text-left p-3 font-black text-slate-500 uppercase tracking-widest text-[9px]">Description</th>
                    <th className="text-left p-3 font-black text-slate-500 uppercase tracking-widest text-[9px] hidden md:table-cell">Données</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EVENTS.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 align-top">
                        <code className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                          {e.event}
                        </code>
                      </td>
                      <td className="p-3 text-slate-600 align-top">{e.desc}</td>
                      <td className="p-3 hidden md:table-cell align-top">
                        <div className="flex flex-wrap gap-1">
                          {e.payload.map((p, j) => (
                            <span key={j} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Signature */}
          <Section id="signature" title="Vérification de signature">
            <p className="text-slate-700 leading-relaxed mb-4">
              Chaque requête webhook est signée avec <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">HMAC SHA-256</code> en utilisant
              votre <strong>secret de webhook</strong>. Vérifiez toujours la signature avant de traiter le payload.
            </p>

            <CodeBlock label="Node.js / TypeScript">
{`import crypto from 'crypto';

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express
app.post('/webhook', express.raw({ type: 'json' }), (req, res) => {
  const signature = req.headers['x-nexus-signature'];
  const rawBody = req.body.toString();

  if (!verifySignature(rawBody, signature, process.env.NEXUS_WEBHOOK_SECRET)) {
    return res.status(401).send('Signature invalide');
  }

  const event = JSON.parse(rawBody);
  console.log('Événement reçu:', event.event, event.data);

  res.status(200).send('OK');
});`}
            </CodeBlock>

            <CodeBlock label="Python">
{`import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

# Flask
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Nexus-Signature', '')
    payload = request.get_data()

    if not verify_signature(payload, signature, os.environ['NEXUS_WEBHOOK_SECRET']):
        abort(401)

    event = request.get_json()
    print('Événement reçu:', event['event'], event['data'])

    return 'OK', 200`}
            </CodeBlock>
          </Section>

          {/* Limits */}
          <Section id="limits" title="Limites & bonnes pratiques">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoBlock icon="⏱️" title="Timeout webhook" desc="10 secondes. Répondez 200 rapidement, traitez en arrière-plan." />
              <InfoBlock icon="🔁" title="Retry automatique" desc="En cas d'échec, NEXUS OS enregistre la livraison et vous pouvez relancer manuellement." />
              <InfoBlock icon="📊" title="Pagination" desc="Toutes les listes utilisent cursor-based pagination (stable même en cas d'ajout)." />
              <InfoBlock icon="🔒" title="Rate limiting" desc="300 requêtes/minute par organisation. Header Retry-After en cas de dépassement." />
              <InfoBlock icon="📅" title="Dates ISO 8601" desc="Format standard : 2026-10-02T14:13:20.497Z (UTC)." />
              <InfoBlock icon="🌐" title="CORS" desc="L'API est CORS-enabled pour les domaines autorisés par votre tenant." />
            </div>
          </Section>

          {/* Support */}
          <Section id="support" title="Support">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 text-white">
              <h3 className="font-black text-lg mb-2">Besoin d'aide ?</h3>
              <p className="text-sm text-slate-300 mb-4">
                Créez un ticket depuis votre dashboard — notre équipe répond en moins de 24h.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="/dashboard/support" className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:shadow-lg transition">
                  🎫 Créer un ticket
                </a>
                <a href="/dashboard/api-keys" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg font-bold text-sm hover:bg-white/20 transition">
                  🔑 Gérer mes clés
                </a>
                <a href="/dashboard/webhooks" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg font-bold text-sm hover:bg-white/20 transition">
                  🔔 Gérer mes webhooks
                </a>
              </div>
            </div>
          </Section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} NEXUS OS · Documentation API v1.0
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-teal-500 to-blue-500" />
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function InfoCard({ icon, title, value, mono }: { icon: string; title: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {icon} {title}
      </p>
      <p className={'text-sm font-bold text-slate-900 ' + (mono ? 'font-mono' : '')}>{value}</p>
    </div>
  );
}

function InfoBlock({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
      <p className="text-xs sm:text-sm font-black text-slate-900 mb-1">{icon} {title}</p>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <p className="font-bold text-slate-900 text-sm mb-1">{title}</p>
        <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ label, children }: { label: string; children: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 my-4">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <button onClick={copy} className="text-[10px] font-bold text-slate-400 hover:text-white transition">
          {copied ? '✓ Copié' : '📋 Copier'}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-200 p-3 sm:p-4 overflow-x-auto text-[10px] sm:text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}
