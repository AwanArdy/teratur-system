import { z } from 'zod';

export const salesReportQuerySchema = z.object({
  search: z.string().optional(),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']).optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).optional(),
  status: z.enum(['paid', 'pending', 'cancelled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const exportSalesSchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  search: z.string().optional(),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']).optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).optional(),
  status: z.enum(['paid', 'pending', 'cancelled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const stockReportQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(['dairy', 'coffee_bean', 'syrup', 'packaging', 'flavor_powder', 'other']).optional(),
  status: z.enum(['ok', 'low', 'critical', 'overstock']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type StockReportQuery = z.infer<typeof stockReportQuerySchema>;
