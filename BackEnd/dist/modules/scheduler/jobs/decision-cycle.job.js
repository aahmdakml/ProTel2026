"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecisionCycleJob = runDecisionCycleJob;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../../db/client");
const mst_1 = require("../../../db/schema/mst");
const engine_client_service_1 = require("../../../modules/decision-engine/engine-client.service");
const logger_util_1 = require("../../../shared/utils/logger.util");
/**
 * Decision cycle job — runs every 30 min.
 *
 * Logi:
 * - 'siaga' fields: trigger setiap 30 menit
 * - 'normal' fields: trigger setiap 60 menit (hanya pada menit ke-00, bukan ke-30)
 *
 * Node-cron memanggil job ini setiap 30 menit.
 * Job sendiri yang memilih field mana yang perlu diproses.
 */
async function runDecisionCycleJob() {
    const now = new Date();
    const minute = now.getMinutes(); // 0 atau 30
    const isEven = minute === 0; // true pada jam:00 (bukan jam:30)
    // Ambil semua field aktif
    const activeFields = await client_1.db
        .select({
        id: mst_1.fields.id,
        name: mst_1.fields.name,
        decisionCycleMode: mst_1.fields.decisionCycleMode,
    })
        .from(mst_1.fields)
        .where((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true));
    const toProcess = activeFields.filter(f => {
        if (f.decisionCycleMode === 'siaga')
            return true; // setiap 30 menit
        return isEven; // normal: hanya saat menit ke-00
    });
    if (toProcess.length === 0) {
        logger_util_1.logger.debug('Decision cycle: no fields to process this interval');
        return;
    }
    logger_util_1.logger.info({ count: toProcess.length, minute }, 'Decision cycle job started');
    for (const field of toProcess) {
        try {
            await (0, engine_client_service_1.runDecisionCycleForField)(field.id, field.decisionCycleMode ?? 'normal');
        }
        catch (err) {
            logger_util_1.logger.error({ err, fieldId: field.id }, 'Decision cycle failed for field');
        }
    }
    logger_util_1.logger.info({ count: toProcess.length }, 'Decision cycle job complete');
}
//# sourceMappingURL=decision-cycle.job.js.map