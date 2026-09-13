import { db } from "../../db/client.js";
import { eq, and, isNull, sql, gte, lte, desc } from "drizzle-orm";
import { dailyMetrics } from "../../db/schema/ops.js";
import { ingredients } from "../../db/schema/catalog.js";
import { inventoryBalances } from "../../db/schema/inventory.js";
import { expenses } from "../../db/schema/expenses.js";
import { sales, saleItems } from "../../db/schema/sales.js";

export const aiRepo = {
  async getBusinessContext(organizationId: string, outletId: string | null, dateFrom: string, dateTo: string) {
    const metricsBase = [
      eq(dailyMetrics.organizationId, organizationId),
      ...(outletId ? [eq(dailyMetrics.outletId, outletId)] : []),
      gte(dailyMetrics.date, dateFrom),
      lte(dailyMetrics.date, dateTo),
    ];

    const [salesSummary] = await db
      .select({
        omsetNetIdr: sql<number>`COALESCE(SUM(${dailyMetrics.omsetNetIdr}), 0)::float`,
        cogsIdr: sql<number>`COALESCE(SUM(${dailyMetrics.cogsIdr}), 0)::float`,
        opexIdr: sql<number>`COALESCE(SUM(${dailyMetrics.opexIdr}), 0)::float`,
        wasteIdr: sql<number>`COALESCE(SUM(${dailyMetrics.wasteIdr}), 0)::float`,
        totalTransactions: sql<number>`COALESCE(SUM(${dailyMetrics.trxCount}), 0)::int`,
      })
      .from(dailyMetrics)
      .where(and(...metricsBase));

    const lowStockItems = await db
      .select({
        name: ingredients.name,
        qtyOnHand: sql<number>`COALESCE(${inventoryBalances.qtyOnHand}, 0)::float`,
        minStock: sql<number>`${ingredients.minStock}::float`,
        uom: ingredients.uom
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
          eq(ingredients.organizationId, organizationId),
          isNull(ingredients.deletedAt),
          sql`COALESCE(${inventoryBalances.qtyOnHand}, 0) <= ${ingredients.minStock}`
        )
      )
      .limit(5);

    const topProducts = await db
      .select({
        name: saleItems.nameSnapshot,
        totalQty: sql<number>`COALESCE(SUM(${saleItems.qty}), 0)::float`,
        totalSalesIdr: sql<number>`COALESCE(SUM(${saleItems.lineTotalIdr}), 0)::float`,
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

    const topExpenseCategories = await db
      .select({
        category: expenses.category,
        totalIdr: sql<number>`COALESCE(SUM(${expenses.totalIdr}), 0)::float`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.organizationId, organizationId),
          ...(outletId ? [eq(expenses.outletId, outletId)] : []),
          gte(expenses.date, dateFrom),
          lte(expenses.date, dateTo)
        )
      )
      .groupBy(expenses.category)
      .orderBy(desc(sql`SUM(${expenses.totalIdr})`))
      .limit(3);

    const omset = salesSummary?.omsetNetIdr || 0;
    const cogs = salesSummary?.cogsIdr || 0;
    const opex = salesSummary?.opexIdr || 0;
    const grossProfit = omset - cogs;
    const nettProfit = grossProfit - opex;

    return {
      period: { from: dateFrom, to: dateTo },
      financials: {
        omsetNetIdr: omset,
        cogsIdr: cogs,
        grossProfitIdr: grossProfit,
        grossMarginPct: omset > 0 ? Number(((grossProfit / omset) * 100).toFixed(1)) : 0,
        opexIdr: opex,
        nettProfitIdr: nettProfit,
        nettMarginPct: omset > 0 ? Number(((nettProfit / omset) * 100).toFixed()) : 0,
        wasteLossIdr: salesSummary?.totalTransactions || 0,
      },
      lowStockItems,
      topProducts,
      topExpenseCategories
    };
  },
};
