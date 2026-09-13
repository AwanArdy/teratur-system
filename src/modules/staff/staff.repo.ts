import { db } from '../../db/client.js';
import { eq, and, isNull, count, sql, desc } from 'drizzle-orm';
import { staffMembers } from '../../db/schema/staff.js';
import { outlets } from '../../db/schema/identity.js';

export const staffRepo = {
  async listStaff(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(staffMembers.organizationId, organizationId),
      ...(outletId ? [eq(staffMembers.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: staffMembers.id,
        fullName: staffMembers.fullName,
        role: staffMembers.role,
        employmentType: staffMembers.employmentType,
        phone: staffMembers.phone,
        email: staffMembers.email,
        hourlyRateIdr: staffMembers.hourlyRateIdr,
        monthlySalaryIdr: staffMembers.monthlySalaryIdr,
        isActive: staffMembers.isActive,
        createdAt: staffMembers.createdAt,
        outletName: outlets.name,
      })
      .from(staffMembers)
      .leftJoin(outlets, eq(outlets.id, staffMembers.outletId))
      .where(whereClause)
      .orderBy(desc(staffMembers.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(staffMembers).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async getById(organizationId: string, id: string) {
    const [staff] = await db
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.id, id), eq(staffMembers.organizationId, organizationId)));
    return staff || null;
  },

  async create(organizationId: string, data: typeof staffMembers.$inferInsert) {
    const [created] = await db
      .insert(staffMembers)
      .values({
        ...data,
        organizationId,
      })
      .returning();
    if (!created) throw new Error('Gagal menambah staf');
    return created;
  },

  async update(organizationId: string, id: string, data: Partial<typeof staffMembers.$inferInsert>) {
    const [updated] = await db
      .update(staffMembers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(staffMembers.id, id), eq(staffMembers.organizationId, organizationId)))
      .returning();
    return updated || null;
  },
};
