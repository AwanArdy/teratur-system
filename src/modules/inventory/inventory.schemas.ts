import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  itemType: z.enum(['ingredient', 'finished_good']),
  itemId: z.string().uuid('ID item harus UUID valid'),
  warehouseId: z.string().uuid().optional(),
  direction: z.enum(['in', 'out']),
  qty: z.number().positive('Jumlah penyesuaian harus lebih dari 0'),
  unitCost: z.number().min(0, 'Harga satuan tidak boleh negatif').optional(),
  notes: z.string().optional(),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  itemType: z.enum(['ingredient', 'finished_good']).optional(),
  warehouseId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
