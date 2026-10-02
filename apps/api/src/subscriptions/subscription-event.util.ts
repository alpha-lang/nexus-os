import { PrismaService } from '../prisma/prisma.service';

export async function logSubscriptionEvent(
  prisma: PrismaService,
  subscriptionId: string,
  type: string,
  description: string,
  actorId: string | null,
  oldValue?: string,
  newValue?: string,
) {
  try {
    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId,
        type,
        description,
        oldValue: oldValue || null,
        newValue: newValue || null,
        actorId,
      },
    });
  } catch (e) {
    console.error('[logSubscriptionEvent]', e);
  }
}
