import { pgTable, uuid, text, timestamp, integer, bigint, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: text('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('idempotency_scope_uidx').on(t.organizationId, t.userId, t.method, t.path, t.key),
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ip: text('ip'),
    requestId: text('request_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_org_time_idx').on(t.organizationId, t.createdAt)]
);

export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  params: jsonb('params').$type<Record<string, unknown>>().notNull(),
  filePath: text('file_path'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const dailyMetrics = pgTable(
  'daily_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    date: text('date').notNull(),
    omsetNetIdr: bigint('omset_net_idr', { mode: 'number' }).notNull().default(0),
    omsetGrossIdr: bigint('omset_gross_idr', { mode: 'number' }).notNull().default(0),
    cogsIdr: bigint('cogs_idr', { mode: 'number' }).notNull().default(0),
    opexIdr: bigint('opex_idr', { mode: 'number' }).notNull().default(0),
    wasteIdr: bigint('waste_idr', { mode: 'number' }).notNull().default(0),
    trxCount: integer('trx_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('daily_metrics_outlet_date_uidx').on(t.outletId, t.date),
    index('daily_metrics_org_date_idx').on(t.organizationId, t.date),
  ]
);

export const documentCounters = pgTable(
  'document_counters',
  {
    organizationId: uuid('organization_id').notNull(),
    outletId: uuid('outlet_id'),
    kind: text('kind').notNull(),
    yyyymmdd: text('yyyymmdd').notNull(),
    lastValue: integer('last_value').notNull(),
  },
  (t) => [
    uniqueIndex('doc_counters_uidx').on(t.organizationId, t.outletId, t.kind, t.yyyymmdd),
  ]
);
