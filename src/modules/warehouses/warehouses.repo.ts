import { db } from '../../db/client.js';
import { eq, and } from 'drizzle-orm';
import { warehouses } from '../../db/schema/identity.js';

export const warehousesRepo = {
  async listByOutlet(organizationId: string, outletId: string) {
    return await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organizationId),
          eq(warehouses.outletId, outletId)
        )
      );
  },

  async create(
    organizationId: string,
    outletId: string,
    data: { name: string; code: string; isDefault?: boolean | undefined }
  ) {
    const [created] = await db
      .insert(warehouses)
      .values({
        organizationId,
        outletId,
        name: data.name,
        code: data.code.toUpperCase(),
        isDefault: data.isDefault || false,
      })
      .returning();
    if (!created) throw new Error('Gagal membuat gudang');
    return created;
  },

  async update(
    organizationId: string,
    warehouseId: string,
    data: { name?: string | undefined; code?: string | undefined; isDefault?: boolean | undefined }
  ) {
    const [updated] = await db
      .update(warehouses)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.code ? { code: data.code.toUpperCase() } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      })
      .where(
        and(
          eq(warehouses.id, warehouseId),
          eq(warehouses.organizationId, organizationId)
        )
      )
      .returning();
    return updated || null;
  },
};
