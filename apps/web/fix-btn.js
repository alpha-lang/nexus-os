const fs = require("fs");
const p = "app/dashboard/storage/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;

// ─── 1. BOUTON TABLEAU : virer tout le SVG, garder texte ───
// Cible : contenu entre {busy ... } et le texte "Sauvegarder"
const oldTable = `{busy === r.organizationId ? (
                        <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                      )}
                      <span className="hidden sm:inline">Sauvegarder</span>`;

const newTable = `{busy === r.organizationId && (
                        <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                      )}
                      <span>Sauvegarder</span>`;

if (s.includes(oldTable)) { s = s.replace(oldTable, newTable); n++; }
else { console.warn("⚠️  bloc tableau introuvable"); }

// ─── 2. BOUTON CARTE : virer SVG, garder texte ───
const oldCard = `{busy === r.organizationId ? (
                <><span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span> En cours...</>
              ) : (
                <> <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Sauvegarder maintenant</>
              )}`;

const newCard = `{busy === r.organizationId ? (
                <><span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span> En cours...</>
              ) : (
                <>Sauvegarder maintenant</>
              )}`;

if (s.includes(oldCard)) { s = s.replace(oldCard, newCard); n++; }
else { console.warn("⚠️  bloc carte introuvable"); }

// ─── 3. BOUTON TÉLÉCHARGER : virer SVG, garder texte ───
const oldDl = `<button
                      onClick={() => onDownload(b.id, b.fileName)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      Télécharger
                    </button>`;

const newDl = `<button
                      onClick={() => onDownload(b.id, b.fileName)}
                      className="inline-flex items-center text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
                    >
                      Télécharger
                    </button>`;

if (s.includes(oldDl)) { s = s.replace(oldDl, newDl); n++; }
else { console.warn("⚠️  bloc télécharger introuvable"); }

// ─── 4. TOGGLE TABLEAU/CARTES : virer SVG, garder texte ───
s = s.replace(
  /<svg className="w-3\.5 h-3\.5 inline[^>]*>\s*<path[^>]*d="M4 6h16M4 12h16M4 18h16"\/>\s*<\/svg>\s*Tableau/g,
  "Tableau"
);
s = s.replace(
  /<svg className="w-3\.5 h-3\.5 inline[^>]*>\s*<path[^>]*d="M4 6a2 2 0 012-2h2[^"]*"\/>\s*<\/svg>\s*Cartes/g,
  "Cartes"
);

// ─── 5. Sécurité : nettoyer tous SVG résiduels dans boutons ───
s = s.replace(/\s*<svg className="w-3\.5 h-3\.5[^>]*>\s*<path[^>]*\/>\s*<\/svg>/g, '');
s = s.replace(/\s*<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path[^>]*d="M4 16v1a3 3 0 003 3h10[^"]*"\/>\s*<\/svg>/g, '');

fs.writeFileSync(p, s);
console.log(`✅ ${n} bouton(s) nettoyé(s)`);
