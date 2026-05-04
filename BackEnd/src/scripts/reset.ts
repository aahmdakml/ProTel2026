/**
 * db:reset — Hapus semua schema lalu jalankan ulang migration
 * HANYA untuk development! Jangan dijalankan di production.
 * Usage: npm run db:reset
 */
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ db:reset TIDAK BOLEH dijalankan di production!');
    process.exit(1);
  }

  const client = await pool.connect();
  console.log('\n⚠️  Smart AWD — Database RESET (development only)\n');

  try {
    console.log('🗑️  Menghapus schemas...');
    await client.query(`
      DROP SCHEMA IF EXISTS mst  CASCADE;
      DROP SCHEMA IF EXISTS trx  CASCADE;
      DROP SCHEMA IF EXISTS sys  CASCADE;
      DROP SCHEMA IF EXISTS logs CASCADE;
      DROP TABLE  IF EXISTS public.schema_migrations;
    `);

    console.log('📄 Membaca schema.sql...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('⚙️  Menjalankan ulang schema...');
    await client.query(sql);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version     TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO public.schema_migrations (version) VALUES ('001_initial_schema')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Reset berhasil! Database bersih dengan schema fresh.\n');
    console.log('   Langkah selanjutnya:');
    console.log('   npm run db:seed && ADMIN_PASSWORD=xxx npm run seed:admin\n');

  } catch (err: any) {
    console.error('\n❌ Reset gagal:', err.message, '\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
