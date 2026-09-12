const fs = require("fs");
const p = "app/dashboard/stock/orders/page.tsx";
let s = fs.readFileSync(p, "utf8");

const old = `          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Articles a commander</label>
              <button type="button" onClick={addLine} className="text-xs font-bold text-teal-600 hover:underline">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select
                    value={line.stockItemId}
                    onChange={e => {
                      const it = items.find((x: any) => x.id === e.target.value);
                      updateLine(idx, { stockItemId: e.target.value, unitCost: it?.costPrice?.toString() || '' });
                    }}
                    className="col-span-6 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                  >
                    <option value="">Article...</option>
                    {items.map((i: any) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    onChange={e => updateLine(idx, { quantity: e.target.value })}
                    placeholder="Qte"
                    className="col-span-2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center"
                  />
                  <input
                    type="number"
                    value={line.unitCost}
                    onChange={e => updateLine(idx, { unitCost: e.target.value })}
                    placeholder="P.U."
                    className="col-span-3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-right"
                  />
                  <button type="button" onClick={() => removeLine(idx)} className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg font-bold transition">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>`;

const neu = `          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm font-bold text-slate-700">Articles a commander</label>
                <p className="text-[10px] text-slate-400 mt-0.5">{lines.length} ligne{lines.length > 1 ? 's' : ''}</p>
              </div>
              <button type="button" onClick={addLine} className="text-xs font-bold text-teal-600 hover:underline">+ Ajouter une ligne</button>
            </div>

            {/* Header colonnes */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-1">
              <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Article</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Qte</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">P.U. (Ar)</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const selectedItem = items.find((x: any) => x.id === line.stockItemId);
                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0);
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6 relative">
                        <select
                          value={line.stockItemId}
                          onChange={e => {
                            const it = items.find((x: any) => x.id === e.target.value);
                            updateLine(idx, { stockItemId: e.target.value, unitCost: it?.costPrice?.toString() || '' });
                          }}
                          className={'w-full px-3 py-2.5 bg-white border-2 rounded-lg text-sm font-bold transition ' + (line.stockItemId ? 'border-teal-400 text-slate-900' : 'border-slate-200 text-slate-400')}
                        >
                          <option value="">- Choisir un article -</option>
                          {items.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
                          ))}
                        </select>
                        {selectedItem && (
                          <p className="text-[10px] text-slate-500 mt-1 ml-1">
                            Stock actuel : <span className={'font-bold ' + (selectedItem.currentStock <= selectedItem.minStock ? 'text-red-600' : 'text-slate-700')}>{selectedItem.currentStock} {selectedItem.unit}</span>
                            {' · min ' + selectedItem.minStock}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={e => updateLine(idx, { quantity: e.target.value })}
                        placeholder="0"
                        className="col-span-2 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center tabular-nums focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                      />
                      <input
                        type="number"
                        value={line.unitCost}
                        onChange={e => updateLine(idx, { unitCost: e.target.value })}
                        placeholder="0"
                        className="col-span-3 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-slate-900 text-right tabular-nums focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="col-span-1 text-red-500 hover:bg-red-100 rounded-lg font-black text-lg transition"
                        title="Retirer cette ligne"
                      >
                        ×
                      </button>
                    </div>
                    {lineTotal > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Sous-total ligne</span>
                        <span className="text-sm font-black text-teal-700 tabular-nums">{lineTotal.toLocaleString('fr-FR')} Ar</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total */}
            {(() => {
              const total = lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0);
              const itemCount = lines.filter(l => l.stockItemId).length;
              if (total <= 0) return null;
              return (
                <div className="mt-4 bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total commande</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-2xl font-black text-teal-400 tabular-nums">
                    {total.toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                </div>
              );
            })()}
          </div>`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ Modale commande polie");
