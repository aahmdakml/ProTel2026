"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
// ---------------------------------------------------------------------------
// Schema validasi env vars — dijalankan saat startup
// Jika ada yang kurang/salah, server TIDAK akan start
// ---------------------------------------------------------------------------
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    LOG_LEVEL: zod_1.z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('info'),
    // Database
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL wajib diisi'),
    DB_POOL_MIN: zod_1.z.coerce.number().int().nonnegative().default(2),
    DB_POOL_MAX: zod_1.z.coerce.number().int().positive().default(10),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Model service (Server 2)
    DECISION_ENGINE_URL: zod_1.z.string().url().default('http://localhost:8000'),
    DECISION_ENGINE_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(30000),
    // Cloudflare R2 (opsional saat development)
    R2_ENDPOINT: zod_1.z.preprocess((val) => val === '' ? undefined : val, zod_1.z.string().url().optional()),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    R2_BUCKET_NAME: zod_1.z.string().default('awd-orthomosaic'),
    R2_PUBLIC_URL: zod_1.z.preprocess((val) => val === '' ? undefined : val, zod_1.z.string().url().optional()),
});
const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
    console.error('\n❌ Konfigurasi environment tidak valid:');
    const errors = _parsed.error.flatten().fieldErrors;
    Object.entries(errors).forEach(([key, msgs]) => {
        console.error(`   ${key}: ${msgs?.join(', ')}`);
    });
    console.error('\nPeriksa file .env kamu.\n');
    process.exit(1);
}
exports.config = _parsed.data;
//# sourceMappingURL=index.js.map