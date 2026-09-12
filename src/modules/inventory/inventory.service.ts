import { inventoryRepo } from './inventory.repo.js';
import { db } from '../../db/client.js';
import { calculateWac, roundMoney } from '../../lib/money.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';
import { ingredients, products } from '../../db/schema/catalog.js';
import { eq } from 'drizzle-orm';

export const inventoryService = {
  async listInventory(
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
    const result = await inventoryRepo.listInventoryBalances(organizationId, outletId, params);

    const enriched = result.data.map((item) => {
      const qtyOnHand = Number(item.qtyOnHand);
      const qtyReserved = Number(item.qtyReserved);
      const qtyAvailable = Math.max(0, qtyOnHand - qtyReserved);
      const minStock = Number(item.minStock);

      let status: 'ok' | 'low' | 'critical' = 'ok';
      if (qtyAvailable <= 0) {
        status = 'critical';
      } else if (qtyAvailable <= minStock) {
        status = 'low';
      }

      return {
        ...item,
        qtyOnHand,
        qtyReserved,
        qtyAvailable,
        minStock,
        status,
      };
    });

    return { data: enriched, total: result.total };
  },

  async createAdjustment(ctx: RequestContext, body: any) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) {
      throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib disertakan');
    }

    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const defaultWh = await inventoryRepo.getDefaultWarehouse(ctx.organizationId, activeOutletId);
      if (!defaultWh) {
        throw new HttpError(404, 'NOT_FOUND', 'Gudang default tidak ditemukan untuk outlet ini');
      }
      warehouseId = defaultWh.id;
    }

    // Verifikasi keberadaan item di catalog
    if (body.itemType === 'ingredient') {
      const [ing] = await db.select().from(ingredients).where(eq(ingredients.id, body.itemId));
      if (!ing) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    } else {
      const [prod] = await db.select().from(products).where(eq(products.id, body.itemId));
      if (!prod) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
    }

    return await db.transaction(async (tx) => {
      const existingBal = await inventoryRepo.findBalanceForUpdate(
        tx,
        warehouseId,
        body.itemType,
        body.itemId
      );

      const oldQty = existingBal ? Number(existingBal.qtyOnHand) : 0;
      const oldAvgCost = existingBal ? Number(existingBal.avgUnitCost) : 0;
      const adjustQty = Number(body.qty);

      if (body.direction === 'out') {
        const available = oldQty - (existingBal ? Number(existingBal.qtyReserved) : 0);
        if (available < adjustQty) {
          throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Stok tidak mencukupi untuk penyesuaian keluar', {
            requested: adjustQty,
            available,
          });
        }

        const newQty = oldQty - adjustQty;
        const unitCost = oldAvgCost;
        const amountIdr = roundMoney(adjustQty * unitCost);

        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          warehouseId,
          itemType: body.itemType,
          itemId: body.itemId,
          qtyOnHand: newQty,
          avgUnitCost: oldAvgCost,
        });

        const movement = await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          warehouseId,
          itemType: body.itemType,
          itemId: body.itemId,
          type: 'adjustment_out',
          qty: -adjustQty,
          unitCost,
          amountIdr,
          refType: 'adjustment',
          refId: ctx.requestId,
          ...(body.notes ? { notes: body.notes } : {}),
          actorUserId: ctx.userId,
        });

        return { balance: { qtyOnHand: newQty, avgUnitCost: oldAvgCost }, movement };
      } else {
        // Direction IN
        let inboundCost = body.unitCost !== undefined ? Number(body.unitCost) : oldAvgCost;
        if (oldQty === 0 && oldAvgCost === 0 && inboundCost === 0) {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Harga satuan (unitCost) wajib diisi untuk stok masuk pertama kali'
          );
        }

        const newQty = oldQty + adjustQty;
        const newAvgCost = calculateWac(oldQty, oldAvgCost, adjustQty, inboundCost);
        const amountIdr = roundMoney(adjustQty * inboundCost);

        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          warehouseId,
          itemType: body.itemType,
          itemId: body.itemId,
          qtyOnHand: newQty,
          avgUnitCost: newAvgCost,
        });

        const movement = await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: activeOutletId,
          warehouseId,
          itemType: body.itemType,
          itemId: body.itemId,
          type: 'adjustment_in',
          qty: adjustQty,
          unitCost: inboundCost,
          amountIdr,
          refType: 'adjustment',
          refId: ctx.requestId,
          ...(body.notes ? { notes: body.notes } : {}),
          actorUserId: ctx.userId,
        });

        return { balance: { qtyOnHand: newQty, avgUnitCost: newAvgCost }, movement };
      }
    });
  },

  async getMovements(
    organizationId: string,
    itemType: 'ingredient' | 'finished_good',
    itemId: string,
    params: { page: number; limit: number }
  ) {
    return await inventoryRepo.listMovements(organizationId, itemType, itemId, params);
  },
};
