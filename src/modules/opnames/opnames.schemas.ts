import { z } from 'zod';

export const createOpnameSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  itemType: z.enum(['ingredient', 'finished_good']),
  itemId: z.string().uuid('ID item harus UUID valid'),
  physicalQty: z.number().min(0, 'Jumlah fisik tidak boleh negatif'),
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
  notes: z.string().optional(),
});
