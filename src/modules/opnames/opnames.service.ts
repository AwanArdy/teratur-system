import { opnamesRepo } from './opnames.repo.js';
import { db } from '../../db/client.js';
import { inventoryRepo } from '../inventory/inventory.repo.js';
import { roundMoney } from '../../lib/money.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';
import { stockOpnames } from '../../db/schema/inventory.js';
import { warehouses } from '../../db/schema/identity.js';
import { ingredients, products } from '../../db/schema/catalog.js';
import { eq, and, isNull } from 'drizzle-orm';

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
    if (warehouseId) {
      const [wh] = await db
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.id, warehouseId),
            eq(warehouses.organizationId, ctx.organizationId),
            eq(warehouses.outletId, activeOutletId)
          )
        );
      if (!wh) throw new HttpError(404, 'NOT_FOUND', 'Gudang tidak ditemukan pada outlet ini');
    } else {
      const defaultWh = await inventoryRepo.getDefaultWarehouse(ctx.organizationId, activeOutletId);
      if (!defaultWh) throw new HttpError(404, 'NOT_FOUND', 'Gudang default tidak ditemukan');
      warehouseId = defaultWh.id;
    }

    if (body.itemType === 'ingredient') {
      const [ing] = await db
        .select()
        .from(ingredients)
        .where(and(eq(ingredients.id, body.itemId), eq(ingredients.organizationId, ctx.organizationId), isNull(ingredients.deletedAt)));
      if (!ing) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    } else {
      const [prod] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, body.itemId), eq(products.organizationId, ctx.organizationId), isNull(products.deletedAt)));
      if (!prod) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
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
    return await db.transaction(async (tx) => {
      const [opname] = await tx
        .select()
        .from(stockOpnames)
        .where(and(eq(stockOpnames.id, id), eq(stockOpnames.organizationId, ctx.organizationId)))
        .for('update');

      if (!opname) throw new HttpError(404, 'NOT_FOUND', 'Data opname tidak ditemukan');

      if (opname.status !== 'pending_review') {
        throw new HttpError(409, 'CONFLICT', `Opname ini sudah berstatus ${opname.status}`);
      }

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
        .where(and(eq(stockOpnames.id, opname.id), eq(stockOpnames.status, 'pending_review')))
        .returning();

      return updated;
    });
  },

  async rejectOpname(ctx: RequestContext, id: string) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(stockOpnames)
        .set({
          status: 'rejected',
          approvedByUserId: ctx.userId,
          decidedAt: new Date(),
        })
        .where(and(eq(stockOpnames.id, id), eq(stockOpnames.organizationId, ctx.organizationId), eq(stockOpnames.status, 'pending_review')))
        .returning();

      if (!updated) {
        const existing = await opnamesRepo.getById(ctx.organizationId, id);
        if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Data opname tidak ditemukan');
        throw new HttpError(409, 'CONFLICT', `Opname ini sudah berstatus ${existing.status}`);
      }

      return updated;
    });
  },
};
