import crypto from 'crypto';
import { db } from '../../db/client.js';
import { eq, and, sql } from 'drizzle-orm';
import { sales, saleItems } from '../../db/schema/sales.js';
import { inventoryBalances, stockMovements } from '../../db/schema/inventory.js';
import { cashShifts } from '../../db/schema/staff.js';
import { dailyMetrics } from '../../db/schema/ops.js';
import { HttpError } from '../../lib/httpError.js';
import { generateDocumentNo } from '../../lib/documentNo.js';
import { formatWitaDisplay, getWitaDateString, isSameWitaDay } from '../../lib/time.js';
import { salesRepo } from './sales.repo.js';
import { staffRepo } from '../staff/staff.repo.js';
import type { RequestContext } from '../../types/express.d.ts';
import type { CreateSaleInput, ListSalesQuery } from './sales.schemas.js';

export const salesService = {
  async createSale(ctx: RequestContext, input: CreateSaleInput) {
    const { organizationId, activeOutletId, userId, staffId } = ctx;

    if (ctx.planStatus === 'expired') {
      throw new HttpError(
        403,
        'PLAN_REQUIRED',
        'Masa berlangganan Anda telah berakhir. Perpanjang langganan untuk mencatat transaksi penjualan.'
      );
    }

    if (!activeOutletId) {
      throw new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      );
    }

    if (input.cashierStaffId) {
      const cashierStaff = await staffRepo.getById(organizationId, input.cashierStaffId);
      if (!cashierStaff || cashierStaff.organizationId !== organizationId) {
        throw new HttpError(404, 'NOT_FOUND', 'Staf kasir tidak ditemukan pada organisasi ini');
      }
    }

    const defaultWarehouse = await salesRepo.getDefaultWarehouse(
      organizationId,
      activeOutletId
    );
    if (!defaultWarehouse) {
      throw new HttpError(
        400,
        'WAREHOUSE_NOT_FOUND',
        'Outlet tidak memiliki gudang default'
      );
    }

    const openShift = await salesRepo.getOpenCashShift(
      organizationId,
      activeOutletId,
      input.cashierStaffId || staffId
    );

    // Collect product details
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const productRows = await salesRepo.findProductsByIds(
      organizationId,
      productIds
    );
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    for (const productId of productIds) {
      const p = productMap.get(productId);
      if (!p || p.deletedAt || !p.isActive) {
        throw new HttpError(
          400,
          'INVALID_PRODUCT',
          `Produk dengan ID ${productId} tidak ditemukan atau tidak aktif`
        );
      }
    }

    const recipeRows = await salesRepo.findRecipeLinesForProducts(
      organizationId,
      productIds
    );
    const recipeMap = new Map<string, typeof recipeRows>();
    for (const r of recipeRows) {
      const list = recipeMap.get(r.productId) || [];
      list.push(r);
      recipeMap.set(r.productId, list);
    }

    // Collect ingredients for cost fallback if needed
    const ingredientIds = [
      ...new Set(
        recipeRows
          .filter((r) => r.componentType === 'ingredient')
          .map((r) => r.componentId)
      ),
    ];
    const ingredientRows = await salesRepo.findIngredientsByIds(
      organizationId,
      ingredientIds
    );
    const ingredientMap = new Map(ingredientRows.map((ing) => [ing.id, ing]));

    const result = await db.transaction(async (tx) => {
      const saleId = crypto.randomUUID();
      const noNota = await generateDocumentNo(
        tx,
        organizationId,
        activeOutletId,
        'sales'
      );

      let subtotalIdr = 0;
      let totalCogsIdr = 0;
      const processedItems: Array<{
        productId: string;
        nameSnapshot: string;
        qty: number;
        unitPriceIdr: number;
        lineTotalIdr: number;
        unitCogsIdr: number;
        lineCogsIdr: number;
      }> = [];

      for (const item of input.items) {
        const product = productMap.get(item.productId)!;
        if (item.unitPriceIdr !== undefined && item.unitPriceIdr !== product.sellingPriceIdr) {
          const isManagerOrOwner = ctx.orgRole === 'owner' || ctx.orgRole === 'admin' || ctx.staffRole === 'manager';
          if (!isManagerOrOwner) {
            throw new HttpError(403, 'FORBIDDEN', 'Override harga produk memerlukan izin manager atau owner');
          }
        }
        const unitPriceIdr = item.unitPriceIdr ?? product.sellingPriceIdr;
        const lineTotalIdr = Math.round(unitPriceIdr * item.qty);
        subtotalIdr += lineTotalIdr;

        let accumulatedUnitCogs = 0;

        if (product.kind === 'made_to_order' || product.kind === 'pre_order') {
          const lines = recipeMap.get(product.id) || [];
          if (lines.length === 0) {
            throw new HttpError(
              400,
              'RECIPE_MISSING',
              `Produk ${product.name} (kind: ${product.kind}) belum memiliki resep`
            );
          }

          for (const line of lines) {
            const neededQty = Number(line.qty) * item.qty;
            const stockItemType =
              line.componentType === 'ingredient' ? 'ingredient' : 'finished_good';

            let [balance] = await tx
              .select()
              .from(inventoryBalances)
              .where(
                and(
                  eq(inventoryBalances.warehouseId, defaultWarehouse.id),
                  eq(inventoryBalances.itemType, stockItemType),
                  eq(inventoryBalances.itemId, line.componentId)
                )
              )
              .for('update');

            if (!balance) {
              const [newBal] = await tx
                .insert(inventoryBalances)
                .values({
                  organizationId,
                  outletId: activeOutletId,
                  warehouseId: defaultWarehouse.id,
                  itemType: stockItemType,
                  itemId: line.componentId,
                  qtyOnHand: '0.0000',
                  qtyReserved: '0.0000',
                  avgUnitCost: '0.0000',
                })
                .returning();
              balance = newBal!;
            }

            const available =
              Number(balance.qtyOnHand) - Number(balance.qtyReserved);
            if (available < neededQty) {
              const itemName =
                line.componentType === 'ingredient'
                  ? ingredientMap.get(line.componentId)?.name || 'Bahan'
                  : productMap.get(line.componentId)?.name || 'Produk';
              throw new HttpError(
                400,
                'INSUFFICIENT_STOCK',
                `Stok ${itemName} tidak mencukupi (tersedia: ${available}, dibutuhkan: ${neededQty})`
              );
            }

            const newQtyOnHand = Number(balance.qtyOnHand) - neededQty;
            await tx
              .update(inventoryBalances)
              .set({
                qtyOnHand: newQtyOnHand.toFixed(4),
                updatedAt: new Date(),
              })
              .where(eq(inventoryBalances.id, balance.id));

            let unitCost = Number(balance.avgUnitCost);
            if (unitCost === 0 && line.componentType === 'ingredient') {
              const ing = ingredientMap.get(line.componentId);
              if (ing) unitCost = Number((ing as any).lastPurchaseUnitCost ?? ing.purchasePriceIdr);
            }

            const amountIdr = Math.round(neededQty * unitCost);

            await tx.insert(stockMovements).values({
              organizationId,
              outletId: activeOutletId,
              warehouseId: defaultWarehouse.id,
              itemType: stockItemType,
              itemId: line.componentId,
              type: 'sale_out',
              qty: neededQty.toFixed(4),
              unitCost: unitCost.toFixed(4),
              amountIdr,
              refType: 'sales',
              refId: saleId,
              actorUserId: userId,
            });

            accumulatedUnitCogs += Number(line.qty) * unitCost;
          }
        } else if (product.kind === 'finished_good') {
          const neededQty = item.qty;

          let [balance] = await tx
            .select()
            .from(inventoryBalances)
            .where(
              and(
                eq(inventoryBalances.warehouseId, defaultWarehouse.id),
                eq(inventoryBalances.itemType, 'finished_good'),
                eq(inventoryBalances.itemId, product.id)
              )
            )
            .for('update');

          if (!balance) {
            const [newBal] = await tx
              .insert(inventoryBalances)
              .values({
                organizationId,
                outletId: activeOutletId,
                warehouseId: defaultWarehouse.id,
                itemType: 'finished_good',
                itemId: product.id,
                qtyOnHand: '0.0000',
                qtyReserved: '0.0000',
                avgUnitCost: '0.0000',
              })
              .returning();
            balance = newBal!;
          }

          const available =
            Number(balance.qtyOnHand) - Number(balance.qtyReserved);
          if (available < neededQty) {
            throw new HttpError(
              400,
              'INSUFFICIENT_STOCK',
              `Stok ${product.name} tidak mencukupi (tersedia: ${available}, dibutuhkan: ${neededQty})`
            );
          }

          const newQtyOnHand = Number(balance.qtyOnHand) - neededQty;
          await tx
            .update(inventoryBalances)
            .set({
              qtyOnHand: newQtyOnHand.toFixed(4),
              updatedAt: new Date(),
            })
            .where(eq(inventoryBalances.id, balance.id));

          const unitCost = Number(balance.avgUnitCost);
          const amountIdr = Math.round(neededQty * unitCost);

          await tx.insert(stockMovements).values({
            organizationId,
            outletId: activeOutletId,
            warehouseId: defaultWarehouse.id,
            itemType: 'finished_good',
            itemId: product.id,
            type: 'sale_out',
            qty: neededQty.toFixed(4),
            unitCost: unitCost.toFixed(4),
            amountIdr,
            refType: 'sales',
            refId: saleId,
            actorUserId: userId,
          });

          accumulatedUnitCogs = unitCost;
        }

        const unitCogsIdr = Math.round(accumulatedUnitCogs);
        const lineCogsIdr = Math.round(unitCogsIdr * item.qty);
        totalCogsIdr += lineCogsIdr;

        processedItems.push({
          productId: product.id,
          nameSnapshot: product.name,
          qty: item.qty,
          unitPriceIdr,
          lineTotalIdr,
          unitCogsIdr,
          lineCogsIdr,
        });
      }

      if (input.discountIdr > subtotalIdr) {
        throw new HttpError(400, 'INVALID_DISCOUNT', 'Diskon tidak boleh melebihi subtotal');
      }

      const totalIdr = Math.round(subtotalIdr + input.taxIdr - input.discountIdr);
      if (totalIdr < 0) {
        throw new HttpError(400, 'INVALID_TOTAL', 'Total penjualan tidak boleh negatif');
      }

      const [newSale] = await tx
        .insert(sales)
        .values({
          id: saleId,
          organizationId,
          outletId: activeOutletId,
          warehouseId: defaultWarehouse.id,
          noNota,
          cashierUserId: userId,
          cashierStaffId: input.cashierStaffId || staffId || null,
          cashShiftId: openShift ? openShift.id : null,
          orderType: input.orderType,
          paymentMethod: input.paymentMethod,
          customerName: input.customerName || null,
          subtotalIdr,
          discountIdr: input.discountIdr,
          taxIdr: input.taxIdr,
          totalIdr,
          cogsIdr: totalCogsIdr,
          status: 'paid',
        })
        .returning();

      const createdItems = await tx
        .insert(saleItems)
        .values(
          processedItems.map((item) => ({
            organizationId,
            saleId: newSale!.id,
            productId: item.productId,
            nameSnapshot: item.nameSnapshot,
            qty: item.qty.toFixed(4),
            unitPriceIdr: item.unitPriceIdr,
            lineTotalIdr: item.lineTotalIdr,
            unitCogsIdr: item.unitCogsIdr,
            lineCogsIdr: item.lineCogsIdr,
          }))
        )
        .returning();

      if (openShift) {
        if (input.paymentMethod === 'cash') {
          await tx
            .update(cashShifts)
            .set({
              cashSalesIdr: sql`${cashShifts.cashSalesIdr} + ${totalIdr}`,
            })
            .where(and(eq(cashShifts.id, openShift.id), eq(cashShifts.status, 'open')));
        } else if (input.paymentMethod === 'qris') {
          await tx
            .update(cashShifts)
            .set({
              qrisSalesIdr: sql`${cashShifts.qrisSalesIdr} + ${totalIdr}`,
            })
            .where(and(eq(cashShifts.id, openShift.id), eq(cashShifts.status, 'open')));
        }
      }

      const dateStr = getWitaDateString();
      await tx
        .insert(dailyMetrics)
        .values({
          organizationId,
          outletId: activeOutletId,
          date: dateStr,
          omsetGrossIdr: subtotalIdr,
          omsetNetIdr: totalIdr,
          cogsIdr: totalCogsIdr,
          trxCount: 1,
        })
        .onConflictDoUpdate({
          target: [dailyMetrics.outletId, dailyMetrics.date],
          set: {
            omsetGrossIdr: sql`${dailyMetrics.omsetGrossIdr} + ${subtotalIdr}`,
            omsetNetIdr: sql`${dailyMetrics.omsetNetIdr} + ${totalIdr}`,
            cogsIdr: sql`${dailyMetrics.cogsIdr} + ${totalCogsIdr}`,
            trxCount: sql`${dailyMetrics.trxCount} + 1`,
            updatedAt: new Date(),
          },
        });

      return { sale: newSale!, items: createdItems };
    });

    const cashier = await salesRepo.getCashierDetails(
      result.sale.cashierUserId,
      result.sale.cashierStaffId
    );

    return {
      id: result.sale.id,
      noNota: result.sale.noNota,
      soldAt: result.sale.soldAt.toISOString(),
      soldAtDisplay: formatWitaDisplay(result.sale.soldAt),
      cashier,
      orderType: result.sale.orderType,
      paymentMethod: result.sale.paymentMethod,
      customerName: result.sale.customerName,
      subtotalIdr: result.sale.subtotalIdr,
      discountIdr: result.sale.discountIdr,
      taxIdr: result.sale.taxIdr,
      totalIdr: result.sale.totalIdr,
      cogsIdr: result.sale.cogsIdr,
      status: result.sale.status,
      items: result.items.map((item) => ({
        productId: item.productId,
        name: item.nameSnapshot,
        qty: Number(item.qty),
        unitPriceIdr: item.unitPriceIdr,
        lineTotalIdr: item.lineTotalIdr,
      })),
    };
  },

  async listSales(ctx: RequestContext, query: ListSalesQuery) {
    const { organizationId, activeOutletId } = ctx;
    if (!activeOutletId) {
      throw new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      );
    }

    const { rows, total } = await salesRepo.listSales(
      organizationId,
      activeOutletId,
      query
    );

    if (rows.length === 0) {
      return { data: [], total };
    }

    const saleIds = rows.map((s) => s.id);
    const allItems = await salesRepo.getSaleItemsBySaleIds(
      organizationId,
      saleIds
    );
    const itemMap = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemMap.get(item.saleId) || [];
      list.push(item);
      itemMap.set(item.saleId, list);
    }

    const formattedSales = await Promise.all(
      rows.map(async (sale) => {
        const cashier = await salesRepo.getCashierDetails(
          sale.cashierUserId,
          sale.cashierStaffId
        );
        const items = itemMap.get(sale.id) || [];

        return {
          id: sale.id,
          noNota: sale.noNota,
          soldAt: sale.soldAt.toISOString(),
          soldAtDisplay: formatWitaDisplay(sale.soldAt),
          cashier,
          orderType: sale.orderType,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName,
          subtotalIdr: sale.subtotalIdr,
          discountIdr: sale.discountIdr,
          taxIdr: sale.taxIdr,
          totalIdr: sale.totalIdr,
          cogsIdr: sale.cogsIdr,
          status: sale.status,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.nameSnapshot,
            qty: Number(item.qty),
            unitPriceIdr: item.unitPriceIdr,
            lineTotalIdr: item.lineTotalIdr,
          })),
        };
      })
    );

    return { data: formattedSales, total };
  },

  async getSaleById(ctx: RequestContext, saleId: string) {
    const { organizationId, activeOutletId } = ctx;
    if (!activeOutletId) {
      throw new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      );
    }

    const sale = await salesRepo.getSaleById(
      organizationId,
      activeOutletId,
      saleId
    );
    if (!sale) {
      throw new HttpError(404, 'NOT_FOUND', 'Transaksi penjualan tidak ditemukan');
    }

    const cashier = await salesRepo.getCashierDetails(
      sale.cashierUserId,
      sale.cashierStaffId
    );
    const items = await salesRepo.getSaleItems(organizationId, sale.id);

    return {
      id: sale.id,
      noNota: sale.noNota,
      soldAt: sale.soldAt.toISOString(),
      soldAtDisplay: formatWitaDisplay(sale.soldAt),
      cashier,
      orderType: sale.orderType,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      subtotalIdr: sale.subtotalIdr,
      discountIdr: sale.discountIdr,
      taxIdr: sale.taxIdr,
      totalIdr: sale.totalIdr,
      cogsIdr: sale.cogsIdr,
      status: sale.status,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.nameSnapshot,
        qty: Number(item.qty),
        unitPriceIdr: item.unitPriceIdr,
        lineTotalIdr: item.lineTotalIdr,
      })),
    };
  },

  async cancelSale(ctx: RequestContext, saleId: string) {
    const { organizationId, activeOutletId, userId, orgRole, staffRole } = ctx;
    if (!activeOutletId) {
      throw new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      );
    }

    const sale = await salesRepo.getSaleById(
      organizationId,
      activeOutletId,
      saleId
    );
    if (!sale) {
      throw new HttpError(404, 'NOT_FOUND', 'Transaksi penjualan tidak ditemukan');
    }

    if (sale.status === 'cancelled') {
      throw new HttpError(
        409,
        'SALE_ALREADY_CANCELLED',
        'Transaksi penjualan ini sudah dibatalkan'
      );
    }

    // Void policy check (PRD §6.11 US-POS-03 & §8.2)
    const diffDays = Math.floor(
      (Date.now() - new Date(sale.soldAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 1 && orgRole !== 'owner') {
      throw new HttpError(
        403,
        'FORBIDDEN',
        'Pembatalan transaksi setelah D+1 hanya dapat dilakukan oleh Owner'
      );
    }

    // Cashier role restriction check
    if (orgRole === 'staff' || staffRole === 'cashier') {
      if (!isSameWitaDay(sale.soldAt, new Date())) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Kasir hanya dapat membatalkan transaksi pada hari yang sama'
        );
      }
      if (sale.cashShiftId) {
        const activeShift = await salesRepo.getOpenCashShift(
          organizationId,
          activeOutletId
        );
        if (!activeShift || activeShift.id !== sale.cashShiftId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'Kasir hanya dapat membatalkan transaksi dalam shift yang sama'
          );
        }
      }
    }

    await db.transaction(async (tx) => {
      const [updatedSale] = await tx
        .update(sales)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledByUserId: userId,
        })
        .where(and(eq(sales.id, sale.id), eq(sales.status, 'paid')))
        .returning();

      if (!updatedSale) {
        throw new HttpError(
          409,
          'SALE_ALREADY_CANCELLED',
          'Transaksi penjualan ini sudah dibatalkan'
        );
      }

      // Reversal akurat berbasis mutasi stok asli saat transaksi (bukan resep hari ini)
      const movements = await tx
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.organizationId, organizationId),
            eq(stockMovements.refType, 'sales'),
            eq(stockMovements.refId, sale.id),
            eq(stockMovements.type, 'sale_out')
          )
        );

      for (const mov of movements) {
        const qtyToReturn = Number(mov.qty);
        const [balance] = await tx
          .select()
          .from(inventoryBalances)
          .where(
            and(
              eq(inventoryBalances.warehouseId, mov.warehouseId),
              eq(inventoryBalances.itemType, mov.itemType),
              eq(inventoryBalances.itemId, mov.itemId)
            )
          )
          .for('update');

        if (balance) {
          const newQtyOnHand = Number(balance.qtyOnHand) + qtyToReturn;
          await tx
            .update(inventoryBalances)
            .set({
              qtyOnHand: newQtyOnHand.toFixed(4),
              updatedAt: new Date(),
            })
            .where(eq(inventoryBalances.id, balance.id));

          await tx.insert(stockMovements).values({
            organizationId,
            outletId: activeOutletId,
            warehouseId: mov.warehouseId,
            itemType: mov.itemType,
            itemId: mov.itemId,
            type: 'sale_void_in',
            qty: qtyToReturn.toFixed(4),
            unitCost: mov.unitCost,
            amountIdr: mov.amountIdr,
            refType: 'sales',
            refId: sale.id,
            actorUserId: userId,
          });
        }
      }

      // Reverse daily metrics
      const dateStr = getWitaDateString(sale.soldAt);
      await tx
        .update(dailyMetrics)
        .set({
          omsetGrossIdr: sql`GREATEST(0, ${dailyMetrics.omsetGrossIdr} - ${sale.subtotalIdr})`,
          omsetNetIdr: sql`GREATEST(0, ${dailyMetrics.omsetNetIdr} - ${sale.totalIdr})`,
          cogsIdr: sql`GREATEST(0, ${dailyMetrics.cogsIdr} - ${sale.cogsIdr})`,
          trxCount: sql`GREATEST(0, ${dailyMetrics.trxCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyMetrics.outletId, sale.outletId),
            eq(dailyMetrics.date, dateStr)
          )
        );

      // Reverse cash shifts if attached and still open
      if (sale.cashShiftId) {
        if (sale.paymentMethod === 'cash') {
          await tx
            .update(cashShifts)
            .set({
              cashSalesIdr: sql`GREATEST(0, ${cashShifts.cashSalesIdr} - ${sale.totalIdr})`,
            })
            .where(and(eq(cashShifts.id, sale.cashShiftId), eq(cashShifts.status, 'open')));
        } else if (sale.paymentMethod === 'qris') {
          await tx
            .update(cashShifts)
            .set({
              qrisSalesIdr: sql`GREATEST(0, ${cashShifts.qrisSalesIdr} - ${sale.totalIdr})`,
            })
            .where(and(eq(cashShifts.id, sale.cashShiftId), eq(cashShifts.status, 'open')));
        }
      }
    });

    return this.getSaleById(ctx, saleId);
  },
};
