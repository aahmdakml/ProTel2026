import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Drizzle-kit hanya inspect schema publik; skema mst/trx/sys/logs dibuat via schema.sql
  // Gunakan drizzle-kit untuk generate tipe dan query builder saja
  verbose: true,
  strict: true,
});
