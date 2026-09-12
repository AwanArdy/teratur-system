import { z } from 'zod';

export const createWasteSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  itemType: z.enum(['ingredient', 'finished_good']),
  itemId: z.string().uuid('ID item harus UUID valid'),
  qty: z.number().positive('Jumlah waste harus lebih dari 0'),
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
  reason: z.enum(['expired', 'damaged', 'trial_fail', 'lost']),
  lossIdr: z.number().int().min(0).optional(),
});
