import { pgTable, uuid, text, timestamp, bigint, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations, outlets, warehouses, users } from './identity.js';
import { stockItemTypeEnum, movementTypeEnum, transferStatusEnum, opnameStatusEnum, wasteReasonEnum, uomEnum } from './enums.js';

export const inventoryBalances = pgTable(
  'inventory_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    itemType: stockItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    qtyOnHand: numeric('qty_on_hand', { precision: 14, scale: 4 }).notNull().default('0'),
    qtyReserved: numeric('qty_reserved', { precision: 14, scale: 4 }).notNull().default('0'),
    avgUnitCost: numeric('avg_unit_cost', { precision: 14, scale: 4 }).notNull().default('0'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('inv_bal_wh_item_uidx').on(t.warehouseId, t.itemType, t.itemId),
    index('inv_bal_org_outlet_idx').on(t.organizationId, t.outletId),
  ]
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    itemType: stockItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    type: movementTypeEnum('type').notNull(),
    qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull(),
    amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
    refType: text('ref_type').notNull(),
    refId: uuid('ref_id').notNull(),
    notes: text('notes'),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stock_movements_org_time_idx').on(t.organizationId, t.occurredAt),
    index('stock_movements_item_time_idx').on(t.organizationId, t.itemType, t.itemId, t.occurredAt),
    index('stock_movements_ref_idx').on(t.refType, t.refId),
    index('stock_movements_wh_idx').on(t.warehouseId, t.occurredAt),
  ]
);

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    noTransfer: text('no_transfer').notNull(),
    fromWarehouseId: uuid('from_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    toWarehouseId: uuid('to_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    status: transferStatusEnum('status').notNull().default('in_transit'),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('stock_transfers_org_no_uidx').on(t.organizationId, t.noTransfer),
    index('stock_transfers_org_idx').on(t.organizationId, t.createdAt),
  ]
);

export const stockTransferLines = pgTable('stock_transfer_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  transferId: uuid('transfer_id')
    .notNull()
    .references(() => stockTransfers.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  uom: uomEnum('uom').notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull(),
});

export const stockOpnames = pgTable(
  'stock_opnames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    itemType: stockItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    systemQty: numeric('system_qty', { precision: 14, scale: 4 }).notNull(),
    physicalQty: numeric('physical_qty', { precision: 14, scale: 4 }).notNull(),
    varianceQty: numeric('variance_qty', { precision: 14, scale: 4 }).notNull(),
    uom: uomEnum('uom').notNull(),
    notes: text('notes'),
    status: opnameStatusEnum('status').notNull().default('pending_review'),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [index('stock_opnames_org_idx').on(t.organizationId, t.createdAt)]
);

export const wasteLogs = pgTable(
  'waste_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    itemType: stockItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
    uom: uomEnum('uom').notNull(),
    reason: wasteReasonEnum('reason').notNull(),
    lossIdr: bigint('loss_idr', { mode: 'number' }).notNull(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('waste_logs_org_time_idx').on(t.organizationId, t.createdAt)]
);
