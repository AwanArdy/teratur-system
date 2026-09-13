import { z } from 'zod';

export const openShiftSchema = z.object({
  startingCashIdr: z.number().int().min(0, 'Modal kas awal tidak boleh negatif'),
  shiftName: z.enum(['morning', 'evening']).default('morning'),
  cashierStaffId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const closeShiftSchema = z.object({
  endingCashIdr: z.number().int().min(0, 'Jumlah uang fisik tidak boleh negatif'),
  notes: z.string().optional(),
});
