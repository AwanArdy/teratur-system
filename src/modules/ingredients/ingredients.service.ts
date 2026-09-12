import { ingredientsRepo } from "./ingredients.repo.js";
import { HttpError } from "../../middleware/errorHandler.js"; 

export const ingredientsService = {
  async listIngredients(
    organizationId: string,
    outletId: string | null,
    params: { search?: string | undefined; category?: string | undefined; page: number; limit: number }
  ) {
    return await ingredientsRepo.listByOrg(organizationId, outletId, params);
  },

  async getIngredientsById(organizationId: string, id: string) {
    const item = await ingredientsRepo.getById(organizationId, id);
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    return item;
  },

  async createIngredient(organizationId: string, body: any) {
    const existingSku = await ingredientsRepo.getBySku(organizationId, body.sku);
    if (existingSku) {
      throw new HttpError(409, 'CONFLICT', `SKU '${body.sku}' sudah digunakan pada bahan baku lain`)
    }

    return await ingredientsRepo.create(organizationId, {
      ...body,
      minStock: body.minStock.toString(),
    });
  },

  async updateIngredients(organizationId: string, id: string, body: any) {
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

    return await ingredientsRepo.update(organizationId, id, updateData);
  },

  async deleteIngredient(organizationId: string, id: string) {
    const existing = await ingredientsRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
    await ingredientsRepo.softDelete(organizationId, id);
  }
}
