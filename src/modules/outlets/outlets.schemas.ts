import { z } from 'zod';

export const createOutletSchema = z.object({
  name: z.string().min(1).max(160),
  businessType: z
    .enum(['coffee_bakery', 'restaurant', 'warung', 'retail', 'catering', 'food_manufacture'])
    .default('coffee_bakery'),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export const updateOutletSchema = createOutletSchema.partial();
