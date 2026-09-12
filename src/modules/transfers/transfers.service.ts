import { transfersRepo } from './transfers.repo.js';
import { db } from '../../db/client.js';
import { generateDocumentNo } from '../../lib/documentNo.js';
import { inventoryRepo } from '../inventory/inventory.repo.js';
import { roundMoney } from '../../lib/money.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { RequestContext } from '../../types/express.d.js';
import { stockTransfers, stockTransferLines } from '../../db/schema/inventory.js';
import { warehouses } from '../../db/schema/identity.js';
import { eq, and } from 'drizzle-orm';

export const transfersService = {
  async listTransfers(
    organizationId: string,
    params: { status?: string | undefined; page: number; limit: number }
  ) {
    return await transfersRepo.listTransfers(organizationId, params);
  },

  async getTransferById(organizationId: string, id: string) {
    const transfer = await transfersRepo.getTransferById(organizationId, id);
    if (!transfer) throw new HttpError(404, 'NOT_FOUND', 'Dokumen transfer stok tidak ditemukan');
    return transfer;
  },

  async createTransfer(ctx: RequestContext, body: any) {
    if (body.fromWarehouseId === body.toWarehouseId) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Gudang asal dan gudang tujuan tidak boleh sama');
    }

    const [fromWh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, body.fromWarehouseId),
          eq(warehouses.organizationId, ctx.organizationId)
        )
      );
    const [toWh] = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, body.toWarehouseId),
          eq(warehouses.organizationId, ctx.organizationId)
        )
      );

    if (!fromWh || !toWh) {
      throw new HttpError(404, 'NOT_FOUND', 'Gudang asal atau gudang tujuan tidak ditemukan');
    }

    return await db.transaction(async (tx) => {
      const preparedLines: Array<{
        itemType: 'ingredient' | 'finished_good';
        itemId: string;
        qty: number;
        uom: any;
        unitCost: number;
      }> = [];

      // Validasi Stok & Potong Stok Gudang Asal
      for (const line of body.lines) {
        const balance = await inventoryRepo.findBalanceForUpdate(
          tx,
          fromWh.id,
          line.itemType,
          line.itemId
        );

        const available = balance ? Number(balance.qtyOnHand) - Number(balance.qtyReserved) : 0;
        if (available < line.qty) {
          throw new HttpError(
            409,
            'INSUFFICIENT_STOCK',
            `Stok tidak mencukupi di gudang asal untuk item ${line.itemId}`,
            { required: line.qty, available }
          );
        }

        const unitCost = balance ? Number(balance.avgUnitCost) : 0;
        const newQtyOnHand = Number(balance!.qtyOnHand) - line.qty;

        // Potong stok gudang asal
        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: fromWh.outletId,
          warehouseId: fromWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          qtyOnHand: newQtyOnHand,
          avgUnitCost: unitCost,
        });

        // Catat mutasi transfer out dari gudang asal
        await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: fromWh.outletId,
          warehouseId: fromWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          type: 'transfer_out',
          qty: -line.qty,
          unitCost,
          amountIdr: roundMoney(line.qty * unitCost),
          refType: 'transfer',
          refId: ctx.requestId,
          notes: `Transfer stok ke ${toWh.name}`,
          actorUserId: ctx.userId,
        });

        preparedLines.push({
          itemType: line.itemType,
          itemId: line.itemId,
          qty: line.qty,
          uom: line.uom,
          unitCost,
        });
      }

      const noTransfer = await generateDocumentNo(ctx.organizationId, null, 'TRF');

      const [header] = await tx
        .insert(stockTransfers)
        .values({
          organizationId: ctx.organizationId,
          noTransfer,
          fromWarehouseId: fromWh.id,
          toWarehouseId: toWh.id,
          status: 'in_transit',
          actorUserId: ctx.userId,
          ...(body.notes ? { notes: body.notes } : {}),
        })
        .returning();

      await tx.insert(stockTransferLines).values(
        preparedLines.map((l) => ({
          organizationId: ctx.organizationId,
          transferId: header.id,
          itemType: l.itemType,
          itemId: l.itemId,
          qty: l.qty.toString(),
          uom: l.uom,
          unitCost: l.unitCost.toString(),
        }))
      );

      return { ...header, lines: preparedLines };
    });
  },

  async receiveTransfer(ctx: RequestContext, id: string) {
    const transfer = await transfersRepo.getTransferById(ctx.organizationId, id);
    if (!transfer) throw new HttpError(404, 'NOT_FOUND', 'Dokumen transfer tidak ditemukan');

    if (transfer.status !== 'in_transit') {
      throw new HttpError(409, 'CONFLICT', `Transfer ini sudah ${transfer.status}`);
    }

    const [toWh] = await db.select().from(warehouses).where(eq(warehouses.id, transfer.toWarehouseId));
    if (!toWh) throw new HttpError(404, 'NOT_FOUND', 'Gudang tujuan tidak ditemukan');

    return await db.transaction(async (tx) => {
      for (const line of transfer.lines) {
        const lineQty = Number(line.qty);
        const lineUnitCost = Number(line.unitCost);

        const destBal = await inventoryRepo.findBalanceForUpdate(
          tx,
          toWh.id,
          line.itemType,
          line.itemId
        );

        const oldQty = destBal ? Number(destBal.qtyOnHand) : 0;
        const oldAvg = destBal ? Number(destBal.avgUnitCost) : 0;

        const newQty = oldQty + lineQty;
        const newAvg = oldQty === 0 ? lineUnitCost : Number((((oldQty * oldAvg) + (lineQty * lineUnitCost)) / newQty).toFixed(4));

        // Tambah stok gudang tujuan dengan WAC baru
        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: toWh.outletId,
          warehouseId: toWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          qtyOnHand: newQty,
          avgUnitCost: newAvg,
        });

        // Catat mutasi transfer in di gudang tujuan
        await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: toWh.outletId,
          warehouseId: toWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          type: 'transfer_in',
          qty: lineQty,
          unitCost: lineUnitCost,
          amountIdr: roundMoney(lineQty * lineUnitCost),
          refType: 'transfer',
          refId: transfer.id,
          notes: `Penerimaan transfer nota ${transfer.noTransfer}`,
          actorUserId: ctx.userId,
        });
      }

      const [updated] = await tx
        .update(stockTransfers)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(stockTransfers.id, transfer.id))
        .returning();

      return updated;
    });
  },

  async cancelTransfer(ctx: RequestContext, id: string) {
    const transfer = await transfersRepo.getTransferById(ctx.organizationId, id);
    if (!transfer) throw new HttpError(404, 'NOT_FOUND', 'Dokumen transfer tidak ditemukan');

    if (transfer.status !== 'in_transit') {
      throw new HttpError(409, 'CONFLICT', `Transfer ini sudah ${transfer.status}`);
    }

    const [fromWh] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, transfer.fromWarehouseId));
    if (!fromWh) throw new HttpError(404, 'NOT_FOUND', 'Gudang asal tidak ditemukan');

    return await db.transaction(async (tx) => {
      for (const line of transfer.lines) {
        const lineQty = Number(line.qty);
        const lineUnitCost = Number(line.unitCost);

        const origBal = await inventoryRepo.findBalanceForUpdate(
          tx,
          fromWh.id,
          line.itemType,
          line.itemId
        );

        const newQty = (origBal ? Number(origBal.qtyOnHand) : 0) + lineQty;
        const currentAvg = origBal ? Number(origBal.avgUnitCost) : lineUnitCost;

        // Kembalikan stok ke gudang asal
        await inventoryRepo.upsertBalance(tx, {
          organizationId: ctx.organizationId,
          outletId: fromWh.outletId,
          warehouseId: fromWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          qtyOnHand: newQty,
          avgUnitCost: currentAvg,
        });

        await inventoryRepo.createMovement(tx, {
          organizationId: ctx.organizationId,
          outletId: fromWh.outletId,
          warehouseId: fromWh.id,
          itemType: line.itemType,
          itemId: line.itemId,
          type: 'transfer_in',
          qty: lineQty,
          unitCost: lineUnitCost,
          amountIdr: roundMoney(lineQty * lineUnitCost),
          refType: 'transfer_cancel',
          refId: transfer.id,
          notes: `Pengembalian pembatalan transfer ${transfer.noTransfer}`,
          actorUserId: ctx.userId,
        });
      }

      const [updated] = await tx
        .update(stockTransfers)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(eq(stockTransfers.id, transfer.id))
        .returning();

      return updated;
    });
  },
};
