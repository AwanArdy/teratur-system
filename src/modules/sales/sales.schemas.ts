import { z } from 'zod';

export const createSaleSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
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
      })
    )
    .min(1, 'Transaksi minimal berisi 1 produk'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const listSalesQuerySchema = z.object({
  search: z.string().optional(),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']).optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).optional(),
  status: z.enum(['paid', 'pending', 'cancelled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
