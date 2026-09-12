import z from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi').max(160),
  phone: z.string().max(20).optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();
