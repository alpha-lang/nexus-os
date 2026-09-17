const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let s = fs.readFileSync(p, "utf8");

// Cherche la fermeture de la table mouvements (déjà patchée pour empty state)
const old = `                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                    {search || mvtType !== 'ALL' || mvtPreset !== 'all'
                      ? 'Aucun mouvement ne correspond aux filtres'
                      : 'Aucun mouvement'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}`;

const neu = `                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                    {search || mvtType !== 'ALL' || mvtPreset !== 'all'
                      ? 'Aucun mouvement ne correspond aux filtres'
                      : 'Aucun mouvement'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={pagMvt.page}
          totalPages={pagMvt.totalPages}
          onPageChange={pagMvt.setPage}
          perPage={pagMvt.perPage}
          perPageOptions={pagMvt.perPageOptions}
          onPerPageChange={pagMvt.setPerPage}
          total={pagMvt.total}
        />
      )}`;

if (!s.includes(old)) { console.error("❌ anchor fermeture table introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ pagination mouvements ajoutee");
