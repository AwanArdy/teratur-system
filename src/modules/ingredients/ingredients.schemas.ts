import { z } from 'zod';

export const createIngredientSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi').max(32),
  name: z.string().min(1, 'Nama bahan baku wajib diisi').max(160),
  category: z.enum(['dairy', 'coffee_bean', 'syrup', 'packaging', 'flavor_powder', 'other']),
  uom: z.enum([
    'ml',
    'gram',
    'kg',
    'pcs',
    'liter',
    'botol',
    'karton',
    'pouch',
    'pack',
    'orang',
    'bulan',
  ]),
  purchasePriceIdr: z.number().int().min(0).optional(),
  // Harga presisi per 1 unit UOM dasar (mis. 18.5 untuk Rp 18.5/ml).
  // Wajib isi salah satu: purchasePriceIdr (integer Rp) atau purchaseUnitCost (presisi).
  purchaseUnitCost: z.number().nonnegative().optional(),
  minStock: z.number().min(0).default(0),
  leadTimeDays: z.number().int().min(0).max(365).default(3),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().max(160).optional(),
});

export const updateIngredientSchema = createIngredientSchema.partial();
