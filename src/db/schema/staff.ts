import { pgTable, uuid, text, timestamp, boolean, bigint, numeric, index } from 'drizzle-orm/pg-core';
import { organizations, outlets, users } from './identity.js';
import { staffRoleEnum, employmentTypeEnum, shiftNameEnum, shiftStatusEnum } from './enums.js';

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    staffRole: staffRoleEnum('staff_role').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    employmentType: employmentTypeEnum('employment_type').notNull(),
    joinedOn: text('joined_on').notNull(),
    baseSalaryIdr: bigint('base_salary_idr', { mode: 'number' }).notNull().default(0),
    allowanceIdr: bigint('allowance_idr', { mode: 'number' }).notNull().default(0),
    currentShiftLabel: text('current_shift_label'),
    ratingScore: numeric('rating_score', { precision: 3, scale: 1 }).notNull().default('5.0'),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('staff_org_outlet_idx').on(t.organizationId, t.outletId)]
);

export const cashShifts = pgTable(
  'cash_shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id),
    openedByUserId: uuid('opened_by_user_id')
      .notNull()
      .references(() => users.id),
    shiftName: shiftNameEnum('shift_name').notNull(),
    startingCashIdr: bigint('starting_cash_idr', { mode: 'number' }).notNull(),
    cashSalesIdr: bigint('cash_sales_idr', { mode: 'number' }).notNull().default(0),
    qrisSalesIdr: bigint('qris_sales_idr', { mode: 'number' }).notNull().default(0),
    actualPhysicalCashIdr: bigint('actual_physical_cash_idr', { mode: 'number' }),
    differenceIdr: bigint('difference_idr', { mode: 'number' }),
    notes: text('notes'),
    status: shiftStatusEnum('status').notNull().default('open'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [index('cash_shifts_outlet_open_idx').on(t.outletId, t.status)]
);
