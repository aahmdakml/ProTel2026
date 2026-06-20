"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seed script: buat user system_admin pertama
 *
 * Jalankan: npm run seed:admin
 * Env vars (opsional, ada default):
 *   ADMIN_EMAIL    = admin@smartawd.id
 *   ADMIN_PASSWORD = (wajib diisi, tidak ada default untuk keamanan)
 *   ADMIN_NAME     = System Administrator
 */
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const mst_1 = require("../db/schema/mst");
async function seedAdmin() {
    await (0, client_1.testConnection)();
    const email = process.env['ADMIN_EMAIL'] ?? 'admin@smartawd.id';
    const password = process.env['ADMIN_PASSWORD'];
    const fullName = process.env['ADMIN_NAME'] ?? 'System Administrator';
    if (!password) {
        console.error('\n❌ ADMIN_PASSWORD env var wajib diisi');
        console.error('   Contoh: ADMIN_PASSWORD=RahasiaKuat123! npm run seed:admin\n');
        process.exit(1);
    }
    // Cek apakah admin sudah ada
    const [existing] = await client_1.db
        .select({ id: mst_1.users.id, email: mst_1.users.email })
        .from(mst_1.users)
        .where((0, drizzle_orm_1.eq)(mst_1.users.email, email.toLowerCase()))
        .limit(1);
    if (existing) {
        console.log(`\n✓ Admin sudah ada: ${existing.email}`);
        console.log('  Gunakan UI atau UPDATE SQL jika ingin reset password.\n');
        await client_1.pool.end();
        return;
    }
    // Hash password (cost 12 — aman untuk production)
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const [newUser] = await client_1.db
        .insert(mst_1.users)
        .values({
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        systemRole: 'system_admin',
        isActive: true,
    })
        .returning({ id: mst_1.users.id, email: mst_1.users.email });
    console.log('\n✓ Admin user berhasil dibuat:');
    console.log(`  ID:    ${newUser?.id}`);
    console.log(`  Email: ${newUser?.email}`);
    console.log(`  Name:  ${fullName}`);
    console.log('\n  ⚠️  Simpan password ini dengan aman — tidak bisa dilihat lagi!\n');
    await client_1.pool.end();
}
seedAdmin().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed-admin.js.map