import { db } from '../../db/client.js';
import { eq, and, isNull, count, sql, gte, lte, desc } from 'drizzle-orm';
import { expenses } from '../../db/schema/expenses.js';

export const expensesRepo = {
  async listExpenses(
    organizationId: string,
    outletId: string | null,
    params: {
      search?: string | undefined;
      category?: string | undefined;
      from?: string | undefined;
      to?: string | undefined;
      page: number;
      limit: number;
    }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(expenses.organizationId, organizationId),
      ...(outletId ? [eq(expenses.outletId, outletId)] : []),
    ];

    if (params.search) {
      conditions.push(
        sql`(${expenses.name} ILIKE ${`%${params.search}%`} OR ${expenses.supplierName} ILIKE ${`%${params.search}%`})`
      );
    }
    if (params.category) conditions.push(eq(expenses.category, params.category as any));
    if (params.from) conditions.push(gte(expenses.date, params.from));
    if (params.to) conditions.push(lte(expenses.date, params.to));

    const whereClause = and(...conditions);

    const items = await db
      .select()
      .from(expenses)
      .where(whereClause)
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(expenses).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async getById(organizationId: string, id: string) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, organizationId)));
    return expense || null;
  },

  async create(organizationId: string, outletId: string, data: typeof expenses.$inferInsert) {
    const [created] = await db
      .insert(expenses)
      .values({
        ...data,
        organizationId,
        outletId,
      })
      .returning();
    if (!created) throw new Error('Gagal mencatat pengeluaran');
    return created;
  },

  async update(organizationId: string, id: string, data: Partial<typeof expenses.$inferInsert>) {
    const [updated] = await db
      .update(expenses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, organizationId)))
      .returning();
    return updated || null;
  },

  async delete(organizationId: string, id: string) {
    const [deleted] = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, organizationId)))
      .returning();
    return deleted || null;
  },

  async getSummary(organizationId: string, outletId: string | null, todayDate: string, yesterdayDate: string) {
    const baseConditions = [
      eq(expenses.organizationId, organizationId),
      ...(outletId ? [eq(expenses.outletId, outletId)] : []),
    ];

    const [todayAgg] = await db
      .select({
        totalIdr: sql<number>`COALESCE(SUM(${expenses.totalIdr}), 0)::float`,
        trxCount: count(),
      })
      .from(expenses)
      .where(and(...baseConditions, eq(expenses.date, todayDate)));

    const [yesterdayAgg] = await db
      .select({
        totalIdr: sql<number>`COALESCE(SUM(${expenses.totalIdr}), 0)::float`,
      })
      .from(expenses)
      .where(and(...baseConditions, eq(expenses.date, yesterdayDate)));

    const [unpaidAgg] = await db
      .select({
        totalIdr: sql<number>`COALESCE(SUM(${expenses.totalIdr}), 0)::float`,
      })
      .from(expenses)
      .where(and(...baseConditions, eq(expenses.payStatus, 'unpaid')));

    return {
      todayTotalIdr: todayAgg?.totalIdr || 0,
      todayCount: todayAgg?.trxCount || 0,
      yesterdayTotalIdr: yesterdayAgg?.totalIdr || 0,
      unpaidTotalIdr: unpaidAgg?.totalIdr || 0,
    };
  },
};
