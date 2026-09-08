import { db } from '../../db/client.js';
import { eq } from 'drizzle-orm';
import { subscriptions } from '../../db/schema/identity.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { PlanCode } from '../../db/schema/enums.js';

export const billingService = {
  async getSubscriptionDetails(organizationId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    if (!sub) throw new HttpError(404, 'NOT_FOUND', 'Informasi langganan tidak ditemukan');

    const isGrowthOrAbove = ['growth', 'pro', 'business'].includes(sub.planCode);
    const isProOrAbove = ['pro', 'business'].includes(sub.planCode);

    return {
      planCode: sub.planCode,
      status: sub.status,
      outletLimit: sub.outletLimit,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      features: {
        transfers: isGrowthOrAbove,
        opname: isGrowthOrAbove,
        waste: isGrowthOrAbove,
        rop: isGrowthOrAbove,
        aiDailyLimit: this.getAiLimit(sub.planCode),
        staffLimit: sub.planCode === 'starter' || sub.planCode === 'free_trial' ? 5 : null,
        nettProfitIncludesOpex: isGrowthOrAbove,
      },
    };
  },

  getAiLimit(planCode: PlanCode): number {
    switch (planCode) {
      case 'free_trial':
      case 'starter':
        return 20;
      case 'growth':
        return 200;
      case 'pro':
        return 1000;
      case 'business':
        return 5000;
      default:
        return 20;
    }
  },
};
