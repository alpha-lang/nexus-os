const fs = require('fs');
const path = 'app/dashboard/stock/orders/[id]/page.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Ajouter les styles banner dans le <style> de printPO
const oldStyle = `.notes { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #78350f; }
      </style>`;

const newStyle = `.notes { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #78350f; }
        .banner { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; }
        .banner-commande { background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%); color: white; }
        .banner-icon { font-size: 32px; }
        .banner-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-bottom: 3px; }
        .banner-sub { font-size: 11px; opacity: 0.85; letter-spacing: 0.5px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1px; }
        .status-draft { background: #e2e8f0; color: #334155; }
        .status-sent { background: #cffafe; color: #0e7490; }
      </style>`;

if (!s.includes(oldStyle)) { console.error('❌ style anchor introuvable'); process.exit(1); }
s = s.replace(oldStyle, newStyle);

// 2. Ajouter le bandeau bleu avant <div class="header">
const oldBody = `<body>
        <div class="header">
          <div>
            <div class="logo">NEXUS OS<small>BON DE COMMANDE</small></div>
          </div>`;

const statusLabel = `\${order.status === 'DRAFT' ? 'BROUILLON' : order.status === 'SENT' ? 'ENVOYE' : order.status === 'PARTIAL' ? 'PARTIELLE' : 'RECUE'}`;
const statusCls = `\${order.status === 'DRAFT' ? 'status-draft' : 'status-sent'}`;

const newBody = `<body>
        <div class="banner banner-commande">
          <div class="banner-icon">&#x1F4CB;</div>
          <div>
            <div class="banner-title">BON DE COMMANDE</div>
            <div class="banner-sub">Document a transmettre au fournisseur</div>
          </div>
        </div>

        <div class="header">
          <div>
            <div class="logo">NEXUS OS<small>COMMANDE FOURNISSEUR</small></div>
          </div>`;

if (!s.includes(oldBody)) { console.error('❌ body anchor introuvable'); process.exit(1); }
s = s.replace(oldBody, newBody);

fs.writeFileSync(path, s);
console.log('✅ Bandeau bleu + styles ajoutes a printPO');
