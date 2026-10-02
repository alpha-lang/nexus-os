/**
 * Calcule les deadlines SLA selon la priorité.
 * Règles métier :
 *   URGENT  → 1h réponse / 4h résolution
 *   HIGH    → 4h réponse / 24h résolution
 *   NORMAL  → 24h réponse / 72h résolution
 *   LOW     → 48h réponse / 7j résolution
 */
export function computeSla(priority: string, from: Date = new Date()) {
  const rules = {
    URGENT: { response: 60 * 60 * 1000, resolution: 4 * 60 * 60 * 1000 },
    HIGH:   { response: 4 * 60 * 60 * 1000, resolution: 24 * 60 * 60 * 1000 },
    NORMAL: { response: 24 * 60 * 60 * 1000, resolution: 72 * 60 * 60 * 1000 },
    LOW:    { response: 48 * 60 * 60 * 1000, resolution: 7 * 24 * 60 * 60 * 1000 },
  };
  const r = rules[priority as keyof typeof rules] || rules.NORMAL;
  return {
    slaResponseDeadline: new Date(from.getTime() + r.response),
    slaResolutionDeadline: new Date(from.getTime() + r.resolution),
  };
}

export function slaStatus(ticket: any) {
  const now = Date.now();
  const respDeadline = ticket.slaResponseDeadline ? new Date(ticket.slaResponseDeadline).getTime() : null;
  const resoDeadline = ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline).getTime() : null;
  const isResolved = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  // Résolu : calcul du respect
  if (isResolved && resoDeadline) {
    const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : now;
    return resolvedAt <= resoDeadline ? 'MET' : 'BREACHED';
  }

  // Non résolu : calcul temps restant
  if (!resoDeadline) return 'NO_SLA';
  const remaining = resoDeadline - now;

  if (remaining < 0) return 'BREACHED';
  if (remaining < 60 * 60 * 1000) return 'URGENT'; // < 1h
  if (remaining < 4 * 60 * 60 * 1000) return 'WARNING'; // < 4h
  return 'OK';
}
