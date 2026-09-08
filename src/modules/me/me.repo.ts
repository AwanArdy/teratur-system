import { db } from '../../db/client.js';
import { eq, and, isNull, count } from 'drizzle-orm';
import { users, notificationPreferences, refreshTokens } from '../../db/schema/identity.js';

export const meRepo = {
  async getUserProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  },

  async updateUserProfile(
    userId: string,
    data: {
      fullName?: string | undefined;
      jobTitle?: string | undefined;
      phone?: string | undefined;
      avatarUrl?: string | null | undefined;
    }
  ) {
    const [updated] = await db
      .update(users)
      .set({
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated || null;
  },

  async getNotificationPreferences(userId: string) {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs || null;
  },

  async upsertNotificationPreferences(
    userId: string,
    organizationId: string,
    data: { lowStock: boolean; dailyReport: boolean; newTransaction: boolean; unpaidReminder: boolean }
  ) {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId, organizationId, ...data })
      .returning();
    return created;
  },

  async getActiveSessionsCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    return result?.count || 0;
  },
};
