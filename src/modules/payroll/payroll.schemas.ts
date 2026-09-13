import { z } from 'zod';

export const createPayrollStubSchema = z.object({
  staffId: z.string().uuid('ID staf harus UUID valid'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  baseSalaryIdr: z.number().int().min(0),
  bonusIdr: z.number().int().min(0).default(0),
  deductionsIdr: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});
