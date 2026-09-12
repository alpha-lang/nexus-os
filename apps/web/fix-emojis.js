const fs = require("fs");
const p = "app/dashboard/storage/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;

// 1. Options du <select> filtre : emoji → texte pur
s = s.replace('<option value="all">Tous les statuts</option>', '<option value="all">Tous les statuts</option>');
s = s.replace('<option value="critical">🔴 Critique (&gt;80%)</option>', '<option value="critical">Critique (&gt;80%)</option>'); n++;
s = s.replace('<option value="warning">🟠 Attention (50-80%)</option>', '<option value="warning">Attention (50-80%)</option>'); n++;
s = s.replace('<option value="ok">🟢 OK (&lt;50%)</option>', '<option value="ok">OK (&lt;50%)</option>'); n++;
s = s.replace('<option value="empty">⚪ Vide (0%)</option>', '<option value="empty">Vide (0%)</option>'); n++;

// 2. Onglet Organisations
s = s.replace(
  `🏢 Organisations <span className="opacity-70 ml-1">({quotas.length})</span>`,
  `Organisations <span className="opacity-70 ml-1">({quotas.length})</span>`
); n++;

// 3. Onglet Sauvegardes
s = s.replace(
  `📦 Sauvegardes <span className="opacity-70 ml-1">({backups.length})</span>`,
  `Sauvegardes <span className="opacity-70 ml-1">({backups.length})</span>`
); n++;

// 4. Toggle Tableau / Cartes
s = s.replace(
  `>📋 Tableau</button>`,
  `>
                    <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    Tableau</button>`
); n++;
s = s.replace(
  `>🗂 Cartes</button>`,
  `>
                    <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                    </svg>
                    Cartes</button>`
); n++;

// 5. Bouton Sauvegarder tableau : emoji → SVG
s = s.replace(
  `<span>💾</span>`,
  `<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                        </svg>`
); n++;

// 6. Bouton carte : 💾 → SVG
s = s.replace(
  `<>💾 Sauvegarder maintenant</>`,
  `<> <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
                Sauvegarder maintenant</>`
); n++;

// 7. Bouton Télécharger : ⬇ → SVG
s = s.replace(
  `⬇ Télécharger`,
  `<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      Télécharger`
); n++;

// 8. KPI cards : emoji → composant SVG
s = s.replace(
  `icon="🏢" label="Organisations"`,
  `icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>} label="Organisations"`
); n++;
s = s.replace(
  `icon="💾" label="Total utilisé"`,
  `icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>} label="Total utilisé"`
); n++;
s = s.replace(
  `icon="📊" label="Quota global"`,
  `icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} label="Quota global"`
); n++;
s = s.replace(
  `icon={kpis.criticalCount > 0 ? '⚠️' : '✅'}`,
  `icon={kpis.criticalCount > 0
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}`
); n++;

// 9. Empty state emojis → SVG
s = s.replace(
  `{hasFilter ? '🔍' : '📭'}`,
  `{hasFilter
        ? <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        : <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>}`
); n++;

// 10. BackupsList empty : 📦 → SVG
s = s.replace(
  `<div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📦</div>`,
  `<div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
        </div>`
); n++;

// 11. Emojis dans les cartes (🕐)
s = s.replace(
  `? \`🕐 \${new Date(r.lastBackup).toLocaleDateString('fr-FR')} à \${new Date(r.lastBackup).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\``,
  `? \`\${new Date(r.lastBackup).toLocaleDateString('fr-FR')} à \${new Date(r.lastBackup).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\``
); n++;
s = s.replace(`: '🕐 Jamais sauvegardé'}`, `: 'Jamais sauvegardé'}`); n++;

// 12. Icon prop : ajouter support ReactNode
s = s.replace(
  `function KpiCard({ icon, label, value, accent, hint }: { icon: string; label: string; value: string; accent: 'blue'|'teal'|'purple'|'red'|'green'; hint?: string }) {`,
  `function KpiCard({ icon, label, value, accent, hint }: { icon: React.ReactNode; label: string; value: string; accent: 'blue'|'teal'|'purple'|'red'|'green'; hint?: string }) {`
); n++;

fs.writeFileSync(p, s);
console.log(`✅ ${n} emoji(s) remplacé(s) par SVG`);
