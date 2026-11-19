import { productsRepo } from './products.repo.js';
import { db } from '../../db/client.js';
import { ingredients, products } from '../../db/schema/catalog.js';
import { eq, and, isNull } from 'drizzle-orm';
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

  async validateRecipeComponents(
    organizationId: string,
    recipe?: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }>
  ) {
    if (!recipe || recipe.length === 0) return;
    for (const item of recipe) {
      if (item.componentType === 'ingredient') {
        const [ing] = await db
          .select({ id: ingredients.id })
          .from(ingredients)
          .where(and(eq(ingredients.id, item.componentId), eq(ingredients.organizationId, organizationId), isNull(ingredients.deletedAt)));
        if (!ing) throw new HttpError(404, 'NOT_FOUND', `Bahan baku resep tidak ditemukan`);
      } else {
        const [prod] = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, item.componentId), eq(products.organizationId, organizationId), isNull(products.deletedAt)));
        if (!prod) throw new HttpError(404, 'NOT_FOUND', `Produk resep tidak ditemukan`);
      }
    }
  },

  async calculateHpp(
    organizationId: string,
    outletId: string | null,
    sellingPriceIdr: number,
    recipe: Array<{ componentType: 'ingredient' | 'product'; componentId: string; qty: number }>
  ) {
    await this.validateRecipeComponents(organizationId, recipe);
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

    // PRD §6.6: grade margin untuk tabel produk FE
    const marginPct = Number(marginPercentage.toFixed(2));
    const marginGrade: 'healthy' | 'thin' | 'low' | 'loss' =
      marginPct >= 40 ? 'healthy' : marginPct >= 20 ? 'thin' : marginPct >= 0 ? 'low' : 'loss';

    return {
      hppIdr: Math.round(totalHpp),
      marginIdr: Math.round(marginIdr),
      marginPercentage: marginPct,
      marginPct,
      marginGrade,
      recipeDetails,
    };
  },

  async createProduct(organizationId: string, body: any) {
    if (body.recipe) {
      await this.validateRecipeComponents(organizationId, body.recipe);
    }
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

    if (body.recipe) {
      await this.validateRecipeComponents(organizationId, body.recipe);
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
