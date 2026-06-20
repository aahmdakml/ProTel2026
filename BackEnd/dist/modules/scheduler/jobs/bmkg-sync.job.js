"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBmkgSyncJob = runBmkgSyncJob;
const bmkg_service_1 = require("../../../modules/weather/bmkg.service");
const logger_util_1 = require("../../../shared/utils/logger.util");
/**
 * BMKG Sync Job
 * - forecast: every 3 hours (main weather data)
 * - Called by scheduler.service.ts
 */
async function runBmkgSyncJob() {
    logger_util_1.logger.info('BMKG sync job started');
    try {
        await (0, bmkg_service_1.syncAllForecasts)();
        logger_util_1.logger.info('BMKG sync job complete');
    }
    catch (err) {
        // Errors per-field are already logged inside syncAllForecasts
        logger_util_1.logger.error({ err }, 'BMKG sync job encountered fatal error');
    }
}
//# sourceMappingURL=bmkg-sync.job.js.map