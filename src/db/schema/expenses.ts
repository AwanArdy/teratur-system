import { pgTable, uuid, text, timestamp, boolean, bigint, numeric, index } from 'drizzle-orm/pg-core';
import { organizations, outlets } from './identity.js';
import { suppliers } from './catalog.js';
import { expenseCategoryEnum, paymentMethodEnum, payStatusEnum, uomEnum } from './enums.js';

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    date: text('date').notNull(),
    name: text('name').notNull(),
    category: expenseCategoryEnum('category').notNull(),
    qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
    uom: uomEnum('uom').notNull(),
    unitPriceIdr: bigint('unit_price_idr', { mode: 'number' }).notNull(),
    totalIdr: bigint('total_idr', { mode: 'number' }).notNull(),
    supplierId: uuid('supplier_id').references(() => suppliers.id),
    supplierName: text('supplier_name'),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    payStatus: payStatusEnum('pay_status').notNull(),
    notes: text('notes'),
    countedInCogs: boolean('counted_in_cogs').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    expensesOutletDateIdx: index('expenses_outlet_date_idx').on(t.outletId, t.date),
    expensesOrgDateIdx: index('expenses_org_date_idx').on(t.organizationId, t.date),
  })
);
