/**
 * db:migrate — Jalankan schema.sql ke database baru
 * Usage: npm run db:migrate
 */
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  console.log('\n🚀 Smart AWD — Database Migration\n');

  try {
    // Cek apakah schema sudah ada
    const { rows } = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'mst'`
    );

    if (rows.length > 0) {
      console.log('⚠️  Schema "mst" sudah ada.');
      console.log('   Gunakan npm run db:reset untuk reset total.\n');
      return;
    }

    console.log('📄 Membaca schema.sql...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('⚙️  Menjalankan migration...');
    await client.query(sql);

    // Catat migrasi
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version     TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO public.schema_migrations (version) VALUES ('001_initial_schema')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Migration berhasil!\n');
    console.log('   Langkah selanjutnya:');
    console.log('   1. npm run db:seed       — seed data referensi');
    console.log('   2. ADMIN_PASSWORD=xxx npm run seed:admin — buat user admin\n');

  } catch (err: any) {
    console.error('\n❌ Migration gagal:', err.message, '\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
