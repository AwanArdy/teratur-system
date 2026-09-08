import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  phone: z.string().min(8).max(20).optional(),
  avatarUrl: z.string().url().nullable().optional()
});

export const updateNotificationPrefrencesSchema = z.object({
  lowStock: z.boolean(),
  dailyReport: z.boolean(),
  newTransaction: z.boolean(),
  unpaidReminder: z.boolean(),
});
