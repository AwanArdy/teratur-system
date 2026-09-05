import { pgTable, uuid, text, timestamp, bigint, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations, outlets, warehouses, users } from './identity.js';
import { products } from './catalog.js';
import { staff, cashShifts } from './staff.js';
import { orderTypeEnum, paymentMethodEnum, saleStatusEnum } from './enums.js';

export const sales = pgTable(
  'sales',
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
    noNota: text('no_nota').notNull(),
    soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
    cashierUserId: uuid('cashier_user_id')
      .notNull()
      .references(() => users.id),
    cashierStaffId: uuid('cashier_staff_id').references(() => staff.id),
    cashShiftId: uuid('cash_shift_id').references(() => cashShifts.id),
    orderType: orderTypeEnum('order_type').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    customerName: text('customer_name'),
    subtotalIdr: bigint('subtotal_idr', { mode: 'number' }).notNull(),
    discountIdr: bigint('discount_idr', { mode: 'number' }).notNull().default(0),
    taxIdr: bigint('tax_idr', { mode: 'number' }).notNull().default(0),
    totalIdr: bigint('total_idr', { mode: 'number' }).notNull(),
    cogsIdr: bigint('cogs_idr', { mode: 'number' }).notNull().default(0),
    status: saleStatusEnum('status').notNull().default('paid'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    salesOrgOutletNotaUidx: uniqueIndex('sales_org_outlet_nota_uidx').on(t.organizationId, t.outletId, t.noNota),
    salesOutletSoldAtIdx: index('sales_outlet_sold_at_idx').on(t.outletId, t.soldAt),
    salesOrgSoldAtIdx: index('sales_org_sold_at_idx').on(t.organizationId, t.soldAt),
  })
);

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  saleId: uuid('sale_id')
    .notNull()
    .references(() => sales.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  nameSnapshot: text('name_snapshot').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  unitPriceIdr: bigint('unit_price_idr', { mode: 'number' }).notNull(),
  lineTotalIdr: bigint('line_total_idr', { mode: 'number' }).notNull(),
  unitCogsIdr: bigint('unit_cogs_idr', { mode: 'number' }).notNull().default(0),
  lineCogsIdr: bigint('line_cogs_idr', { mode: 'number' }).notNull().default(0),
});
