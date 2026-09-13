import z from "zod";

export const createStaffSchema = z.object({
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(120),
  role: z.enum(['store_manager', 'head_barista', 'barista', 'cashier', 'cook', 'helper']),
  employmentType: z.enum(['full_time', 'part_time', 'contract']).default('full_time'),
  phone: z.string().max(20).optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  hourlyRateIdr: z.number().int().min(0).default(0),
  monthlySalaryIdr: z.number().int().min(0).default(0),
  outletId: z.string().uuid().optional(),
});

export const updateStaffSchema = createStaffSchema.partial();
