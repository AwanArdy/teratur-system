import z from "zod";

export const recipeLineSchema = z.object({
  componentType: z.enum(['ingredient', 'product']),
  componentId: z.string().uuid('ID komponen harus UUID valid'),
  qty: z.number().positive('Jumlah resep harus lebih dari 0'),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(160),
  category: z.string().min(1, 'Kategori wajib diisi').max(80),
  sku: z.string().max(32).optional(),
  sellingPriceIdr: z.number().int().min(0, 'Harga jual tidak boleh negatif'),
  kind: z.enum(['made_to_order', 'finished_good', 'pre_order']).default('made_to_order'),
  recipe: z.array(recipeLineSchema).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const previewHppSchema = z.object({
  sellingPriceIdr: z.number().int().min(0),
  recipe: z.array(recipeLineSchema)
});
