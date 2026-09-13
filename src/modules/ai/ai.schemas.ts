import z from "zod";

export const askAdvisorSchema = z.object({
  prompt: z.string().min(1, 'Pertanyaan wajib diisi').max(1000),
  range: z.enum(['today', 'yesterday', 'week', 'month']).default('week'),
});
