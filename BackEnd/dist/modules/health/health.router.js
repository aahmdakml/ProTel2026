"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const client_1 = require("../../db/client");
exports.healthRouter = (0, express_1.Router)();
/**
 * GET /health
 * Cek status server dan koneksi database
 * Dipakai Railway health check + monitoring
 */
exports.healthRouter.get('/', async (_req, res) => {
    const start = Date.now();
    try {
        await client_1.pool.query('SELECT 1');
        const latency = Date.now() - start;
        res.status(200).json({
            status: 'ok',
            service: 'smart-awd-server1',
            version: process.env['npm_package_version'] ?? '1.0.0',
            environment: process.env['NODE_ENV'] ?? 'development',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            database: {
                status: 'connected',
                latency_ms: latency,
            },
        });
    }
    catch (err) {
        const latency = Date.now() - start;
        res.status(503).json({
            status: 'error',
            service: 'smart-awd-server1',
            timestamp: new Date().toISOString(),
            database: {
                status: 'disconnected',
                latency_ms: latency,
                error: err instanceof Error ? err.message : 'Unknown error',
            },
        });
    }
});
//# sourceMappingURL=health.router.js.map