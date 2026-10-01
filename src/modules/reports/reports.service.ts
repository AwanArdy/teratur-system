import { db } from '../../db/client.js';
import { eq, and, sql, gte, lte, ilike, or } from 'drizzle-orm';
import { ingredients } from '../../db/schema/catalog.js';
import { inventoryBalances, stockMovements } from '../../db/schema/inventory.js';
import { salesService } from '../sales/sales.service.js';
import { reportsRepo } from './reports.repo.js';
import type { RequestContext } from '../../types/express.d.js';
import type { SalesReportQuery, StockReportQuery } from './reports.schemas.js';

function planAllowsRop(planCode: string): boolean {
  return ['growth', 'pro', 'business'].includes(planCode);
}

function daysBetween(from?: string, to?: string): number {
  if (!from || !to) return 7;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export const reportsService = {
  // Laporan transaksi = filter yang sama dengan GET /sales (LaporanTransaksiPage)
  async getSalesReport(ctx: RequestContext, query: SalesReportQuery) {
    return await salesService.listSales(ctx, query as any);
  },

  async exportSales(ctx: RequestContext, body: { format: 'xlsx' | 'pdf'; [k: string]: unknown }) {
    // v1: job async stub — catat job, tandai done agar polling FE tidak gantung.
    // Worker xlsx/pdf nyata masuk iterasi berikut (pakai exceljs/pdfkit).
    const job = await reportsRepo.createExportJob({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      type: body.format === 'xlsx' ? 'sales_xlsx' : 'sales_pdf',
      status: 'done',
      params: body as Record<string, unknown>,
      finishedAt: new Date(),
    });
    return { jobId: job.id, status: job.status };
  },

  async getJob(ctx: RequestContext, jobId: string) {
    const job = await reportsRepo.getExportJob(ctx.organizationId, jobId);
    if (!job) {
      const err: any = new Error('Export job tidak ditemukan');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      // v1 belum ada file biner — FE tetap dapat status done + pesan jelas
      downloadUrl: job.filePath || null,
      finishedAt: job.finishedAt,
    };
  },

  // Laporan stok + ROP (PRD §6.16, DESIGN §11.14)
  async getStockReport(ctx: RequestContext, query: StockReportQuery) {
    const { organizationId, activeOutletId } = ctx;
    const offset = (query.page - 1) * query.limit;
    const periodDays = daysBetween(query.from, query.to);
    const ropAllowed = planAllowsRop(ctx.planCode);

    const conds = [
      eq(ingredients.organizationId, organizationId),
      sql`${ingredients.deletedAt} IS NULL`,
      ...(query.category ? [eq(ingredients.category, query.category as any)] : []),
      ...(query.search
        ? [or(ilike(ingredients.name, `%${query.search}%`), ilike(ingredients.sku, `%${query.search}%`))]
        : []),
    ];

    const rows = await db
      .select({
        id: ingredients.id,
        sku: ingredients.sku,
        name: ingredients.name,
        category: ingredients.category,
        uom: ingredients.uom,
        minStock: sql<number>`${ingredients.minStock}::float`,
        leadTimeDays: ingredients.leadTimeDays,
        purchasePriceIdr: ingredients.purchasePriceIdr,
        purchaseUnitCost: sql<number>`${ingredients.lastPurchaseUnitCost}::float`,
        supplierName: ingredients.supplierName,
        onHand: sql<number>`COALESCE(SUM(${inventoryBalances.qtyOnHand}), 0)::float`,
        avgCost: sql<number>`COALESCE(AVG(NULLIF(${inventoryBalances.avgUnitCost}, 0)), 0)::float`,
      })
      .from(ingredients)
      .leftJoin(
        inventoryBalances,
        and(
          eq(inventoryBalances.itemId, ingredients.id),
          eq(inventoryBalances.itemType, 'ingredient'),
          ...(activeOutletId ? [eq(inventoryBalances.outletId, activeOutletId)] : []),
        ),
      )
      .where(and(...conds))
      .groupBy(
        ingredients.id, ingredients.sku, ingredients.name, ingredients.category,
        ingredients.uom, ingredients.minStock, ingredients.leadTimeDays,
        ingredients.purchasePriceIdr, ingredients.supplierName,
      )
      .limit(query.limit)
      .offset(offset);

    // Mutasi per SKU dalam periode: masuk (qty>0) & keluar (qty<0) untuk
    // stokAwal/masuk/keluar selaras kolom LaporanStokPage + dailyUsage (ROP).
    const moveRows = await db
      .select({
        itemId: stockMovements.itemId,
        inQty: sql<number>`COALESCE(SUM(CASE WHEN ${stockMovements.qty} > 0 THEN ${stockMovements.qty} ELSE 0 END), 0)::float`,
        outQty: sql<number>`COALESCE(SUM(CASE WHEN ${stockMovements.qty} < 0 THEN ABS(${stockMovements.qty}) ELSE 0 END), 0)::float`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.itemType, 'ingredient'),
          ...(activeOutletId ? [eq(stockMovements.outletId, activeOutletId)] : []),
          ...(query.from ? [gte(stockMovements.occurredAt, new Date(`${query.from}T00:00:00+08:00`))] : []),
          ...(query.to ? [lte(stockMovements.occurredAt, new Date(`${query.to}T23:59:59+08:00`))] : []),
        ),
      )
      .groupBy(stockMovements.itemId);

    const moveMap = new Map(moveRows.map((r) => [r.itemId, { inQty: r.inQty || 0, outQty: r.outQty || 0 }]));

    const items = rows.map((r) => {
      const onHand = r.onHand || 0;
      const minStock = r.minStock || 0;
      const avgCost = r.avgCost || Number((r as any).purchaseUnitCost ?? r.purchasePriceIdr) || 0;
      const moves = moveMap.get(r.id) || { inQty: 0, outQty: 0 };
      const masuk = moves.inQty;
      const keluar = moves.outQty;
      const stokAwal = onHand - masuk + keluar;
      const dailyUsage = keluar / periodDays;

      const rop = ropAllowed ? minStock + dailyUsage * (r.leadTimeDays ?? 3) : null;
      const daysToStockout = dailyUsage > 0 ? onHand / dailyUsage : null;
      const reorderQty =
        rop !== null && onHand <= rop
          ? Math.max(minStock * 2, Math.ceil(dailyUsage * ((r.leadTimeDays ?? 3) + 7)) - onHand)
          : 0;

      let status: 'ok' | 'low' | 'critical' | 'overstock' = 'ok';
      if (onHand <= 0) status = 'critical';
      else if (onHand <= minStock) status = 'low';
      else if (rop !== null && onHand > Math.max(minStock * 4, rop * 3) && dailyUsage < minStock / 30) status = 'overstock';

      if (query.status && status !== query.status) return null;

      return {
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        uom: r.uom,
        stokAwal: Number(stokAwal.toFixed(2)),
        masuk: Number(masuk.toFixed(2)),
        keluar: Number(keluar.toFixed(2)),
        stokAkhir: onHand,
        minStock,
        biayaPerSatuan: avgCost,
        totalNilai: Math.round(onHand * avgCost),
        status,
        leadTimeDays: r.leadTimeDays ?? 3,
        dailyUsage: Number(dailyUsage.toFixed(2)),
        rop: rop !== null ? Number(rop.toFixed(2)) : null,
        daysToStockout: daysToStockout !== null ? Number(daysToStockout.toFixed(1)) : null,
        reorderQty: Math.max(0, Math.ceil(reorderQty)),
        supplierName: r.supplierName,
      };
    }).filter(Boolean);

    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(ingredients)
      .where(and(...conds));

    return { data: items, total: countRow?.total || items.length };
  },
};
