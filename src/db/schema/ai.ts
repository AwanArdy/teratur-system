import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { organizations, users } from './identity.js';

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id),
  role: text('role').notNull(),
  text: text('text').notNull(),
  suggestions: jsonb('suggestions').$type<string[]>(),
  clientMessageId: text('client_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
