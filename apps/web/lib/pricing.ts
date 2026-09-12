/**
 * Résout le prix d'un module pour un type d'organisation donné.
 * Même logique que le backend (src/modules/pricing.util.ts)
 * Priorité : pricing[orgType] > pricing.DEFAULT > price (fallback)
 */
export function resolvePrice(module: any, orgType?: string | null): number {
  if (module?.pricing && typeof module.pricing === 'object') {
    const p = module.pricing as Record<string, number>;
    if (orgType && p[orgType] != null) return Number(p[orgType]) || 0;
    if (p.DEFAULT != null) return Number(p.DEFAULT) || 0;
  }
  return Number(module?.price) || 0;
}
