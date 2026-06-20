"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackSchema = void 0;
exports.getFieldRecommendations = getFieldRecommendations;
exports.getFieldRecommendationHistory = getFieldRecommendationHistory;
exports.getSubBlockRecommendations = getSubBlockRecommendations;
exports.submitFeedback = submitFeedback;
exports.getFieldAlerts = getFieldAlerts;
exports.acknowledgeAlert = acknowledgeAlert;
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const error_middleware_1 = require("../../middleware/error.middleware");
const pagination_util_1 = require("../../shared/utils/pagination.util");
// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------
/** Latest active recommendations per field (latest decision cycle) */
async function getFieldRecommendations(fieldId, query) {
    const { page, limit, offset } = (0, pagination_util_1.parsePagination)(query);
    const now = new Date();
    // Get latest completed job for field
    const [latestJob] = await client_1.db
        .select({ id: schema_1.decisionJobs.id, completedAt: schema_1.decisionJobs.completedAt })
        .from(schema_1.decisionJobs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.decisionJobs.fieldId, fieldId), (0, drizzle_orm_1.eq)(schema_1.decisionJobs.status, 'completed')))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.decisionJobs.completedAt))
        .limit(1);
    if (!latestJob)
        return { rows: [], meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, 0), latestJobId: null };
    const rows = await client_1.db
        .select()
        .from(schema_1.irrigationRecommendations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.decisionJobId, latestJob.id), (0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.feedbackStatus, 'pending')))
        .orderBy(schema_1.irrigationRecommendations.priorityRank)
        .limit(limit)
        .offset(offset);
    return {
        rows,
        meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, rows.length),
        latestJobId: latestJob.id,
        latestEvaluatedAt: latestJob.completedAt,
    };
}
/** Historical recommendations per field (executed, skipped, deferred) */
async function getFieldRecommendationHistory(fieldId, query) {
    const { page, limit, offset } = (0, pagination_util_1.parsePagination)(query);
    const [rows, [{ value: total }]] = await Promise.all([
        client_1.db
            .select({
            id: schema_1.irrigationRecommendations.id,
            decisionJobId: schema_1.irrigationRecommendations.decisionJobId,
            subBlockId: schema_1.irrigationRecommendations.subBlockId,
            recommendationType: schema_1.irrigationRecommendations.recommendationType,
            commandText: schema_1.irrigationRecommendations.commandText,
            reasonSummary: schema_1.irrigationRecommendations.reasonSummary,
            confidenceLevel: schema_1.irrigationRecommendations.confidenceLevel,
            feedbackStatus: schema_1.irrigationRecommendations.feedbackStatus,
            operatorNotes: schema_1.irrigationRecommendations.operatorNotes,
            feedbackAt: schema_1.irrigationRecommendations.feedbackAt,
            createdAt: schema_1.irrigationRecommendations.createdAt,
        })
            .from(schema_1.irrigationRecommendations)
            .leftJoin(schema_1.decisionJobs, (0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.decisionJobId, schema_1.decisionJobs.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.fieldId, fieldId), (0, drizzle_orm_1.ne)(schema_1.irrigationRecommendations.feedbackStatus, 'pending')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.irrigationRecommendations.feedbackAt), (0, drizzle_orm_1.desc)(schema_1.irrigationRecommendations.createdAt))
            .limit(limit)
            .offset(offset),
        client_1.db
            .select({ value: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.irrigationRecommendations)
            .leftJoin(schema_1.decisionJobs, (0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.decisionJobId, schema_1.decisionJobs.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.fieldId, fieldId), (0, drizzle_orm_1.ne)(schema_1.irrigationRecommendations.feedbackStatus, 'pending')))
    ]);
    return { rows, meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, Number(total)) };
}
/** All recommendations for a specific sub-block */
async function getSubBlockRecommendations(subBlockId) {
    return client_1.db
        .select()
        .from(schema_1.irrigationRecommendations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.subBlockId, subBlockId), (0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.feedbackStatus, 'pending')))
        .orderBy(schema_1.irrigationRecommendations.priorityRank)
        .limit(10);
}
/** Operator feedback on a recommendation */
exports.FeedbackSchema = zod_1.z.object({
    feedback_status: zod_1.z.enum(['acknowledged', 'executed', 'skipped', 'deferred']),
    operator_notes: zod_1.z.string().max(1000).optional(),
});
async function submitFeedback(recId, userId, input) {
    const [rec] = await client_1.db
        .select({ id: schema_1.irrigationRecommendations.id })
        .from(schema_1.irrigationRecommendations)
        .where((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.id, recId))
        .limit(1);
    if (!rec)
        throw new error_middleware_1.AppError(404, 'REC_NOT_FOUND', 'Rekomendasi tidak ditemukan');
    const [updated] = await client_1.db
        .update(schema_1.irrigationRecommendations)
        .set({
        feedbackStatus: input.feedback_status,
        operatorNotes: input.operator_notes,
        feedbackBy: userId,
        feedbackAt: new Date(),
        hasFeedback: true,
        lastFeedbackAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.id, recId))
        .returning();
    return updated;
}
// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------
async function getFieldAlerts(fieldId, query) {
    const { page, limit, offset } = (0, pagination_util_1.parsePagination)(query);
    const onlyActive = String(query['active']) !== 'false'; // default: hanya active
    const rows = await client_1.db
        .select()
        .from(schema_1.telemetryAlerts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.fieldId, fieldId), ...(onlyActive ? [(0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.isResolved, false)] : [])))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.telemetryAlerts.triggeredAt))
        .limit(limit)
        .offset(offset);
    return { rows, meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, rows.length) };
}
async function acknowledgeAlert(alertId, userId) {
    const [alert] = await client_1.db
        .select({ id: schema_1.telemetryAlerts.id })
        .from(schema_1.telemetryAlerts)
        .where((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.id, alertId))
        .limit(1);
    if (!alert)
        throw new error_middleware_1.AppError(404, 'ALERT_NOT_FOUND', 'Alert tidak ditemukan');
    const [updated] = await client_1.db
        .update(schema_1.telemetryAlerts)
        .set({
        isAcknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.id, alertId))
        .returning();
    return updated;
}
//# sourceMappingURL=recommendations.service.js.map