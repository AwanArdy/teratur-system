import { db } from '../../db/client.js';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { cashShifts, staff } from '../../db/schema/staff.js';
import { users } from '../../db/schema/identity.js';

export const shiftsRepo = {
  async getActiveShift(organizationId: string, outletId: string) {
    const [shift] = await db
      .select()
      .from(cashShifts)
      .where(
        and(
          eq(cashShifts.organizationId, organizationId),
          eq(cashShifts.outletId, outletId),
          eq(cashShifts.status, 'open')
        )
      );
    return shift || null;
  },

  async listShifts(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(cashShifts.organizationId, organizationId),
      ...(outletId ? [eq(cashShifts.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: cashShifts.id,
        shiftName: cashShifts.shiftName,
        status: cashShifts.status,
        startingCashIdr: cashShifts.startingCashIdr,
        cashSalesIdr: cashShifts.cashSalesIdr,
        qrisSalesIdr: cashShifts.qrisSalesIdr,
        expectedCashIdr: sql<number>`(${cashShifts.startingCashIdr} + ${cashShifts.cashSalesIdr})`,
        endingCashIdr: cashShifts.actualPhysicalCashIdr,
        varianceIdr: cashShifts.differenceIdr,
        openedAt: cashShifts.openedAt,
        closedAt: cashShifts.closedAt,
        openedByName: users.fullName,
        cashierStaffName: staff.name,
      })
      .from(cashShifts)
      .leftJoin(users, eq(users.id, cashShifts.openedByUserId))
      .leftJoin(staff, eq(staff.id, cashShifts.staffId))
      .where(whereClause)
      .orderBy(desc(cashShifts.openedAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(cashShifts).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async getById(organizationId: string, id: string) {
    const [shift] = await db
      .select()
      .from(cashShifts)
      .where(and(eq(cashShifts.id, id), eq(cashShifts.organizationId, organizationId)));
    return shift || null;
  },

  async create(
    organizationId: string,
    outletId: string,
    data: Omit<typeof cashShifts.$inferInsert, 'organizationId' | 'outletId'>
  ) {
    const [shift] = await db
      .insert(cashShifts)
      .values({
        ...data,
        organizationId,
        outletId,
      })
      .returning();
    if (!shift) throw new Error('Gagal membuka shift');
    return shift;
  },

  async close(
    id: string,
    data: {
      actualPhysicalCashIdr: number;
      differenceIdr: number;
      status: 'balanced' | 'variance';
      notes?: string | undefined;
    }
  ) {
    const [closed] = await db
      .update(cashShifts)
      .set({
        actualPhysicalCashIdr: data.actualPhysicalCashIdr,
        differenceIdr: data.differenceIdr,
        status: data.status,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        closedAt: new Date(),
      })
      .where(eq(cashShifts.id, id))
      .returning();
    return closed || null;
  },
};
