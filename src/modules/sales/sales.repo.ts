import { db } from '../../db/client.js';
import { eq, and, inArray, gte, lte, ilike, or, count, desc, sql } from 'drizzle-orm';
import { sales, saleItems } from '../../db/schema/sales.js';
import { products, recipeLines, ingredients } from '../../db/schema/catalog.js';
import { warehouses, users } from '../../db/schema/identity.js';
import { cashShifts, staff } from '../../db/schema/staff.js';
import { dailyMetrics } from '../../db/schema/ops.js';
import type { ListSalesQuery } from './sales.schemas.js';

export const salesRepo = {
  async getDefaultWarehouse(organizationId: string, outletId: string) {
    const [defaultWh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organizationId),
          eq(warehouses.outletId, outletId),
          eq(warehouses.isDefault, true)
        )
      )
      .limit(1);

    if (defaultWh) return defaultWh;

    const [anyWh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organizationId),
          eq(warehouses.outletId, outletId)
        )
      )
      .limit(1);

    return anyWh || null;
  },

  async getOpenCashShift(organizationId: string, outletId: string, staffId?: string | null) {
    if (staffId) {
      const [staffShift] = await db
        .select()
        .from(cashShifts)
        .where(
          and(
            eq(cashShifts.organizationId, organizationId),
            eq(cashShifts.outletId, outletId),
            eq(cashShifts.staffId, staffId),
            eq(cashShifts.status, 'open')
          )
        )
        .limit(1);
      if (staffShift) return staffShift;
    }

    const [openShift] = await db
      .select()
      .from(cashShifts)
      .where(
        and(
          eq(cashShifts.organizationId, organizationId),
          eq(cashShifts.outletId, outletId),
          eq(cashShifts.status, 'open')
        )
      )
      .limit(1);

    return openShift || null;
  },

  async findProductsByIds(organizationId: string, productIds: string[]) {
    if (productIds.length === 0) return [];
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          inArray(products.id, productIds)
        )
      );
  },

  async findRecipeLinesForProducts(organizationId: string, productIds: string[]) {
    if (productIds.length === 0) return [];
    return db
      .select()
      .from(recipeLines)
      .where(
        and(
          eq(recipeLines.organizationId, organizationId),
          inArray(recipeLines.productId, productIds)
        )
      );
  },

  async findIngredientsByIds(organizationId: string, ingredientIds: string[]) {
    if (ingredientIds.length === 0) return [];
    return db
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.organizationId, organizationId),
          inArray(ingredients.id, ingredientIds)
        )
      );
  },

  async getCashierDetails(cashierUserId: string, cashierStaffId?: string | null) {
    let staffName: string | null = null;
    let resolvedStaffId: string | null = null;

    if (cashierStaffId) {
      const [st] = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(eq(staff.id, cashierStaffId))
        .limit(1);
      if (st) {
        staffName = st.name;
        resolvedStaffId = st.id;
      }
    }

    const [u] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, cashierUserId))
      .limit(1);

    return {
      staffId: resolvedStaffId,
      name: staffName || u?.fullName || 'Staf Kasir',
    };
  },

  async listSales(organizationId: string, outletId: string, query: ListSalesQuery) {
    const { search, paymentMethod, orderType, status, from, to, page, limit } = query;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(sales.organizationId, organizationId),
      eq(sales.outletId, outletId),
    ];

    if (paymentMethod) {
      conditions.push(eq(sales.paymentMethod, paymentMethod));
    }
    if (orderType) {
      conditions.push(eq(sales.orderType, orderType));
    }
    if (status) {
      conditions.push(eq(sales.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(sales.noNota, `%${search}%`),
          ilike(sales.customerName, `%${search}%`)
        )!
      );
    }
    if (from) {
      conditions.push(gte(sales.soldAt, new Date(`${from}T00:00:00.000Z`)));
    }
    if (to) {
      conditions.push(lte(sales.soldAt, new Date(`${to}T23:59:59.999Z`)));
    }

    const whereClause = and(...conditions);

    const [totalRes] = await db
      .select({ count: count() })
      .from(sales)
      .where(whereClause);

    const total = totalRes ? Number(totalRes.count) : 0;

    const rows = await db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(desc(sales.soldAt))
      .limit(limit)
      .offset(offset);

    return { rows, total };
  },

  async getSaleItems(organizationId: string, saleId: string) {
    return db
      .select()
      .from(saleItems)
      .where(
        and(
          eq(saleItems.organizationId, organizationId),
          eq(saleItems.saleId, saleId)
        )
      );
  },

  async getSaleItemsBySaleIds(organizationId: string, saleIds: string[]) {
    if (saleIds.length === 0) return [];
    return db
      .select()
      .from(saleItems)
      .where(
        and(
          eq(saleItems.organizationId, organizationId),
          inArray(saleItems.saleId, saleIds)
        )
      );
  },

  async getSaleById(organizationId: string, outletId: string, saleId: string) {
    const [sale] = await db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          eq(sales.outletId, outletId),
          eq(sales.id, saleId)
        )
      )
      .limit(1);

    return sale || null;
  },
};
