import { db } from "../../db/client.js";
import { eq, and, isNull, ilike, count, sql } from "drizzle-orm";
import { ingredients } from "../../db/schema/catalog.js";
import { inventoryBalances } from "../../db/schema/inventory.js";
import { isNumberObject } from "node:util/types";

export const ingredientsRepo = {
  async listByOrg(
    organizationId: string,
    outletId: string | null,
    params: { search?: string | undefined; category?: string | undefined; page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(ingredients.organizationId, organizationId),
      isNull(ingredients.deletedAt),
    ];

    if (params.search) {
      conditions.push(
        sql`(${ingredients.name} ILIKE ${`%${params.search}%`} OR ${ingredients.sku} ILIKE ${`%${params.search}%`})`
      );
    }

    if (params.category) {
      conditions.push(eq(ingredients.category, params.category as any));
    }

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: ingredients.id,
        sku: ingredients.sku,
        name: ingredients.name,
        purchasePriceIdr: ingredients.purchasePriceIdr,
        minStock: ingredients.minStock,
        leadTimeDays: ingredients.supplierId,
        supplierId: ingredients.supplierId,
        supplierName: ingredients.supplierName,
        isActive: ingredients.isActive,
        createdAt: ingredients.createdAt,
        qtyOnHand: sql<number>`COALESCE(SUM(${inventoryBalances.qtyOnHand}), 0)::float`,
      })
      .from(ingredients)
      .leftJoin(
        inventoryBalances,
        and(
          eq(inventoryBalances.itemId, ingredients.id),
          eq(inventoryBalances.itemType, 'ingredient'),
          ...(outletId ? [eq(inventoryBalances.outletId, outletId)] : [])
        )
      )
      .where(whereClause)
      .groupBy(ingredients.id)
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db
      .select({ total: count() })
      .from(ingredients)
      .where(whereClause);

    return {
      data: items,
      total: totalRow?.total || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    const [item] = await db
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.id, id),
          eq(ingredients.organizationId, organizationId),
          isNull(ingredients.deletedAt)
        )
      );
    return item || null;
  },

  async getBySku(organizationId: string, sku: string) {
    const [item] = await db
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.sku, sku.toUpperCase()),
          eq(ingredients.organizationId, organizationId),
          isNull(ingredients.deletedAt)
        )
      );
    return item || null;
  },

  async create(organizationId: string, data: typeof ingredients.$inferInsert) {
    const [created] = await db
      .insert(ingredients)
      .values({
        ...data,
        sku: data.sku.toUpperCase(),
        organizationId,
      })
      .returning();
    if (!created) throw new Error('Gagal membuat bahan baku');
    return created;
  },

  async update(organizationId: string, id: string, data: Partial<typeof ingredients.$inferInsert>) {
    const [updated] = await db
      .update(ingredients)
      .set({
        ...data,
        ...(data.sku ? { sku: data.sku.toUpperCase() } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(ingredients.id, id), eq(ingredients.organizationId, organizationId)))
      .returning();
    return updated || null;
  },

  async softDelete(organizationId: string, id: string) {
    const [deleted] = await db
      .update(ingredients)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(ingredients.id, id), eq(ingredients.organizationId, organizationId)))
      .returning();
    return deleted || null;
  },
}
