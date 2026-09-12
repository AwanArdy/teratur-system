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
import type { RequestContext } from '../../types/express.d.ts';
import type { CreateSaleInput, ListSalesQuery } from './sales.schemas.js';

export const salesService = {
  async createSale(ctx: RequestContext, input: CreateSaleInput) {
    const { organizationId, activeOutletId, userId, staffId } = ctx;

    if (!activeOutletId) {
      throw new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      );
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
              if (ing) unitCost = ing.purchasePriceIdr;
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
              refId: sql`gen_random_uuid()`, // temporarily or update refId later
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
            refId: sql`gen_random_uuid()`,
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

      const totalIdr = Math.round(subtotalIdr + input.taxIdr - input.discountIdr);

      const [newSale] = await tx
        .insert(sales)
        .values({
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

      // Update movements refId to saleId
      await tx
        .update(stockMovements)
        .set({ refId: newSale!.id })
        .where(
          and(
            eq(stockMovements.organizationId, organizationId),
            eq(stockMovements.type, 'sale_out'),
            eq(stockMovements.actorUserId, userId)
          )
        );

      if (openShift) {
        if (input.paymentMethod === 'cash') {
          await tx
            .update(cashShifts)
            .set({
              cashSalesIdr: sql`${cashShifts.cashSalesIdr} + ${totalIdr}`,
            })
            .where(eq(cashShifts.id, openShift.id));
        } else if (input.paymentMethod === 'qris') {
          await tx
            .update(cashShifts)
            .set({
              qrisSalesIdr: sql`${cashShifts.qrisSalesIdr} + ${totalIdr}`,
            })
            .where(eq(cashShifts.id, openShift.id));
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

    // Cashier role restriction check
    if (orgRole === 'staff' || staffRole === 'cashier') {
      if (!isSameWitaDay(sale.soldAt, new Date())) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Kasir hanya dapat membatalkan transaksi pada hari yang sama'
        );
      }
    }

    const items = await salesRepo.getSaleItems(organizationId, sale.id);
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productRows = await salesRepo.findProductsByIds(
      organizationId,
      productIds
    );
    const productMap = new Map(productRows.map((p) => [p.id, p]));
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

    await db.transaction(async (tx) => {
      await tx
        .update(sales)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledByUserId: userId,
        })
        .where(eq(sales.id, sale.id));

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        const itemQty = Number(item.qty);

        if (product.kind === 'made_to_order' || product.kind === 'pre_order') {
          const lines = recipeMap.get(product.id) || [];
          for (const line of lines) {
            const qtyToReturn = Number(line.qty) * itemQty;
            const stockItemType =
              line.componentType === 'ingredient' ? 'ingredient' : 'finished_good';

            const [balance] = await tx
              .select()
              .from(inventoryBalances)
              .where(
                and(
                  eq(inventoryBalances.warehouseId, sale.warehouseId),
                  eq(inventoryBalances.itemType, stockItemType),
                  eq(inventoryBalances.itemId, line.componentId)
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

              const unitCost = Number(balance.avgUnitCost);
              const amountIdr = Math.round(qtyToReturn * unitCost);

              await tx.insert(stockMovements).values({
                organizationId,
                outletId: activeOutletId,
                warehouseId: sale.warehouseId,
                itemType: stockItemType,
                itemId: line.componentId,
                type: 'sale_void_in',
                qty: qtyToReturn.toFixed(4),
                unitCost: unitCost.toFixed(4),
                amountIdr,
                refType: 'sales',
                refId: sale.id,
                actorUserId: userId,
              });
            }
          }
        } else if (product.kind === 'finished_good') {
          const qtyToReturn = itemQty;

          const [balance] = await tx
            .select()
            .from(inventoryBalances)
            .where(
              and(
                eq(inventoryBalances.warehouseId, sale.warehouseId),
                eq(inventoryBalances.itemType, 'finished_good'),
                eq(inventoryBalances.itemId, product.id)
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

            const unitCost = Number(balance.avgUnitCost);
            const amountIdr = Math.round(qtyToReturn * unitCost);

            await tx.insert(stockMovements).values({
              organizationId,
              outletId: activeOutletId,
              warehouseId: sale.warehouseId,
              itemType: 'finished_good',
              itemId: product.id,
              type: 'sale_void_in',
              qty: qtyToReturn.toFixed(4),
              unitCost: unitCost.toFixed(4),
              amountIdr,
              refType: 'sales',
              refId: sale.id,
              actorUserId: userId,
            });
          }
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

      // Reverse cash shifts if attached
      if (sale.cashShiftId) {
        if (sale.paymentMethod === 'cash') {
          await tx
            .update(cashShifts)
            .set({
              cashSalesIdr: sql`GREATEST(0, ${cashShifts.cashSalesIdr} - ${sale.totalIdr})`,
            })
            .where(eq(cashShifts.id, sale.cashShiftId));
        } else if (sale.paymentMethod === 'qris') {
          await tx
            .update(cashShifts)
            .set({
              qrisSalesIdr: sql`GREATEST(0, ${cashShifts.qrisSalesIdr} - ${sale.totalIdr})`,
            })
            .where(eq(cashShifts.id, sale.cashShiftId));
        }
      }
    });

    return this.getSaleById(ctx, saleId);
  },
};
