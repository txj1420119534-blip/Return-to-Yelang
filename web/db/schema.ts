import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const runtimeState = sqliteTable('yelang_runtime_state', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull()
});

