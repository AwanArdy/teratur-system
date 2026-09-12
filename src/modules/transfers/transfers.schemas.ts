import { z } from 'zod';

export const transferLineSchema = z.object({
  itemType: z.enum(['ingredient', 'finished_good']),
  itemId: z.string().uuid('ID item harus UUID valid'),
  qty: z.number().positive('Jumlah transfer harus lebih besar dari 0'),
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
});

export const createTransferSchema = z.object({
  fromWarehouseId: z.string().uuid('ID gudang asal harus UUID valid'),
  toWarehouseId: z.string().uuid('ID gudang tujuan harus UUID valid'),
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, 'Transfer minimal berisi 1 barang'),
});

export const transfersQuerySchema = z.object({
  status: z.enum(['in_transit', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
