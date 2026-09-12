import { db } from '../../db/client.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { stockTransfers, stockTransferLines } from '../../db/schema/inventory.js';
import { warehouses, users } from '../../db/schema/identity.js';

export const transfersRepo = {
  async listTransfers(
    organizationId: string,
    params: { status?: string | undefined; page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(stockTransfers.organizationId, organizationId),
      ...(params.status ? [eq(stockTransfers.status, params.status as any)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: stockTransfers.id,
        noTransfer: stockTransfers.noTransfer,
        status: stockTransfers.status,
        notes: stockTransfers.notes,
        createdAt: stockTransfers.createdAt,
        completedAt: stockTransfers.completedAt,
        cancelledAt: stockTransfers.cancelledAt,
        actorName: users.fullName,
      })
      .from(stockTransfers)
      .leftJoin(users, eq(users.id, stockTransfers.actorUserId))
      .where(whereClause)
      .orderBy(desc(stockTransfers.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(stockTransfers).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async getTransferById(organizationId: string, id: string) {
    const [transfer] = await db
      .select()
      .from(stockTransfers)
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.organizationId, organizationId)));

    if (!transfer) return null;

    const lines = await db
      .select()
      .from(stockTransferLines)
      .where(eq(stockTransferLines.transferId, transfer.id));

    return { ...transfer, lines };
  },
};
