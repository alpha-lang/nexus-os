const fs = require("fs");
const p = "src/modules/modules.service.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch modules.service...");

tryR(
  `export class ModulesService {
  constructor(private prisma: PrismaService) {}`,
  `export class ModulesService {
  constructor(private prisma: PrismaService) {}

  resolvePrice(module: any, orgType?: string | null): number {
    if (module?.pricing && typeof module.pricing === 'object') {
      const p = module.pricing as Record<string, number>;
      if (orgType && p[orgType] != null) return Number(p[orgType]) || 0;
      if (p.DEFAULT != null) return Number(p.DEFAULT) || 0;
    }
    return Number(module?.price) || 0;
  }`,
  "helper resolvePrice"
);

tryR(
  `    const organizationId = await this.resolveInternalOrganizationId(user);
    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types || null);

    return this.prisma.module.create({
      data: {
        name: data.name,
        types: typesCSV,
        description: data.description || null,
        price: data.price || 0,
        status: data.status || 'ACTIVE',
        route: data.route || null,
        organizationId,
      },
    });`,
  `    const organizationId = await this.resolveInternalOrganizationId(user);
    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types || null);
    const pricing = data.pricing && typeof data.pricing === 'object' ? data.pricing : null;
    const fallbackPrice = pricing?.DEFAULT != null ? Number(pricing.DEFAULT) : (data.price || 0);

    return this.prisma.module.create({
      data: {
        name: data.name,
        types: typesCSV,
        description: data.description || null,
        price: fallbackPrice,
        pricing: pricing as any,
        status: data.status || 'ACTIVE',
        route: data.route || null,
        organizationId,
      },
    });`,
  "create accepte pricing"
);

tryR(
  `    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types ?? undefined);

    return this.prisma.module.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        types: typesCSV,
        description: data.description ?? undefined,
        price: data.price ?? undefined,
        status: data.status ?? undefined,
        route: data.route ?? undefined,
      },
    });`,
  `    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types ?? undefined);
    const pricing = data.pricing && typeof data.pricing === 'object' ? data.pricing : undefined;
    const fallbackPrice = pricing?.DEFAULT != null ? Number(pricing.DEFAULT) : data.price;

    return this.prisma.module.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        types: typesCSV,
        description: data.description ?? undefined,
        price: fallbackPrice ?? undefined,
        pricing: pricing as any,
        status: data.status ?? undefined,
        route: data.route ?? undefined,
      },
    });`,
  "update accepte pricing"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/3 patch(es)`);
