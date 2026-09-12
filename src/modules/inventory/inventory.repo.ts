import { db } from '../../db/client.js';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { inventoryBalances, stockMovements } from '../../db/schema/inventory.js';
import { ingredients, products, suppliers } from '../../db/schema/catalog.js';
import { warehouses, outlets } from '../../db/schema/identity.js';
import { users } from '../../db/schema/identity.js';

export const inventoryRepo = {
  async getDefaultWarehouse(organizationId: string, outletId: string) {
    const [wh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organizationId),
          eq(warehouses.outletId, outletId),
          eq(warehouses.isDefault, true)
        )
      );

    if (wh) return wh;

    const [firstWh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organizationId),
          eq(warehouses.outletId, outletId)
        )
      );

    return firstWh || null;
  },

  async listInventoryBalances(
    organizationId: string,
    outletId: string | null,
    params: {
      search?: string | undefined;
      itemType?: 'ingredient' | 'finished_good' | undefined;
      warehouseId?: string | undefined;
      page: number;
      limit: number;
    }
  ) {
    const offset = (params.page - 1) * params.limit;

    // Subquery union antara ingredient dan product agar list komprehensif
    const baseConditions = [eq(ingredients.organizationId, organizationId)];
    if (params.search) {
      baseConditions.push(
        sql`(${ingredients.name} ILIKE ${`%${params.search}%`} OR ${ingredients.sku} ILIKE ${`%${params.search}%`})`
      );
    }

    const ingItems = await db
      .select({
        id: ingredients.id,
        sku: ingredients.sku,
        name: ingredients.name,
        itemType: sql<'ingredient'>`'ingredient'`,
        uom: ingredients.uom,
        minStock: ingredients.minStock,
        purchasePriceIdr: ingredients.purchasePriceIdr,
        supplierName: ingredients.supplierName,
        warehouseId: inventoryBalances.warehouseId,
        warehouseName: warehouses.name,
        qtyOnHand: sql<number>`COALESCE(${inventoryBalances.qtyOnHand}, 0)::float`,
        qtyReserved: sql<number>`COALESCE(${inventoryBalances.qtyReserved}, 0)::float`,
        avgUnitCost: sql<number>`COALESCE(${inventoryBalances.avgUnitCost}, 0)::float`,
      })
      .from(ingredients)
      .leftJoin(
        inventoryBalances,
        and(
          eq(inventoryBalances.itemId, ingredients.id),
          eq(inventoryBalances.itemType, 'ingredient'),
          ...(params.warehouseId ? [eq(inventoryBalances.warehouseId, params.warehouseId)] : []),
          ...(outletId ? [eq(inventoryBalances.outletId, outletId)] : [])
        )
      )
      .leftJoin(warehouses, eq(warehouses.id, inventoryBalances.warehouseId))
      .where(and(...baseConditions))
      .limit(params.limit)
      .offset(offset);

    const [ingCount] = await db
      .select({ total: count() })
      .from(ingredients)
      .where(and(...baseConditions));

    return {
      data: ingItems,
      total: ingCount?.total || 0,
    };
  },

  async findBalanceForUpdate(
    tx: any,
    warehouseId: string,
    itemType: 'ingredient' | 'finished_good',
    itemId: string
  ) {
    const [balance] = await tx
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.itemType, itemType),
          eq(inventoryBalances.itemId, itemId)
        )
      )
      .for('update');

    return balance || null;
  },

  async upsertBalance(
    tx: any,
    data: {
      organizationId: string;
      outletId: string;
      warehouseId: string;
      itemType: 'ingredient' | 'finished_good';
      itemId: string;
      qtyOnHand: number;
      qtyReserved?: number | undefined;
      avgUnitCost: number;
    }
  ) {
    const existing = await this.findBalanceForUpdate(tx, data.warehouseId, data.itemType, data.itemId);

    if (existing) {
      const [updated] = await tx
        .update(inventoryBalances)
        .set({
          qtyOnHand: data.qtyOnHand.toString(),
          ...(data.qtyReserved !== undefined ? { qtyReserved: data.qtyReserved.toString() } : {}),
          avgUnitCost: data.avgUnitCost.toString(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryBalances.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(inventoryBalances)
      .values({
        organizationId: data.organizationId,
        outletId: data.outletId,
        warehouseId: data.warehouseId,
        itemType: data.itemType,
        itemId: data.itemId,
        qtyOnHand: data.qtyOnHand.toString(),
        qtyReserved: (data.qtyReserved || 0).toString(),
        avgUnitCost: data.avgUnitCost.toString(),
      })
      .returning();

    return created;
  },

  async createMovement(
    tx: any,
    data: {
      organizationId: string;
      outletId: string;
      warehouseId: string;
      itemType: 'ingredient' | 'finished_good';
      itemId: string;
      type:
        | 'purchase_in'
        | 'adjustment_in'
        | 'adjustment_out'
        | 'sale_out'
        | 'sale_void_in'
        | 'transfer_out'
        | 'transfer_in'
        | 'opname'
        | 'waste_out';
      qty: number;
      unitCost: number;
      amountIdr: number;
      refType: string;
      refId: string;
      notes?: string | undefined;
      actorUserId: string;
    }
  ) {
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        organizationId: data.organizationId,
        outletId: data.outletId,
        warehouseId: data.warehouseId,
        itemType: data.itemType,
        itemId: data.itemId,
        type: data.type,
        qty: data.qty.toString(),
        unitCost: data.unitCost.toString(),
        amountIdr: data.amountIdr,
        refType: data.refType,
        refId: data.refId,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        actorUserId: data.actorUserId,
      })
      .returning();

    return movement;
  },

  async listMovements(
    organizationId: string,
    itemType: 'ingredient' | 'finished_good',
    itemId: string,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const whereClause = and(
      eq(stockMovements.organizationId, organizationId),
      eq(stockMovements.itemType, itemType),
      eq(stockMovements.itemId, itemId)
    );

    const items = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        qty: stockMovements.qty,
        unitCost: stockMovements.unitCost,
        amountIdr: stockMovements.amountIdr,
        refType: stockMovements.refType,
        refId: stockMovements.refId,
        notes: stockMovements.notes,
        occurredAt: stockMovements.occurredAt,
        actorName: users.fullName,
        warehouseName: warehouses.name,
      })
      .from(stockMovements)
      .leftJoin(users, eq(users.id, stockMovements.actorUserId))
      .leftJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
      .where(whereClause)
      .orderBy(desc(stockMovements.occurredAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(stockMovements).where(whereClause);

    return {
      data: items,
      total: totalRow?.total || 0,
    };
  },
};
