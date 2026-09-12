import z from "zod";

export const createExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (WITA)'),
  name: z.string().min(1, "Nama pengeluaran wajib diisi").max(160),
  category: z.enum([
    'raw_material',
    'packaging',
    'operational',
    'salary',
    'utilities',
    'equipment',
    'transport',
    'other',
  ]),
  qty: z.number().positive('Jumlah harus lebih dari 0'),
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
  unitPriceIdr: z.number().int().min(0, 'Harga satuan tidak boleh negatif'),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().max(160).optional(),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']),
  payStatus: z.enum(['paid', 'unpaid', 'credit']),
  notes: z.string().optional(),
  countedInCogs: z.boolean().default(false),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expensesQuerySchema = z.object({
  search: z.string().optional(),
  category: z
    .enum([
      'raw_material',
      'packaging',
      'operational',
      'salary',
      'utilities',
      'equipment',
      'transport',
      'other',
    ])
    .optional(),
  datePreset: z.enum(['today', 'yesterday', 'custom']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
