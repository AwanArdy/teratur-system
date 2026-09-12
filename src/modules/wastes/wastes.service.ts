import { wastesRepo } from './wastes.repo.js';
import { db } from '../../db/client.js';
import { inventoryRepo } from '../inventory/inventory.repo.js';
import { roundMoney } from '../../lib/money.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { RequestContext } from '../../types/express.d.js';
import { wasteLogs } from '../../db/schema/inventory.js';
import { dailyMetrics } from '../../db/schema/ops.js';
import { sql, eq, and } from 'drizzle-orm';

export const wastesService = {
  async listWastes(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    return await wastesRepo.listWastes(organizationId, outletId, params);
  },

  async createWaste(ctx: RequestContext, body: any) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) {
      throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib disertakan');
    }

    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const defaultWh = await inventoryRepo.getDefaultWarehouse(ctx.organizationId, activeOutletId);
      if (!defaultWh) throw new HttpError(404, 'NOT_FOUND', 'Gudang default tidak ditemukan');
      warehouseId = defaultWh.id;
    }

    return await db.transaction(async (tx) => {
      const bal = await inventoryRepo.findBalanceForUpdate(
        tx,
        warehouseId,
        body.itemType,
        body.itemId
      );

      const available = bal ? Number(bal.qtyOnHand) - Number(bal.qtyReserved) : 0;
      if (available < body.qty) {
        throw new HttpError(
          409,
          'INSUFFICIENT_STOCK',
          'Stok tidak mencukupi untuk mencatat kerugian/waste',
          { required: body.qty, available }
        );
      }

      const currentAvg = bal ? Number(bal.avgUnitCost) : 0;
      const lossIdr = body.lossIdr !== undefined ? body.lossIdr : roundMoney(body.qty * currentAvg);
      const newQty = Number(bal!.qtyOnHand) - body.qty;

      // Potong stok persediaan
      await inventoryRepo.upsertBalance(tx, {
        organizationId: ctx.organizationId,
        outletId: activeOutletId,
        warehouseId,
        itemType: body.itemType,
        itemId: body.itemId,
        qtyOnHand: newQty,
        avgUnitCost: currentAvg,
      });

      // Catat mutasi waste_out
      await inventoryRepo.createMovement(tx, {
        organizationId: ctx.organizationId,
        outletId: activeOutletId,
        warehouseId,
        itemType: body.itemType,
        itemId: body.itemId,
        type: 'waste_out',
        qty: -body.qty,
        unitCost: currentAvg,
        amountIdr: lossIdr,
        refType: 'waste',
        refId: ctx.requestId,
        notes: `Pencatatan kerusakan/waste (${body.reason})`,
        actorUserId: ctx.userId,
      });

      const [waste] = await tx
        .insert(wasteLogs)
        .values({
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          warehouseId,
          itemType: body.itemType,
          itemId: body.itemId,
          qty: body.qty.toString(),
          uom: body.uom,
          reason: body.reason,
          lossIdr,
          actorUserId: ctx.userId,
        })
        .returning();

      // Update metrik harian waste
      const dateWita = new Date().toISOString().slice(0, 10);
      await tx
        .insert(dailyMetrics)
        .values({
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          date: dateWita,
          wasteIdr: lossIdr,
        })
        .onConflictDoUpdate({
          target: [dailyMetrics.outletId, dailyMetrics.date],
          set: {
            wasteIdr: sql`${dailyMetrics.wasteIdr} + ${lossIdr}`,
            updatedAt: new Date(),
          },
        });

      return waste;
    });
  },
};
