import { db } from "../../db/client.js";
import { eq, and, isNull } from "drizzle-orm";
import { suppliers } from "../../db/schema/catalog.js";

export const suppliersRepo = {
  async listByOrg(organizationId: string) {
    return await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.organizationId, organizationId), isNull(suppliers.deletedAt)));
  },

  async getById(organizationId: string, id: string) {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.organizationId, organizationId),
          isNull(suppliers.deletedAt)
        )
      );
    return supplier || null;
  },

  async create(
    organizationId: string,
    data: { name: string; phone?: string | undefined; email?: string | undefined; notes?: string | undefined }
  ) {
    const [created] = await db
      .insert(suppliers)
      .values({
        organizationId,
        name: data.name,
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined && data.email !== '' ? { email: data.email } : {}),
        ...(data.notes !== undefined ? { notes: data.notes }: {}),
      })
      .returning();
    if (!created) throw new Error('Gagal membuat supplier');
    return created;
  },

  async update(
    organizationId: string,
    id: string,
    data: { name?: string | undefined; phone?: string | undefined; email?: string | undefined; notes?: string | undefined }
  ) {
    const [updated] = await db
      .update(suppliers)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)))
      .returning();
    return updated || null;
  },

  async softDelete(organizationId: string, id: string) {
    const [deleted] = await db
      .update(suppliers)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)))
      .returning();
    return deleted || null;
  },
};
