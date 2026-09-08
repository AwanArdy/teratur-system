import { db } from '../../db/client.js';
import { eq, and, isNull, count } from 'drizzle-orm';
import { outlets, warehouses, subscriptions } from '../../db/schema/identity.js';

export const outletsRepo = {
  async listByOrg(organizationId: string) {
    return await db
      .select()
      .from(outlets)
      .where(and(eq(outlets.organizationId, organizationId), isNull(outlets.deletedAt)));
  },

  async countActiveByOrg(organizationId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(outlets)
      .where(and(eq(outlets.organizationId, organizationId), isNull(outlets.deletedAt)));
    return result?.count || 0;
  },

  async getById(organizationId: string, outletId: string) {
    const [outlet] = await db
      .select()
      .from(outlets)
      .where(
        and(
          eq(outlets.id, outletId),
          eq(outlets.organizationId, organizationId),
          isNull(outlets.deletedAt)
        )
      );
    return outlet || null;
  },

  async createOutletWithDefaultWarehouse(
    organizationId: string,
    data: { name: string; businessType: any; address?: string; city?: string; phone?: string }
  ) {
    return await db.transaction(async (tx) => {
      const [outlet] = await tx
        .insert(outlets)
        .values({
          organizationId,
          name: data.name,
          businessType: data.businessType,
          address: data.address,
          city: data.city,
          phone: data.phone,
        })
        .returning();

      if (!outlet) throw new Error('Gagal membuat outlet');

      const [warehouse] = await tx
        .insert(warehouses)
        .values({
          organizationId,
          outletId: outlet.id,
          name: 'Gudang Utama',
          code: 'WH-MAIN',
          isDefault: true,
        })
        .returning();

      return { outlet, warehouse };
    });
  },

  async update(
    organizationId: string,
    outletId: string,
    data: { name?: string; businessType?: any; address?: string; city?: string; phone?: string }
  ) {
    const [updated] = await db
      .update(outlets)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.businessType ? { businessType: data.businessType } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(outlets.id, outletId), eq(outlets.organizationId, organizationId)))
      .returning();
    return updated || null;
  },

  async getSubscriptionLimit(organizationId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    return sub?.outletLimit || 1;
  },
};
