import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  range: z.enum(['today', 'yesterday', 'week', 'month', 'custom']).default('today'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  outletId: z.string().uuid().optional(),
});
