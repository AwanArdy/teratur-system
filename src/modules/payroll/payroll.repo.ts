import { db } from '../../db/client.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { payrollStubs, staffMembers } from '../../db/schema/staff.js';

export const payrollRepo = {
  async listStubs(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(payrollStubs.organizationId, organizationId),
      ...(outletId ? [eq(payrollStubs.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: payrollStubs.id,
        periodStart: payrollStubs.periodStart,
        periodEnd: payrollStubs.periodEnd,
        baseSalaryIdr: payrollStubs.baseSalaryIdr,
        bonusIdr: payrollStubs.bonusIdr,
        deductionsIdr: payrollStubs.deductionsIdr,
        totalNetIdr: payrollStubs.totalNetIdr,
        notes: payrollStubs.notes,
        createdAt: payrollStubs.createdAt,
        staffName: staffMembers.fullName,
        staffRole: staffMembers.role,
      })
      .from(payrollStubs)
      .leftJoin(staffMembers, eq(staffMembers.id, payrollStubs.staffId))
      .where(whereClause)
      .orderBy(desc(payrollStubs.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(payrollStubs).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async create(organizationId: string, outletId: string, data: typeof payrollStubs.$inferInsert) {
    const [stub] = await db
      .insert(payrollStubs)
      .values({
        ...data,
        organizationId,
        outletId,
      })
      .returning();
    if (!stub) throw new Error('Gagal mencatat slip gaji');
    return stub;
  },
};
