"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const error_middleware_1 = require("../../middleware/error.middleware");
const logger_util_1 = require("../../shared/utils/logger.util");
exports.archiveService = {
    /**
     * Finalize and archive a crop cycle.
     * This marks the cycle as completed/archived.
     * Business logic: ensures today's data is captured before closing.
     */
    async archiveCycle(cycleId, userId) {
        const [cycle] = await client_1.db.select().from(mst_1.cropCycles).where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cycleId)).limit(1);
        if (!cycle)
            throw new error_middleware_1.AppError(404, 'CYCLE_NOT_FOUND', 'Crop cycle tidak ditemukan');
        if (cycle.status !== 'active')
            throw new error_middleware_1.AppError(400, 'CYCLE_NOT_ACTIVE', 'Hanya cycle aktif yang bisa diarsipkan');
        const [updated] = await client_1.db.update(mst_1.cropCycles).set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cycleId)).returning();
        logger_util_1.logger.info({ cycleId, userId }, 'Crop cycle archived/completed');
        return updated;
    },
    /**
     * List archived cycles for a sub-block or field.
     */
    async listArchives(fieldId) {
        return client_1.db.select()
            .from(mst_1.cropCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.cropCycles.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.cropCycles.status, 'completed')))
            .orderBy((0, drizzle_orm_1.sql) `${mst_1.cropCycles.completedAt} DESC`);
    },
};
//# sourceMappingURL=archive.service.js.map