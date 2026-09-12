import { productsRepo } from './products.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const productsService = {
  async listProducts(
    organizationId: string,
    outletId: string | null,
    params: { search?: string | undefined; page: number; limit: number }
  ) {
    return await productsRepo.listByOrg(organizationId, params);
  },

  async getProductById(organizationId: string, outletId: string | null, id: string) {
    const product = await productsRepo.getById(organizationId, id);
    if (!product) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');

    const recipe = product.recipe.map((r) => ({
      componentType: r.componentType as 'ingredient' | 'product',
      componentId: r.componentId,
      qty: Number(r.qty),
    }));

    const hpp = await this.calculateHpp(
      organizationId,
      outletId,
      product.sellingPriceIdr,
      recipe
    );

    return {
      ...product,
      hpp,
    };
  },

  async calculateHpp(
    organizationId: string,
    outletId: string | null,
    sellingPriceIdr: number,
    recipe: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }>
  ) {
    const unitCosts = await productsRepo.getComponentUnitCosts(
      organizationId,
      outletId,
      recipe
    );

    let totalHpp = 0;
    const recipeDetails = recipe.map((item) => {
      const unitCost = unitCosts[item.componentId] || 0;
      const subtotal = unitCost * item.qty;
      totalHpp += subtotal;
      return {
        ...item,
        unitCost,
        subtotal,
      };
    });

    const marginIdr = sellingPriceIdr - totalHpp;
    const marginPercentage =
      sellingPriceIdr > 0 ? (marginIdr / sellingPriceIdr) * 100 : 0;

    return {
      hppIdr: Math.round(totalHpp),
      marginIdr: Math.round(marginIdr),
      marginPercentage: Number(marginPercentage.toFixed(2)),
      recipeDetails,
    };
  },

  async createProduct(organizationId: string, body: any) {
    if (body.sku) {
      const existingSku = await productsRepo.getBySku(organizationId, body.sku);
      if (existingSku) {
        throw new HttpError(409, 'CONFLICT', `SKU '${body.sku}' sudah digunakan pada produk lain`);
      }
    }

    return await productsRepo.createWithRecipe(organizationId, body);
  },

  async updateProduct(organizationId: string, id: string, body: any) {
    const existing = await productsRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');

    if (body.sku && body.sku.toUpperCase() !== existing.sku) {
      const duplicateSku = await productsRepo.getBySku(organizationId, body.sku);
      if (duplicateSku && duplicateSku.id !== id) {
        throw new HttpError(409, 'CONFLICT', `SKU '${body.sku}' sudah digunakan`);
      }
    }

    const updated = await productsRepo.updateWithRecipe(organizationId, id, body);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
    return updated;
  },

  async deleteProduct(organizationId: string, id: string) {
    const existing = await productsRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
    await productsRepo.softDelete(organizationId, id);
  },
};
