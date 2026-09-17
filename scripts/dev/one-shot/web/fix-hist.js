const fs = require("fs");
const p = "app/dashboard/storage/page.tsx";
let s = fs.readFileSync(p, "utf8");

// 1. Helper formatBytes (octets → {value, unit})
if (!s.includes("function formatBytes")) {
  s = s.replace(
    "function humanSize(mo: number) {",
    `function formatBytes(b: number) {
  if (b < 1024) return { value: b.toFixed(0), unit: 'o' };
  if (b < 1024 * 1024) return { value: (b / 1024).toFixed(1), unit: 'Ko' };
  return { value: (b / 1024 / 1024).toFixed(2), unit: 'Mo' };
}

function humanSize(mo: number) {`
  );
}

// 2. Historique : colonne Taille
const oldHist = `<td className="p-4 text-right text-slate-600">{b.fileSize.toFixed(2)} Mo</td>`;
const newHist = `{(() => {
                  const sz = formatBytes(b.fileSize);
                  return <td className="p-4 text-right text-slate-600">{sz.value} <span className="text-xs text-slate-400">{sz.unit}</span></td>;
                })()}`;

if (!s.includes(oldHist)) {
  console.warn("⚠️  Pattern historique introuvable");
} else {
  s = s.replace(oldHist, newHist);
  console.log("✅ Historique corrigé");
}

// 3. Subline "≈ X octets · Y Ko · Z Mo"
const oldSub = `<div className="text-[10px] text-slate-400 font-mono mb-3">
                        ≈ {Math.round(used * 1024 * 1024).toLocaleString('fr-FR')} octets · {Math.round(used * 1024).toLocaleString('fr-FR')} Ko · {used.toFixed(3)} Mo
                      </div>`;
const newSub = `<div className="text-[10px] text-slate-400 font-mono mb-3">
                        ≈ {Math.round(used * 1024 * 1024).toLocaleString('fr-FR')} octets · {(used * 1024).toFixed(2)} Ko · {used.toFixed(4)} Mo
                      </div>`;

if (s.includes(oldSub)) {
  s = s.replace(oldSub, newSub);
  console.log("✅ Subline corrigée");
} else {
  console.warn("⚠️  Pattern subline introuvable — skip");
}

fs.writeFileSync(p, s);
