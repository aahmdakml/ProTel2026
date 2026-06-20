"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStaleFlagJob = runStaleFlagJob;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../../db/client");
const schema_1 = require("../../../db/schema");
const logger_util_1 = require("../../../shared/utils/logger.util");
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 jam → stale
const NO_DATA_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 jam → no_data
/**
 * Update freshness_status for all sub_block_current_states
 * based on last_observation_at vs current time.
 * Runs every 15 minutes.
 */
async function runStaleFlagJob() {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_MS);
    const noDataThreshold = new Date(now.getTime() - NO_DATA_THRESHOLD_MS);
    // Mark as no_data
    const { rowCount: noDataCount } = await client_1.db.update(schema_1.subBlockCurrentStates)
        .set({ freshnessStatus: 'no_data', updatedAt: now })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.lastObservationAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.lastObservationAt} < ${noDataThreshold}`, (0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.freshnessStatus} != 'no_data'`));
    // Mark as stale (between stale and no_data threshold)
    const { rowCount: staleCount } = await client_1.db.update(schema_1.subBlockCurrentStates)
        .set({ freshnessStatus: 'stale', updatedAt: now })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.lastObservationAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.lastObservationAt} < ${staleThreshold}`, (0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.lastObservationAt} >= ${noDataThreshold}`, (0, drizzle_orm_1.sql) `${schema_1.subBlockCurrentStates.freshnessStatus} = 'fresh'`));
    if ((noDataCount ?? 0) + (staleCount ?? 0) > 0) {
        logger_util_1.logger.info({ stale: staleCount ?? 0, noData: noDataCount ?? 0 }, 'Stale flag job complete');
    }
}
//# sourceMappingURL=stale-flag.job.js.map