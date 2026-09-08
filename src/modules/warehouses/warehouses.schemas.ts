import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(160),
  code: z.string().min(1).max(32),
  isDefault: z.boolean().default(false),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();
