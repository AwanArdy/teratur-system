import { db } from '../../db/client.js';
import { eq } from 'drizzle-orm';
import { organizations } from '../../db/schema/identity.js';

export const organizationsRepo = {
  async getById(organizationId: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return org || null;
  },

  async update(
    organizationId: string,
    data: { name?: string | undefined; province?: string | undefined; city?: string | undefined }
  ) {
    const [updated] = await db
      .update(organizations)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.province ? { province: data.province } : {}),
        ...(data.city ? { city: data.city } : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();
    return updated || null;
  },
};
