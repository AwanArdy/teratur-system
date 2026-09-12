import { opnamesRepo } from './opnames.repo.js';
import { db } from '../../db/client.js';
import { inventoryRepo } from '../inventory/inventory.repo.js';
import { roundMoney } from '../../lib/money.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { RequestContext } from '../../types/express.d.js';
import { stockOpnames } from '../../db/schema/inventory.js';
import { eq } from 'drizzle-orm';

export const opnamesService = {
  async listOpnames(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    return await opnamesRepo.listOpnames(organizationId, outletId, params);
  },

  async createOpname(ctx: RequestContext, body: any) {
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

    // Ambil Snapshot Qty Sistem
    const bal = await inventoryRepo.findBalanceForUpdate(
      db,
      warehouseId,
      body.itemType,
      body.itemId
    );

    const systemQty = bal ? Number(bal.qtyOnHand) : 0;
    const physicalQty = body.physicalQty;
    const varianceQty = physicalQty - systemQty;

    const [created] = await db
      .insert(stockOpnames)
      .values({
        organizationId: ctx.organizationId,
        outletId: activeOutletId,
        warehouseId,
        itemType: body.itemType,
        itemId: body.itemId,
        systemQty: systemQty.toString(),
        physicalQty: physicalQty.toString(),
        varianceQty: varianceQty.toString(),
        uom: body.uom,
        status: 'pending_review',
        actorUserId: ctx.userId,
        ...(body.notes ? { notes: body.notes } : {}),
      })
      .returning();

    return created;
  },

  async approveOpname(ctx: RequestContext, id: string) {
    const opname = await opnamesRepo.getById(ctx.organizationId, id);
    if (!opname) throw new HttpError(404, 'NOT_FOUND', 'Data opname tidak ditemukan');

    if (opname.status !== 'pending_review') {
      throw new HttpError(409, 'CONFLICT', `Opname ini sudah berstatus ${opname.status}`);
    }

    return await db.transaction(async (tx) => {
      const variance = Number(opname.varianceQty);

      if (variance !== 0) {
        const bal = await inventoryRepo.findBalanceForUpdate(
          tx,
          opname.warehouseId,
          opname.itemType,
          opname.itemId
        );

        const currentAvg = bal ? Number(bal.avgUnitCost) : 0;
        const newQty = (bal ? Number(bal.qtyOnHand) : 0) + variance;

        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: opname.outletId,
          warehouseId: opname.warehouseId,
          itemType: opname.itemType,
          itemId: opname.itemId,
          qtyOnHand: newQty,
          avgUnitCost: currentAvg,
        });

        await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: opname.outletId,
          warehouseId: opname.warehouseId,
          itemType: opname.itemType,
          itemId: opname.itemId,
          type: 'opname',
          qty: variance,
          unitCost: currentAvg,
          amountIdr: roundMoney(Math.abs(variance) * currentAvg),
          refType: 'opname',
          refId: opname.id,
          notes: `Hasil penyesuaian stock opname`,
          actorUserId: ctx.userId,
        });
      }

      const [updated] = await tx
        .update(stockOpnames)
        .set({
          status: 'approved',
          approvedByUserId: ctx.userId,
          decidedAt: new Date(),
        })
        .where(eq(stockOpnames.id, opname.id))
        .returning();

      return updated;
    });
  },

  async rejectOpname(ctx: RequestContext, id: string) {
    const opname = await opnamesRepo.getById(ctx.organizationId, id);
    if (!opname) throw new HttpError(404, 'NOT_FOUND', 'Data opname tidak ditemukan');

    if (opname.status !== 'pending_review') {
      throw new HttpError(409, 'CONFLICT', `Opname ini sudah berstatus ${opname.status}`);
    }

    const [updated] = await db
      .update(stockOpnames)
      .set({
        status: 'rejected',
        approvedByUserId: ctx.userId,
        decidedAt: new Date(),
      })
      .where(eq(stockOpnames.id, opname.id))
      .returning();

    return updated;
  },
};
