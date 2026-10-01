import z from "zod";

export const askAdvisorSchema = z.object({
  prompt: z.string().min(1, 'Pertanyaan wajib diisi').max(1000),
  range: z.enum(['today', 'yesterday', 'week', 'month']).default('week'),
});

// Kontrak DESIGN §11.15 (dipakai halaman chat-ai + aplikasi kasir)
export const aiChatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Pesan wajib diisi').max(2000),
  clientMessageId: z.string().max(120).optional(),
});
