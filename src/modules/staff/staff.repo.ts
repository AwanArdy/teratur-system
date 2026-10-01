import { db } from '../../db/client.js';
import { eq, and, isNull, count, sql, desc } from 'drizzle-orm';
import { staff } from '../../db/schema/staff.js';
import { sales } from '../../db/schema/sales.js';
import { outlets } from '../../db/schema/identity.js';

export const staffRepo = {
  async listStaff(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(staff.organizationId, organizationId),
      ...(outletId ? [eq(staff.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: staff.id,
        name: staff.name,
        staffRole: staff.staffRole,
        employmentType: staff.employmentType,
        phone: staff.phone,
        email: staff.email,
        baseSalaryIdr: staff.baseSalaryIdr,
        allowanceIdr: staff.allowanceIdr,
        joinedOn: staff.joinedOn,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        outletName: outlets.name,
      })
      .from(staff)
      .leftJoin(outlets, eq(outlets.id, staff.outletId))
      .where(whereClause)
      .orderBy(desc(staff.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(staff).where(whereClause);

    // Agregat penjualan per staf (DESIGN §11.13, halaman Karyawan):
    // totalSalesHandledIdr + totalTrx dari sales paid via cashierStaffId.
    const staffIds = items.map((i) => i.id);
    const aggRows =
      staffIds.length > 0
        ? await db
            .select({
              staffId: sales.cashierStaffId,
              totalSalesHandledIdr: sql<number>`COALESCE(SUM(${sales.totalIdr}), 0)::float`,
              totalTrx: count(),
            })
            .from(sales)
            .where(
              and(
                eq(sales.organizationId, organizationId),
                eq(sales.status, 'paid'),
                sql`${sales.cashierStaffId} IN (${sql.join(staffIds.map((id) => sql`${id}::uuid`), sql`, `)})`
              )
            )
            .groupBy(sales.cashierStaffId)
        : [];
    const aggMap = new Map(
      aggRows.map((r) => [r.staffId, { totalSalesHandledIdr: r.totalSalesHandledIdr || 0, totalTrx: r.totalTrx || 0 }])
    );

    const data = items.map((i) => ({
      ...i,
      totalSalesHandledIdr: aggMap.get(i.id)?.totalSalesHandledIdr || 0,
      totalTrx: aggMap.get(i.id)?.totalTrx || 0,
    }));

    return { data, total: totalRow?.total || 0 };
  },

  async getById(organizationId: string, id: string) {
    const [item] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.id, id), eq(staff.organizationId, organizationId)));
    if (!item) return null;

    const [agg] = await db
      .select({
        totalSalesHandledIdr: sql<number>`COALESCE(SUM(${sales.totalIdr}), 0)::float`,
        totalTrx: count(),
      })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          eq(sales.status, 'paid'),
          eq(sales.cashierStaffId, id)
        )
      );

    return {
      ...item,
      totalSalesHandledIdr: agg?.totalSalesHandledIdr || 0,
      totalTrx: agg?.totalTrx || 0,
    };
  },

  async getByUserId(organizationId: string, userId: string) {
    const [item] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.userId, userId), eq(staff.organizationId, organizationId)));
    return item || null;
  },

  async create(organizationId: string, data: Omit<typeof staff.$inferInsert, 'organizationId'>) {
    const [created] = await db
      .insert(staff)
      .values({
        ...data,
        organizationId,
      })
      .returning();
    if (!created) throw new Error('Gagal menambah staf');
    return created;
  },

  async update(organizationId: string, id: string, data: Partial<typeof staff.$inferInsert>) {
    const [updated] = await db
      .update(staff)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(staff.id, id), eq(staff.organizationId, organizationId)))
      .returning();
    return updated || null;
  },

  async softDelete(organizationId: string, id: string) {
    const [updated] = await db
      .update(staff)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(staff.id, id), eq(staff.organizationId, organizationId)))
      .returning();
    return updated || null;
  },
};
