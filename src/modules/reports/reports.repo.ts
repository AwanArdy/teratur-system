import { db } from '../../db/client.js';
import { eq, and, sql } from 'drizzle-orm';
import { exportJobs } from '../../db/schema/ops.js';

export const reportsRepo = {
  async createExportJob(data: typeof exportJobs.$inferInsert) {
    const [row] = await db.insert(exportJobs).values(data).returning();
    if (!row) throw new Error('Gagal membuat export job');
    return row;
  },

  async getExportJob(organizationId: string, jobId: string) {
    const [row] = await db
      .select()
      .from(exportJobs)
      .where(and(eq(exportJobs.id, jobId), eq(exportJobs.organizationId, organizationId)));
    return row || null;
  },
};
