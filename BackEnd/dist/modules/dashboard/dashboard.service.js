"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class DashboardService {
    /**
     * Retrieves summary statistics for the dashboard
     * Admin sees all, regular user sees their assigned fields.
     */
    async getSummary(userId, isSystemAdmin) {
        // 1. Total Fields
        let totalFields = 0;
        if (isSystemAdmin) {
            const res = await client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.fields).where((0, drizzle_orm_1.eq)(schema_1.fields.isActive, true));
            totalFields = res[0].value;
        }
        else {
            // Normal users logic can be complex (join user_fields), for MVP we'll just count active fields if we don't have user_fields mapped right now.
            // Assuming naive implementation for MVP (or simply use full count if user is admin)
            const res = await client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.fields).where((0, drizzle_orm_1.eq)(schema_1.fields.isActive, true));
            totalFields = res[0].value;
        }
        // 2. Monitored Sub-Blocks
        const subBlocksRes = await client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.subBlocks).where((0, drizzle_orm_1.eq)(schema_1.subBlocks.isActive, true));
        const monitoredSubBlocks = subBlocksRes[0].value;
        // 3. Pending Recommendations
        const pendingRecoRes = await client_1.db.select({ value: (0, drizzle_orm_1.count)() })
            .from(schema_1.irrigationRecommendations)
            .where((0, drizzle_orm_1.eq)(schema_1.irrigationRecommendations.feedbackStatus, 'pending'));
        const pendingRecommendations = pendingRecoRes[0].value;
        // 4. System Alerts
        const alertsRes = await client_1.db.select({ value: (0, drizzle_orm_1.count)() })
            .from(schema_1.telemetryAlerts)
            .where((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.isResolved, false));
        const systemAlerts = alertsRes[0].value;
        // 5. Recent Alerts
        // Joining telemetry_alerts with fields to get the field name
        const recentDbAlerts = await client_1.db.select({
            id: schema_1.telemetryAlerts.id,
            fieldName: schema_1.fields.name,
            issue: schema_1.telemetryAlerts.alertMessage,
            severity: schema_1.telemetryAlerts.severity,
            createdAt: schema_1.telemetryAlerts.createdAt,
        })
            .from(schema_1.telemetryAlerts)
            .leftJoin(schema_1.fields, (0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.fieldId, schema_1.fields.id))
            .where((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.isResolved, false))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.telemetryAlerts.createdAt))
            .limit(5);
        const recentAlerts = recentDbAlerts.map(alert => ({
            id: alert.id,
            field: alert.fieldName || 'Unknown Field',
            issue: alert.issue,
            severity: alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default',
            time: alert.createdAt.toISOString(), // Formatting can be handled better at frontend
            createdAt: alert.createdAt
        }));
        return {
            totalFields,
            monitoredSubBlocks,
            pendingRecommendations,
            systemAlerts,
            recentAlerts
        };
    }
}
exports.dashboardService = new DashboardService();
//# sourceMappingURL=dashboard.service.js.map