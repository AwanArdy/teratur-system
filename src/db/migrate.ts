import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client.js";
import { logger } from "../lib/logger.js";

export const runMigrations = async () => {
  logger.info('Menjalankan migrasi database...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  logger.info('Migrasi database selesai');
};
