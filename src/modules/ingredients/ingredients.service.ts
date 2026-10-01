import { ingredientsRepo } from "./ingredients.repo.js";
import { HttpError } from "../../middleware/errorHandler.js"; 

export const ingredientsService = {
  async listIngredients(
    organizationId: string,
    outletId: string | null,
    params: { search?: string | undefined; category?: string | undefined; page: number; limit: number }
  ) {
    const result = await ingredientsRepo.listByOrg(organizationId, outletId, params);
    // Status computed agregat (PRD §6.5): habis / hampir habis / aktif
    const data = result.data.map((item: any) => {
      const onHand = Number(item.qtyOnHand) || 0;
      const minStock = Number(item.minStock) || 0;
      const status: 'active' | 'low' | 'out_of_stock' =
        onHand <= 0 ? 'out_of_stock' : onHand <= minStock ? 'low' : 'active';
      return {
        ...item,
        minStock: Number(item.minStock),
        purchaseUnitCost:
          item.purchaseUnitCost !== null && item.purchaseUnitCost !== undefined
            ? Number(item.purchaseUnitCost)
            : Number(item.purchasePriceIdr),
        qtyOnHand: onHand,
        status,
      };
    });
    return { data, total: result.total };
  },

  async getIngredientById(organizationId: string, id: string) {
    const item = await ingredientsRepo.getById(organizationId, id);
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    return item;
  },

  async createIngredient(organizationId: string, body: any) {
    const existingSku = await ingredientsRepo.getBySku(organizationId, body.sku);
    if (existingSku) {
      throw new HttpError(409, 'CONFLICT', `SKU '${body.sku}' sudah digunakan pada bahan baku lain`)
    }

    const { purchasePriceIdr, lastPurchaseUnitCost } = resolvePurchaseCost(body);

    return await ingredientsRepo.create(organizationId, {
      ...body,
      purchasePriceIdr,
      lastPurchaseUnitCost,
      minStock: body.minStock.toString(),
    });
  },

  async updateIngredient(organizationId: string, id: string, body: any) {
    const existing = await ingredientsRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');

    if (body.sku && body.sku.toUpperCase() !== existing.sku) {
      const duplicateSku = await ingredientsRepo.getBySku(organizationId, body.sku);
      if (duplicateSku) {
        throw new HttpError(409, 'CONFLICT', `SKU '${body.sku}' sudah digunakan`);
      }
    }

    const updateData = {
      ...body,
      ...(body.minStock !== undefined ? { minStock: body.minStock.toString() } : {}),
    };
    if (body.purchaseUnitCost !== undefined || body.purchasePriceIdr !== undefined) {
      const { purchasePriceIdr, lastPurchaseUnitCost } = resolvePurchaseCost(
        body,
        existing as { purchasePriceIdr: number; lastPurchaseUnitCost?: unknown }
      );
      updateData.purchasePriceIdr = purchasePriceIdr;
      updateData.lastPurchaseUnitCost = lastPurchaseUnitCost;
    }

    return await ingredientsRepo.update(organizationId, id, updateData);
  },

  async deleteIngredient(organizationId: string, id: string) {
    const existing = await ingredientsRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    await ingredientsRepo.softDelete(organizationId, id);
  }
}

// Canonical: purchaseUnitCost (numeric presisi) adalah sumber HPP;
// purchasePriceIdr integer = pembulatan untuk kartu UI (DESIGN §6.2).
function resolvePurchaseCost(
  body: { purchasePriceIdr?: number | undefined; purchaseUnitCost?: number | undefined },
  existing?: { purchasePriceIdr: number; lastPurchaseUnitCost?: unknown }
): { purchasePriceIdr: number; lastPurchaseUnitCost: string } {
  if (body.purchaseUnitCost !== undefined) {
    return {
      purchasePriceIdr: body.purchasePriceIdr ?? Math.round(body.purchaseUnitCost),
      lastPurchaseUnitCost: Number(body.purchaseUnitCost).toFixed(4),
    };
  }
  if (body.purchasePriceIdr !== undefined) {
    return {
      purchasePriceIdr: body.purchasePriceIdr,
      lastPurchaseUnitCost: Number(body.purchasePriceIdr).toFixed(4),
    };
  }
  if (existing) {
    return {
      purchasePriceIdr: existing.purchasePriceIdr,
      lastPurchaseUnitCost:
        existing.lastPurchaseUnitCost !== null && existing.lastPurchaseUnitCost !== undefined
          ? Number(existing.lastPurchaseUnitCost).toFixed(4)
          : Number(existing.purchasePriceIdr).toFixed(4),
    };
  }
  throw new HttpError(400, 'VALIDATION_ERROR', 'Harga beli wajib diisi (purchasePriceIdr atau purchaseUnitCost)');
}
