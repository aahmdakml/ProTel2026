"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHstUpdaterJob = runHstUpdaterJob;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../../db/client");
const mst_1 = require("../../../db/schema/mst");
const logger_util_1 = require("../../../shared/utils/logger.util");
/**
 * Increment current_hst for all active crop cycles based on planting_date.
 * Also syncs the current_phase_code based on HST bucket thresholds.
 * Runs daily at midnight.
 */
async function runHstUpdaterJob() {
    const today = new Date();
    // Select all active crop cycles
    const activeCycles = await client_1.db
        .select({
        id: mst_1.cropCycles.id,
        plantingDate: mst_1.cropCycles.plantingDate,
        currentHst: mst_1.cropCycles.currentHst,
        currentPhaseCode: mst_1.cropCycles.currentPhaseCode,
        bucketCode: mst_1.cropCycles.bucketCode,
    })
        .from(mst_1.cropCycles)
        .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.status, 'active'));
    let updated = 0;
    for (const cycle of activeCycles) {
        try {
            const planting = new Date(cycle.plantingDate);
            const diffDays = Math.floor((today.getTime() - planting.getTime()) / 86_400_000);
            const newHst = Math.max(0, diffDays);
            // Only update if changed
            if (newHst === cycle.currentHst)
                continue;
            await client_1.db.update(mst_1.cropCycles)
                .set({ currentHst: newHst, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cycle.id));
            updated++;
        }
        catch (err) {
            logger_util_1.logger.error({ err, cycleId: cycle.id }, 'HST updater: failed for cycle');
        }
    }
    logger_util_1.logger.info({ updated, total: activeCycles.length }, 'HST updater job complete');
}
//# sourceMappingURL=hst-updater.job.js.map