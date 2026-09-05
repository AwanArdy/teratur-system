import { pgTable, uuid, text, timestamp, boolean, integer, bigint, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './identity.js';
import { ingredientCategoryEnum, productKindEnum, recipeComponentTypeEnum, uomEnum } from './enums.js';

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('suppliers_org_idx').on(t.organizationId)]
);

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    category: ingredientCategoryEnum('category').notNull(),
    uom: uomEnum('uom').notNull(),
    purchasePriceIdr: bigint('purchase_price_idr', { mode: 'number' }).notNull(),
    minStock: numeric('min_stock', { precision: 14, scale: 4 }).notNull().default('0'),
    leadTimeDays: integer('lead_time_days').notNull().default(3),
    supplierId: uuid('supplier_id').references(() => suppliers.id),
    supplierName: text('supplier_name'),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ingredients_org_sku_uidx').on(t.organizationId, t.sku),
    index('ingredients_org_name_idx').on(t.organizationId, t.name),
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    sellingPriceIdr: bigint('selling_price_idr', { mode: 'number' }).notNull(),
    kind: productKindEnum('kind').notNull().default('made_to_order'),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('products_org_sku_uidx').on(t.organizationId, t.sku)]
);

export const recipeLines = pgTable(
  'recipe_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    componentType: recipeComponentTypeEnum('component_type').notNull(),
    componentId: uuid('component_id').notNull(),
    qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('recipe_lines_product_idx').on(t.productId),
    uniqueIndex('recipe_lines_product_component_uidx').on(t.productId, t.componentType, t.componentId),
  ]
);
