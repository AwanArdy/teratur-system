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
  purchasePriceIdr: z.number().int().min(0),
  minStock: z.number().min(0).default(0),
  leadTimeDays: z.number().int().min(0).max(365).default(3),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().max(160).optional(),
});

export const updateIngredientSchema = createIngredientSchema.partial();
