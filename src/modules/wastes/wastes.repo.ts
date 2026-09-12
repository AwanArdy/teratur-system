import { db } from '../../db/client.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { wasteLogs } from '../../db/schema/inventory.js';
import { users, warehouses } from '../../db/schema/identity.js';

export const wastesRepo = {
  async listWastes(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(wasteLogs.organizationId, organizationId),
      ...(outletId ? [eq(wasteLogs.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: wasteLogs.id,
        itemType: wasteLogs.itemType,
        itemId: wasteLogs.itemId,
        qty: wasteLogs.qty,
        uom: wasteLogs.uom,
        reason: wasteLogs.reason,
        lossIdr: wasteLogs.lossIdr,
        createdAt: wasteLogs.createdAt,
        actorName: users.fullName,
        warehouseName: warehouses.name,
      })
      .from(wasteLogs)
      .leftJoin(users, eq(users.id, wasteLogs.actorUserId))
      .leftJoin(warehouses, eq(warehouses.id, wasteLogs.warehouseId))
      .where(whereClause)
      .orderBy(desc(wasteLogs.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(wasteLogs).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },
};
