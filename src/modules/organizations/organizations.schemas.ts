import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
});
