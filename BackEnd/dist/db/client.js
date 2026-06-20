"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.testConnection = testConnection;
exports.closePool = closePool;
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const config_1 = require("../config");
const logger_util_1 = require("../shared/utils/logger.util");
const schema = __importStar(require("./schema"));
// ---------------------------------------------------------------------------
// PostgreSQL connection pool
// ---------------------------------------------------------------------------
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.DATABASE_URL,
    min: config_1.config.DB_POOL_MIN,
    max: config_1.config.DB_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Tambahkan SSL untuk Railway production
    ...(config_1.config.NODE_ENV === 'production' && {
        ssl: { rejectUnauthorized: false },
    }),
});
exports.pool.on('error', (err) => {
    logger_util_1.logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});
exports.pool.on('connect', () => {
    logger_util_1.logger.debug('New client connected to PostgreSQL pool');
});
// ---------------------------------------------------------------------------
// Drizzle ORM instance
// ---------------------------------------------------------------------------
exports.db = (0, node_postgres_1.drizzle)(exports.pool, {
    schema,
    logger: config_1.config.NODE_ENV === 'development',
});
// ---------------------------------------------------------------------------
// Test connection — dipanggil saat server startup
// ---------------------------------------------------------------------------
async function testConnection() {
    const client = await exports.pool.connect();
    try {
        const result = await client.query("SELECT current_database() as db, version() as version");
        logger_util_1.logger.info({
            database: result.rows[0]?.db,
            version: result.rows[0]?.version?.split(' ').slice(0, 2).join(' '),
        }, '✓ Database connected');
    }
    finally {
        client.release();
    }
}
// ---------------------------------------------------------------------------
// Graceful shutdown — panggil saat SIGTERM
// ---------------------------------------------------------------------------
async function closePool() {
    await exports.pool.end();
    logger_util_1.logger.info('Database pool closed');
}
//# sourceMappingURL=client.js.map