const fs = require("fs");
const p = "src/storage/storage.service.ts";
let s = fs.readFileSync(p, "utf8");

const old = `  async recalcAll() {
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });
    const results = [];
    for (const o of orgs) {
      const r = await this.computeOrgSize(o.id);
      await this.prisma.storageQuota.update({
        where: { organizationId: o.id },
        data: { usedStorage: r.mo },
      }).catch(() => {});
      results.push({ organizationId: o.id, ...r });
    }
    return results;
  }`;

const neu = `  async recalcAll() {
    const orgs = await this.prisma.organization.findMany({ select: { id: true, name: true } });
    const results: any[] = [];
    for (const o of orgs) {
      const r = await this.computeOrgSize(o.id);
      try {
        // upsert : crée le quota s'il n'existe pas
        await this.prisma.storageQuota.upsert({
          where: { organizationId: o.id },
          update: { usedStorage: r.mo },
          create: {
            organizationId: o.id,
            usedStorage: r.mo,
            maxStorage: o.name.includes('CORP') ? 10000 : 500,
          },
        });
        results.push({ organizationId: o.id, name: o.name, saved: true, ...r });
      } catch (e: any) {
        results.push({ organizationId: o.id, name: o.name, saved: false, error: e.message, ...r });
      }
    }
    return results;
  }`;

if (!s.includes(old)) { console.error("❌ recalcAll introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ recalcAll robuste (upsert + erreurs visibles)");
