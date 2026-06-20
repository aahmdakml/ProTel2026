"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataChangeAudit = exports.userActivityLogs = exports.authLogs = exports.integrationLogs = exports.engineLogs = exports.apiErrors = exports.apiRequests = exports.logs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.logs = (0, pg_core_1.pgSchema)('logs');
// ---------------------------------------------------------------------------
// logs.api_requests
// ---------------------------------------------------------------------------
exports.apiRequests = exports.logs.table('api_requests', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    requestId: (0, pg_core_1.text)('request_id'),
    userId: (0, pg_core_1.uuid)('user_id'),
    method: (0, pg_core_1.text)('method').notNull(),
    path: (0, pg_core_1.text)('path').notNull(),
    queryParams: (0, pg_core_1.jsonb)('query_params'),
    statusCode: (0, pg_core_1.integer)('status_code'),
    responseTimeMs: (0, pg_core_1.integer)('response_time_ms'),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.api_errors
// ---------------------------------------------------------------------------
exports.apiErrors = exports.logs.table('api_errors', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    requestId: (0, pg_core_1.text)('request_id'),
    userId: (0, pg_core_1.uuid)('user_id'),
    path: (0, pg_core_1.text)('path'),
    errorCode: (0, pg_core_1.text)('error_code'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    stackTrace: (0, pg_core_1.text)('stack_trace'),
    contextJson: (0, pg_core_1.jsonb)('context_json'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.engine_logs
// ---------------------------------------------------------------------------
exports.engineLogs = exports.logs.table('engine_logs', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    decisionJobId: (0, pg_core_1.uuid)('decision_job_id'),
    fieldId: (0, pg_core_1.uuid)('field_id'),
    logLevel: (0, pg_core_1.text)('log_level').notNull().default('info'),
    message: (0, pg_core_1.text)('message').notNull(),
    contextJson: (0, pg_core_1.jsonb)('context_json'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.integration_logs
// ---------------------------------------------------------------------------
exports.integrationLogs = exports.logs.table('integration_logs', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    integrationName: (0, pg_core_1.text)('integration_name').notNull(),
    action: (0, pg_core_1.text)('action').notNull(),
    status: (0, pg_core_1.text)('status').notNull(),
    requestUrl: (0, pg_core_1.text)('request_url'),
    responseStatus: (0, pg_core_1.integer)('response_status'),
    responseTimeMs: (0, pg_core_1.integer)('response_time_ms'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    contextJson: (0, pg_core_1.jsonb)('context_json'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.auth_logs
// ---------------------------------------------------------------------------
exports.authLogs = exports.logs.table('auth_logs', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id'),
    eventType: (0, pg_core_1.text)('event_type').notNull(),
    success: (0, pg_core_1.boolean)('success').notNull(),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.user_activity_logs
// ---------------------------------------------------------------------------
exports.userActivityLogs = exports.logs.table('user_activity_logs', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull(),
    fieldId: (0, pg_core_1.uuid)('field_id'),
    actionType: (0, pg_core_1.text)('action_type').notNull(),
    resourceType: (0, pg_core_1.text)('resource_type'),
    resourceId: (0, pg_core_1.text)('resource_id'),
    detailsJson: (0, pg_core_1.jsonb)('details_json'),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// logs.data_change_audit
// ---------------------------------------------------------------------------
exports.dataChangeAudit = exports.logs.table('data_change_audit', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    tableSchema: (0, pg_core_1.text)('table_schema').notNull(),
    tableName: (0, pg_core_1.text)('table_name').notNull(),
    recordId: (0, pg_core_1.text)('record_id').notNull(),
    operation: (0, pg_core_1.text)('operation').notNull(),
    changedBy: (0, pg_core_1.uuid)('changed_by'),
    changedAt: (0, pg_core_1.timestamp)('changed_at', { withTimezone: true }).notNull().defaultNow(),
    oldValues: (0, pg_core_1.jsonb)('old_values'),
    newValues: (0, pg_core_1.jsonb)('new_values'),
    changeReason: (0, pg_core_1.text)('change_reason'),
    requestId: (0, pg_core_1.text)('request_id'),
});
//# sourceMappingURL=logs.js.map