import { db } from "../../db/client.js";
import { eq, and, isNull, sql, gte, lte, desc, sum, count } from "drizzle-orm";
import { dailyMetrics } from "../../db/schema/ops.js";
import { sales, saleItems } from "../../db/schema/sales.js";
import { inventoryBalances, wasteLogs } from "../../db/schema/inventory.js";
import { ingredients, products } from "../../db/schema/catalog.js"; 

export const dashboardRepo = {
  async getMetricsAggregation(
    organizationId: string,
    outletId: string | null,
    fromDate: string,
    toDate: string
  ) {
    const baseConditions = [
      eq(dailyMetrics.organizationId, organizationId),
      ...(outletId ? [eq(dailyMetrics.outletId, outletId)] : []),
      gte(dailyMetrics.date, fromDate),
      lte(dailyMetrics.date, toDate),
    ];

    const [agg] = await db
      .select({
        omsetNetIdr: sql<number>`COALESCE(SUM(${dailyMetrics.omsetNetIdr}), 0)::float`,
        omsetGrossIdr: sql<number>`COALESCE(SUM(${dailyMetrics.omsetGrossIdr}), 0)::float`,
        cogsIdr: sql<number>`COALESCE(SUM(${dailyMetrics.cogsIdr}), 0)::float`,
        opexIdr: sql<number>`COALESCE(SUM(${dailyMetrics.opexIdr}), 0)::float`,
        wasteIdr: sql<number>`COALESCE(SUM(${dailyMetrics.wasteIdr}), 0)::float`,
        trxCount: sql<number>`COALESCE(SUM(${dailyMetrics.trxCount}), 0)::int`,
      })
      .from(dailyMetrics)
      .where(and(...baseConditions));

    return agg || {
      omsetNetIdr: 0,
      omsetGrossIdr: 0,
      cogsIdr: 0,
      opexIdr: 0,
      wasteIdr: 0,
      trxCount: 0,
    };
  },

  async getMonthlyChartData(organizationId: string, outletId: string | null) {
    const baseConditions = [
      eq(dailyMetrics.organizationId, organizationId),
      ...(outletId ? [eq(dailyMetrics.outletId, outletId)] : []),
    ];

    return await db
      .select({
        month: sql<string>`SUBSTRING(${dailyMetrics.date} FROM 1 FOR 7)`,
        omsetIdr: sql<number>`COALESCE(SUM(${dailyMetrics.omsetNetIdr}), 0)::float`,
        cogsIdr: sql<number>`COALESCE(SUM(${dailyMetrics.cogsIdr}), 0)::float`,
        profitIdr: sql<number>`COALESCE(SUM(${dailyMetrics.omsetNetIdr} - ${dailyMetrics.cogsIdr} - ${dailyMetrics.opexIdr}), 0)::float`,
      })
      .from(dailyMetrics)
      .where(and(...baseConditions))
      .groupBy(sql`SUBSTRING(${dailyMetrics.date} FROM 1 FOR 7)`)
      .orderBy(sql`SUBSTRING(${dailyMetrics.date} FROM 1 FOR 7)`)
      .limit(6);
  },

  async getLowStockItems(organizationId: string, outletId: string | null) {
    const baseConditions = [
      eq(ingredients.organizationId, organizationId),
      isNull(ingredients.deletedAt),
    ];

    return await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        currentQty: sql<number>`COALESCE(${inventoryBalances.qtyOnHand}, 0)::float`,
        minStock: sql<number>`${ingredients.minStock}::float`,
        uom: ingredients.uom,
        supplierName: ingredients.supplierName,
      })
      .from(ingredients)
      .innerJoin(
        inventoryBalances,
        and(
          eq(inventoryBalances.itemId, ingredients.id),
          eq(inventoryBalances.itemType, 'ingredient'),
          ...(outletId ? [eq(inventoryBalances.outletId, outletId)] : [])
        )
      )
      .where(
        and(
          ...baseConditions,
          sql`COALESCE(${inventoryBalances.qtyOnHand}, 0) <= ${ingredients.minStock}`
        )
      )
      .limit(5);
  },

  async getMenuPerformance(organizationId: string, outletId: string | null) {
    return await db
      .select({
        name: saleItems.nameSnapshot,
        soldCount: sql<number>`COALESCE(SUM(${saleItems.qty}), 0)::float`,
        sellingPriceIdr: sql<number>`MAX(${saleItems.unitPriceIdr})::float`,
        cogsIdr: sql<number>`MAX(${saleItems.unitCogsIdr})::float`,
        grossProfitIdr: sql<number>`COALESCE(SUM(${saleItems.lineTotalIdr} - ${saleItems.lineCogsIdr}), 0)::float`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(
        and(
          eq(sales.organizationId, organizationId),
          eq(sales.status, 'paid'),
          ...(outletId ? [eq(sales.outletId, outletId)] : [])
        )
      )
      .groupBy(saleItems.nameSnapshot)
      .orderBy(desc(sql`SUM(${saleItems.qty})`))
      .limit(5);
  },

  async getRecentSales(organizationId: string, outletId: string | null) {
    return await db
      .select({
        id: sales.id,
        noNota: sales.noNota,
        totalIdr: sales.totalIdr,
        paymentMethod: sales.paymentMethod,
        soldAt: sales.soldAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          eq(sales.status, 'paid'),
          ...(outletId ? [eq(sales.outletId, outletId)] : [])
        )
      )
      .orderBy(desc(sales.soldAt))
      .limit(5);
  },
}
