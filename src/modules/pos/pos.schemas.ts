import { z } from 'zod';

export const posMenuQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const posSaleSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']),
  discountIdr: z.number().int().min(0).default(0),
  taxIdr: z.number().int().min(0).default(0),
  customerName: z.string().max(120).optional(),
  cashierStaffId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('ID produk tidak valid'),
        qty: z.number().positive('Jumlah qty harus lebih dari 0'),
        unitPriceIdr: z.number().int().min(0).optional(),
      }),
    )
    .min(1, 'Transaksi minimal berisi 1 produk'),
});

export type PosSaleInput = z.infer<typeof posSaleSchema>;
