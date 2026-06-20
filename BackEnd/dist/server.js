"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const client_1 = require("./db/client");
const logger_util_1 = require("./shared/utils/logger.util");
const scheduler_service_1 = require("./modules/scheduler/scheduler.service");
async function bootstrap() {
    logger_util_1.logger.info(`Starting Smart AWD Server 1 [${config_1.config.NODE_ENV}]...`);
    // 1. Verify database connection before accepting traffic
    await (0, client_1.testConnection)();
    // 2. Start HTTP server
    const server = app_1.app.listen(config_1.config.PORT, () => {
        logger_util_1.logger.info({ port: config_1.config.PORT, env: config_1.config.NODE_ENV }, `🚀 Server 1 listening on port ${config_1.config.PORT}`);
        // 3. Start cron scheduler (after server is up, non-blocking)
        if (config_1.config.NODE_ENV !== 'test') {
            (0, scheduler_service_1.startScheduler)();
        }
    });
    // ---------------------------------------------------------------------------
    // Graceful shutdown
    // ---------------------------------------------------------------------------
    const shutdown = async (signal) => {
        logger_util_1.logger.info({ signal }, 'Shutdown signal received');
        server.close(async () => {
            logger_util_1.logger.info('HTTP server closed');
            (0, scheduler_service_1.stopScheduler)();
            await (0, client_1.closePool)();
            logger_util_1.logger.info('Shutdown complete');
            process.exit(0);
        });
        // Force exit setelah 10 detik jika graceful shutdown gagal
        setTimeout(() => {
            logger_util_1.logger.error('Forced exit after 10s timeout');
            process.exit(1);
        }, 10_000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
        logger_util_1.logger.error({ reason }, 'Unhandled promise rejection');
    });
    process.on('uncaughtException', (error) => {
        logger_util_1.logger.fatal({ error }, 'Uncaught exception — shutting down');
        process.exit(1);
    });
}
bootstrap().catch((err) => {
    logger_util_1.logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
//# sourceMappingURL=server.js.map