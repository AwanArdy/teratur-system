import { db } from '../../db/client.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { stockOpnames } from '../../db/schema/inventory.js';
import { users, warehouses } from '../../db/schema/identity.js';

export const opnamesRepo = {
  async listOpnames(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [
      eq(stockOpnames.organizationId, organizationId),
      ...(outletId ? [eq(stockOpnames.outletId, outletId)] : []),
    ];

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: stockOpnames.id,
        itemType: stockOpnames.itemType,
        itemId: stockOpnames.itemId,
        systemQty: stockOpnames.systemQty,
        physicalQty: stockOpnames.physicalQty,
        varianceQty: stockOpnames.varianceQty,
        uom: stockOpnames.uom,
        notes: stockOpnames.notes,
        status: stockOpnames.status,
        createdAt: stockOpnames.createdAt,
        decidedAt: stockOpnames.decidedAt,
        actorName: users.fullName,
        warehouseName: warehouses.name,
      })
      .from(stockOpnames)
      .leftJoin(users, eq(users.id, stockOpnames.actorUserId))
      .leftJoin(warehouses, eq(warehouses.id, stockOpnames.warehouseId))
      .where(whereClause)
      .orderBy(desc(stockOpnames.createdAt))
      .limit(params.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(stockOpnames).where(whereClause);

    return { data: items, total: totalRow?.total || 0 };
  },

  async getById(organizationId: string, id: string) {
    const [opname] = await db
      .select()
      .from(stockOpnames)
      .where(and(eq(stockOpnames.id, id), eq(stockOpnames.organizationId, organizationId)));
    return opname || null;
  },
};
