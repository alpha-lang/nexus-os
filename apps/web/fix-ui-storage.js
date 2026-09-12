const fs = require("fs");
const p = "app/dashboard/storage/page.tsx";
let s = fs.readFileSync(p, "utf8");

// Helper d'affichage en haut du fichier (juste après les imports)
const marker = "export default function StoragePage() {";
if (!s.includes("function humanSize")) {
  s = s.replace(marker,
`function humanSize(mo: number) {
  if (mo < 0.001) {
    const o = Math.round(mo * 1024 * 1024);
    return { value: o.toString(), unit: 'o' };
  }
  if (mo < 1) {
    const ko = mo * 1024;
    return { value: ko.toFixed(1), unit: 'Ko' };
  }
  return { value: mo.toFixed(2), unit: 'Mo' };
}

export default function StoragePage() {`);
}

// Remplace le bloc d'affichage principal
const old = `<div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-slate-900">{used.toFixed(2)}</span>
                  <span className="text-sm text-slate-500">Mo</span>
                  <span className="text-sm text-slate-400 ml-1">/ {max} Mo</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-3">
                  ≈ {Math.round(used * 1024).toLocaleString('fr-FR')} Ko · {Math.round(used * 1024 * 1024).toLocaleString('fr-FR')} octets
                </div>`;

const neu = `{(() => {
                  const h = humanSize(used);
                  return (
                    <>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-bold text-slate-900">{h.value}</span>
                        <span className="text-sm text-slate-500">{h.unit}</span>
                        <span className="text-sm text-slate-400 ml-1">/ {max} Mo</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mb-3">
                        ≈ {Math.round(used * 1024 * 1024).toLocaleString('fr-FR')} octets · {Math.round(used * 1024).toLocaleString('fr-FR')} Ko · {used.toFixed(3)} Mo
                      </div>
                    </>
                  );
                })()}`;

if (!s.includes(old)) { console.error("❌ bloc UI introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ UI affichage intelligent (o/Ko/Mo)");
