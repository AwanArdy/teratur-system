import { db } from '../../db/client.js';
import { eq, and, isNull, ilike, count, sql } from 'drizzle-orm';
import { products, recipeLines, ingredients } from '../../db/schema/catalog.js';
import { inventoryBalances } from '../../db/schema/inventory.js';

export const productsRepo = {
  async listByOrg(
    organizationId: string,
    params: { search?: string | undefined; page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(products.organizationId, organizationId),
      isNull(products.deletedAt),
    ];

    if (params.search) {
      conditions.push(
        sql`(${products.name} ILIKE ${`%${params.search}%`} OR ${products.sku} ILIKE ${`%${params.search}%`})`
      );
    }

    const whereClause = and(...conditions);

    const items = await db
      .select()
      .from(products)
      .where(whereClause)
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    return {
      data: items,
      total: totalRow?.total || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      );

    if (!product) return null;

    const recipe = await db
      .select()
      .from(recipeLines)
      .where(eq(recipeLines.productId, product.id));

    return { ...product, recipe };
  },

  async getBySku(organizationId: string, sku: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.sku, sku.toUpperCase()),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      );
    return product || null;
  },

  async createWithRecipe(
    organizationId: string,
    data: {
      name: string;
      category: string;
      sku: string;
      sellingPriceIdr: number;
      kind: 'made_to_order' | 'finished_good' | 'pre_order';
      recipe: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }>;
    }
  ) {
    return await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          organizationId,
          sku: data.sku.toUpperCase(),
          name: data.name,
          category: data.category,
          sellingPriceIdr: data.sellingPriceIdr,
          kind: data.kind,
        })
        .returning();

      if (!product) throw new Error('Gagal membuat produk');

      if (data.recipe.length > 0) {
        await tx.insert(recipeLines).values(
          data.recipe.map((r, index) => ({
            organizationId,
            productId: product.id,
            componentType: r.componentType,
            componentId: r.componentId,
            qty: r.qty.toString(),
            sortOrder: index,
          }))
        );
      }

      return product;
    });
  },

  async updateWithRecipe(
    organizationId: string,
    id: string,
    data: {
      name?: string | undefined;
      category?: string | undefined;
      sku?: string | undefined;
      sellingPriceIdr?: number | undefined;
      kind?: 'made_to_order' | 'finished_good' | 'pre_order' | undefined;
      recipe?: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }> | undefined;
    }
  ) {
    return await db.transaction(async (tx) => {
      const updatePayload: Partial<typeof products.$inferInsert> = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.sku !== undefined ? { sku: data.sku.toUpperCase() } : {}),
        ...(data.sellingPriceIdr !== undefined ? { sellingPriceIdr: data.sellingPriceIdr } : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        updatedAt: new Date(),
      };

      const [updated] = await tx
        .update(products)
        .set(updatePayload)
        .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
        .returning();

      if (!updated) return null;

      if (data.recipe !== undefined) {
        await tx.delete(recipeLines).where(eq(recipeLines.productId, id));
        if (data.recipe.length > 0) {
          await tx.insert(recipeLines).values(
            data.recipe.map((r, index) => ({
              organizationId,
              productId: id,
              componentType: r.componentType,
              componentId: r.componentId,
              qty: r.qty.toString(),
              sortOrder: index,
            }))
          );
        }
      }

      return updated;
    });
  },

  async softDelete(organizationId: string, id: string) {
    const [deleted] = await db
      .update(products)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
      .returning();
    return deleted || null;
  },

  // Helper untuk hitung HPP dari komponen resep
  async getComponentUnitCosts(
    organizationId: string,
    outletId: string | null,
    recipe: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }>
  ) {
    const result: Record<string, number> = {};

    for (const item of recipe) {
      if (item.componentType === 'ingredient') {
        const [bal] = await db
          .select({ avgCost: inventoryBalances.avgUnitCost })
          .from(inventoryBalances)
          .where(
            and(
              eq(inventoryBalances.organizationId, organizationId),
              eq(inventoryBalances.itemType, 'ingredient'),
              eq(inventoryBalances.itemId, item.componentId),
              ...(outletId ? [eq(inventoryBalances.outletId, outletId)] : [])
            )
          )
          .limit(1);

        if (bal && Number(bal.avgCost) > 0) {
          result[item.componentId] = Number(bal.avgCost);
        } else {
          const [ing] = await db
            .select({ purchasePrice: ingredients.purchasePriceIdr })
            .from(ingredients)
            .where(eq(ingredients.id, item.componentId));
          result[item.componentId] = ing ? Number(ing.purchasePrice) : 0;
        }
      } else {
        // finished good BOM
        const [bal] = await db
          .select({ avgCost: inventoryBalances.avgUnitCost })
          .from(inventoryBalances)
          .where(
            and(
              eq(inventoryBalances.organizationId, organizationId),
              eq(inventoryBalances.itemType, 'finished_good'),
              eq(inventoryBalances.itemId, item.componentId)
            )
          )
          .limit(1);
        result[item.componentId] = bal ? Number(bal.avgCost) : 0;
      }
    }

    return result;
  },
};
