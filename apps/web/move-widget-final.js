const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// 1. Extraire le widget (bloc complet isHotel && stockDash)
const startMarker = '      {isHotel && stockDash && (';
const startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.error('❌ widget introuvable'); process.exit(1); }

const endMarker = '      {/* ═══ COMMERCE ═══ */}';
const endIdx = s.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('❌ fin widget introuvable'); process.exit(1); }

const widget = s.slice(startIdx, endIdx);
console.log('Widget extrait :', widget.length, 'chars');

// 2. Supprimer le widget de sa position actuelle
s = s.slice(0, startIdx) + s.slice(endIdx);

// 3. Trouver l'anchor exact : la fermeture des 4 KPI cards hôtel
// Pattern unique : la fin du 4ème KpiCard "En attente" + fermeture div
const anchor = `            <KpiCard
              label="En attente"
              value={String(stats.today.pending)}
              sub="reservations a confirmer"
              accent="amber"
              href="/dashboard/reservations"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">`;

const anchorIdx = s.indexOf(anchor);
if (anchorIdx === -1) { console.error('❌ anchor KpiCard En attente introuvable'); process.exit(1); }

// 4. Insérer le widget APRÈS la fermeture des 4 KPI, AVANT le grid Taux
const replacement = `            <KpiCard
              label="En attente"
              value={String(stats.today.pending)}
              sub="reservations a confirmer"
              accent="amber"
              href="/dashboard/reservations"
            />
          </div>

${widget}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">`;

s = s.slice(0, anchorIdx) + replacement + s.slice(anchorIdx + anchor.length);

fs.writeFileSync(p, s);
console.log('✅ Widget Stock remonte juste apres les 4 KPI hotel');
