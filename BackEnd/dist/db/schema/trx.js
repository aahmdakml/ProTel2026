"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orthomosaicPublishHistory = exports.orthomosaicUploads = exports.recommendationFeedback = exports.irrigationRecommendations = exports.telemetryAlerts = exports.managementEvents = exports.weatherWarningSnapshots = exports.weatherForecastSnapshots = exports.subBlockCurrentStates = exports.subBlockStates = exports.telemetryRecords = exports.rawEvents = exports.telemetryBatches = exports.integrationConfigs = exports.engineConfigs = exports.archiveJobs = exports.schedulerState = exports.jobAttempts = exports.decisionJobs = exports.refreshTokens = exports.trx = exports.sys = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const mst_1 = require("./mst");
exports.sys = (0, pg_core_1.pgSchema)('sys');
exports.trx = (0, pg_core_1.pgSchema)('trx');
// ---------------------------------------------------------------------------
// sys.refresh_tokens
// ---------------------------------------------------------------------------
exports.refreshTokens = exports.sys.table('refresh_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => mst_1.users.id, { onDelete: 'cascade' }),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull().unique(),
    issuedAt: (0, pg_core_1.timestamp)('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    revoked: (0, pg_core_1.boolean)('revoked').notNull().default(false),
    revokedAt: (0, pg_core_1.timestamp)('revoked_at', { withTimezone: true }),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    deviceInfo: (0, pg_core_1.text)('device_info'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.decision_jobs
// ---------------------------------------------------------------------------
exports.decisionJobs = exports.sys.table('decision_jobs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    triggeredAt: (0, pg_core_1.timestamp)('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    triggerSource: (0, pg_core_1.text)('trigger_source').notNull().default('scheduler'),
    cycleMode: (0, pg_core_1.text)('cycle_mode').notNull().default('normal'),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    durationMs: (0, pg_core_1.integer)('duration_ms'),
    attemptCount: (0, pg_core_1.integer)('attempt_count').notNull().default(0),
    subBlocksEvaluated: (0, pg_core_1.integer)('sub_blocks_evaluated').default(0),
    recommendationsGenerated: (0, pg_core_1.integer)('recommendations_generated').default(0),
    errorMessage: (0, pg_core_1.text)('error_message'),
    engineVersion: (0, pg_core_1.text)('engine_version'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.job_attempts
// ---------------------------------------------------------------------------
exports.jobAttempts = exports.sys.table('job_attempts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    decisionJobId: (0, pg_core_1.uuid)('decision_job_id').notNull().references(() => exports.decisionJobs.id, { onDelete: 'cascade' }),
    attemptNumber: (0, pg_core_1.integer)('attempt_number').notNull(),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    status: (0, pg_core_1.text)('status').notNull().default('running'),
    engineRequestJson: (0, pg_core_1.jsonb)('engine_request_json'),
    engineResponseJson: (0, pg_core_1.jsonb)('engine_response_json'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    httpStatusCode: (0, pg_core_1.integer)('http_status_code'),
    responseTimeMs: (0, pg_core_1.integer)('response_time_ms'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.scheduler_state
// ---------------------------------------------------------------------------
exports.schedulerState = exports.sys.table('scheduler_state', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    jobType: (0, pg_core_1.text)('job_type').notNull(),
    fieldId: (0, pg_core_1.uuid)('field_id').references(() => mst_1.fields.id, { onDelete: 'cascade' }),
    lastRunAt: (0, pg_core_1.timestamp)('last_run_at', { withTimezone: true }),
    nextExpectedAt: (0, pg_core_1.timestamp)('next_expected_at', { withTimezone: true }),
    lastRunStatus: (0, pg_core_1.text)('last_run_status'),
    lastError: (0, pg_core_1.text)('last_error'),
    runCount: (0, pg_core_1.integer)('run_count').notNull().default(0),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.archive_jobs
// ---------------------------------------------------------------------------
exports.archiveJobs = exports.sys.table('archive_jobs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    jobType: (0, pg_core_1.text)('job_type').notNull().default('crop_cycle_archive'),
    cropCycleId: (0, pg_core_1.uuid)('crop_cycle_id').references(() => mst_1.cropCycles.id, { onDelete: 'set null' }),
    fieldId: (0, pg_core_1.uuid)('field_id').references(() => mst_1.fields.id, { onDelete: 'set null' }),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    triggeredAt: (0, pg_core_1.timestamp)('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    triggeredBy: (0, pg_core_1.uuid)('triggered_by').references(() => mst_1.users.id),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    rowsArchived: (0, pg_core_1.integer)('rows_archived').default(0),
    errorMessage: (0, pg_core_1.text)('error_message'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.engine_configs
// ---------------------------------------------------------------------------
exports.engineConfigs = exports.sys.table('engine_configs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    configKey: (0, pg_core_1.text)('config_key').notNull().unique(),
    configValue: (0, pg_core_1.jsonb)('config_value').notNull(),
    description: (0, pg_core_1.text)('description'),
    updatedBy: (0, pg_core_1.uuid)('updated_by').references(() => mst_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// sys.integration_configs
// ---------------------------------------------------------------------------
exports.integrationConfigs = exports.sys.table('integration_configs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    integrationName: (0, pg_core_1.text)('integration_name').notNull().unique(),
    isEnabled: (0, pg_core_1.boolean)('is_enabled').notNull().default(true),
    baseUrl: (0, pg_core_1.text)('base_url'),
    syncIntervalMinutes: (0, pg_core_1.integer)('sync_interval_minutes'),
    configJson: (0, pg_core_1.jsonb)('config_json'),
    lastSuccessAt: (0, pg_core_1.timestamp)('last_success_at', { withTimezone: true }),
    lastErrorAt: (0, pg_core_1.timestamp)('last_error_at', { withTimezone: true }),
    lastErrorMsg: (0, pg_core_1.text)('last_error_msg'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ===========================================================================
// SCHEMA: trx
// ===========================================================================
// ---------------------------------------------------------------------------
// trx.telemetry_batches
// ---------------------------------------------------------------------------
exports.telemetryBatches = exports.trx.table('telemetry_batches', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    gatewayCode: (0, pg_core_1.text)('gateway_code'),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }).notNull().defaultNow(),
    batchSize: (0, pg_core_1.integer)('batch_size').notNull().default(0),
    rawPayload: (0, pg_core_1.jsonb)('raw_payload'),
    processingStatus: (0, pg_core_1.text)('processing_status').notNull().default('received'),
    processingError: (0, pg_core_1.text)('processing_error'),
    processedAt: (0, pg_core_1.timestamp)('processed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.raw_events
// ---------------------------------------------------------------------------
exports.rawEvents = exports.trx.table('raw_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    batchId: (0, pg_core_1.uuid)('batch_id').notNull().references(() => exports.telemetryBatches.id, { onDelete: 'restrict' }),
    deviceId: (0, pg_core_1.uuid)('device_id').references(() => mst_1.devices.id, { onDelete: 'set null' }),
    deviceCode: (0, pg_core_1.text)('device_code').notNull(),
    eventTimestamp: (0, pg_core_1.timestamp)('event_timestamp', { withTimezone: true }).notNull(),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }).notNull().defaultNow(),
    seqNumber: (0, pg_core_1.integer)('seq_number'),
    rawData: (0, pg_core_1.jsonb)('raw_data').notNull(),
    isProcessed: (0, pg_core_1.boolean)('is_processed').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.telemetry_records — TimescaleDB HYPERTABLE
// Composite PK (id, event_timestamp) required by TimescaleDB
// ---------------------------------------------------------------------------
exports.telemetryRecords = exports.trx.table('telemetry_records', {
    id: (0, pg_core_1.uuid)('id').notNull().defaultRandom(),
    eventTimestamp: (0, pg_core_1.timestamp)('event_timestamp', { withTimezone: true }).notNull(),
    deviceId: (0, pg_core_1.uuid)('device_id').notNull().references(() => mst_1.devices.id, { onDelete: 'restrict' }),
    deviceCode: (0, pg_core_1.text)('device_code').notNull(),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').references(() => mst_1.subBlocks.id, { onDelete: 'set null' }),
    rawEventId: (0, pg_core_1.uuid)('raw_event_id'), // no FK — hypertable limitation
    // Normalized readings (calibrated)
    waterLevelCm: (0, pg_core_1.numeric)('water_level_cm', { precision: 7, scale: 2 }),
    temperatureC: (0, pg_core_1.numeric)('temperature_c', { precision: 5, scale: 2 }),
    humidityPct: (0, pg_core_1.numeric)('humidity_pct', { precision: 5, scale: 2 }),
    batteryPct: (0, pg_core_1.numeric)('battery_pct', { precision: 5, scale: 2 }),
    signalRssi: (0, pg_core_1.integer)('signal_rssi'),
    calibrationId: (0, pg_core_1.uuid)('calibration_id'),
    waterLevelRawCm: (0, pg_core_1.numeric)('water_level_raw_cm', { precision: 7, scale: 2 }),
    isValid: (0, pg_core_1.boolean)('is_valid').notNull().default(true),
    validationNotes: (0, pg_core_1.text)('validation_notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.id, table.eventTimestamp] }),
}));
// ---------------------------------------------------------------------------
// trx.sub_block_states   (history)
// ---------------------------------------------------------------------------
exports.subBlockStates = exports.trx.table('sub_block_states', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').notNull().references(() => mst_1.subBlocks.id, { onDelete: 'restrict' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    cropCycleId: (0, pg_core_1.uuid)('crop_cycle_id').references(() => mst_1.cropCycles.id, { onDelete: 'set null' }),
    stateTime: (0, pg_core_1.timestamp)('state_time', { withTimezone: true }).notNull(),
    waterLevelCm: (0, pg_core_1.numeric)('water_level_cm', { precision: 7, scale: 2 }),
    waterLevelTrend: (0, pg_core_1.text)('water_level_trend'),
    stateSource: (0, pg_core_1.text)('state_source').notNull().default('no_data'),
    freshnessStatus: (0, pg_core_1.text)('freshness_status').notNull().default('no_data'),
    lastObservationAt: (0, pg_core_1.timestamp)('last_observation_at', { withTimezone: true }),
    sourceDeviceId: (0, pg_core_1.uuid)('source_device_id').references(() => mst_1.devices.id, { onDelete: 'set null' }),
    interpolationConfidence: (0, pg_core_1.numeric)('interpolation_confidence', { precision: 3, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.sub_block_current_states   (CQRS — satu baris per sub-block)
// ---------------------------------------------------------------------------
exports.subBlockCurrentStates = exports.trx.table('sub_block_current_states', {
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').primaryKey().references(() => mst_1.subBlocks.id, { onDelete: 'cascade' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    cropCycleId: (0, pg_core_1.uuid)('crop_cycle_id').references(() => mst_1.cropCycles.id, { onDelete: 'set null' }),
    stateTime: (0, pg_core_1.timestamp)('state_time', { withTimezone: true }).notNull(),
    waterLevelCm: (0, pg_core_1.numeric)('water_level_cm', { precision: 7, scale: 2 }),
    waterLevelTrend: (0, pg_core_1.text)('water_level_trend'),
    stateSource: (0, pg_core_1.text)('state_source').notNull().default('no_data'),
    freshnessStatus: (0, pg_core_1.text)('freshness_status').notNull().default('no_data'),
    lastObservationAt: (0, pg_core_1.timestamp)('last_observation_at', { withTimezone: true }),
    sourceDeviceId: (0, pg_core_1.uuid)('source_device_id').references(() => mst_1.devices.id, { onDelete: 'set null' }),
    interpolationConfidence: (0, pg_core_1.numeric)('interpolation_confidence', { precision: 3, scale: 2 }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.weather_forecast_snapshots
// ---------------------------------------------------------------------------
exports.weatherForecastSnapshots = exports.trx.table('weather_forecast_snapshots', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    adm4Code: (0, pg_core_1.text)('adm4_code').notNull(),
    fetchedAt: (0, pg_core_1.timestamp)('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    analysisDate: (0, pg_core_1.timestamp)('analysis_date', { withTimezone: true }),
    forecastValidFrom: (0, pg_core_1.timestamp)('forecast_valid_from', { withTimezone: true }).notNull(),
    forecastValidUntil: (0, pg_core_1.timestamp)('forecast_valid_until', { withTimezone: true }).notNull(),
    temperatureC: (0, pg_core_1.numeric)('temperature_c', { precision: 5, scale: 2 }),
    humidityPct: (0, pg_core_1.numeric)('humidity_pct', { precision: 5, scale: 2 }),
    precipitationMm: (0, pg_core_1.numeric)('precipitation_mm', { precision: 7, scale: 2 }),
    cloudCoverPct: (0, pg_core_1.numeric)('cloud_cover_pct', { precision: 5, scale: 2 }),
    windSpeedKmh: (0, pg_core_1.numeric)('wind_speed_kmh', { precision: 6, scale: 2 }),
    windDirection: (0, pg_core_1.text)('wind_direction'),
    weatherCode: (0, pg_core_1.integer)('weather_code'),
    weatherDesc: (0, pg_core_1.text)('weather_desc'),
    bmkgCategory: (0, pg_core_1.text)('bmkg_category'),
    fullResponseJson: (0, pg_core_1.jsonb)('full_response_json'),
    isLatest: (0, pg_core_1.boolean)('is_latest').notNull().default(true),
    isStale: (0, pg_core_1.boolean)('is_stale').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.weather_warning_snapshots
// ---------------------------------------------------------------------------
exports.weatherWarningSnapshots = exports.trx.table('weather_warning_snapshots', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    adm4Code: (0, pg_core_1.text)('adm4_code').notNull(),
    fetchedAt: (0, pg_core_1.timestamp)('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    warningType: (0, pg_core_1.text)('warning_type'),
    warningLevel: (0, pg_core_1.text)('warning_level'),
    validFrom: (0, pg_core_1.timestamp)('valid_from', { withTimezone: true }),
    warningExpiresAt: (0, pg_core_1.timestamp)('warning_expires_at', { withTimezone: true }),
    warningText: (0, pg_core_1.text)('warning_text'),
    dssAction: (0, pg_core_1.text)('dss_action').default('none'),
    fullResponseJson: (0, pg_core_1.jsonb)('full_response_json'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.management_events
// ---------------------------------------------------------------------------
exports.managementEvents = exports.trx.table('management_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').references(() => mst_1.subBlocks.id, { onDelete: 'set null' }),
    cropCycleId: (0, pg_core_1.uuid)('crop_cycle_id').references(() => mst_1.cropCycles.id, { onDelete: 'set null' }),
    eventType: (0, pg_core_1.text)('event_type').notNull(),
    eventDate: (0, pg_core_1.text)('event_date').notNull(),
    eventTime: (0, pg_core_1.text)('event_time'),
    productName: (0, pg_core_1.text)('product_name'),
    dosageNotes: (0, pg_core_1.text)('dosage_notes'),
    attentionFlagText: (0, pg_core_1.text)('attention_flag_text'),
    flagActiveHours: (0, pg_core_1.integer)('flag_active_hours').notNull().default(48),
    // flag_expires_at is a GENERATED column in PG — read-only
    flagExpiresAt: (0, pg_core_1.timestamp)('flag_expires_at', { withTimezone: true }),
    reportedBy: (0, pg_core_1.uuid)('reported_by').references(() => mst_1.users.id),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.telemetry_alerts
// ---------------------------------------------------------------------------
exports.telemetryAlerts = exports.trx.table('telemetry_alerts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').references(() => mst_1.subBlocks.id, { onDelete: 'set null' }),
    deviceId: (0, pg_core_1.uuid)('device_id').references(() => mst_1.devices.id, { onDelete: 'set null' }),
    alertType: (0, pg_core_1.text)('alert_type').notNull(),
    severity: (0, pg_core_1.text)('severity').notNull(),
    triggeredAt: (0, pg_core_1.timestamp)('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    triggeredValue: (0, pg_core_1.numeric)('triggered_value', { precision: 10, scale: 3 }),
    thresholdValue: (0, pg_core_1.numeric)('threshold_value', { precision: 10, scale: 3 }),
    alertMessage: (0, pg_core_1.text)('alert_message').notNull(),
    isAcknowledged: (0, pg_core_1.boolean)('is_acknowledged').notNull().default(false),
    acknowledgedAt: (0, pg_core_1.timestamp)('acknowledged_at', { withTimezone: true }),
    acknowledgedBy: (0, pg_core_1.uuid)('acknowledged_by').references(() => mst_1.users.id),
    ackNotes: (0, pg_core_1.text)('ack_notes'),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    isResolved: (0, pg_core_1.boolean)('is_resolved').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.irrigation_recommendations
// ---------------------------------------------------------------------------
exports.irrigationRecommendations = exports.trx.table('irrigation_recommendations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').notNull().references(() => mst_1.subBlocks.id, { onDelete: 'restrict' }),
    cropCycleId: (0, pg_core_1.uuid)('crop_cycle_id').references(() => mst_1.cropCycles.id, { onDelete: 'set null' }),
    decisionJobId: (0, pg_core_1.uuid)('decision_job_id').references(() => exports.decisionJobs.id, { onDelete: 'set null' }),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).notNull().defaultNow(),
    validUntil: (0, pg_core_1.timestamp)('valid_until', { withTimezone: true }).notNull(),
    recommendationType: (0, pg_core_1.text)('recommendation_type').notNull(),
    priorityRank: (0, pg_core_1.integer)('priority_rank').notNull(),
    priorityScore: (0, pg_core_1.numeric)('priority_score', { precision: 8, scale: 4 }).notNull(),
    fromSubBlockId: (0, pg_core_1.uuid)('from_sub_block_id').references(() => mst_1.subBlocks.id),
    toSubBlockId: (0, pg_core_1.uuid)('to_sub_block_id').references(() => mst_1.subBlocks.id),
    viaFlowPathId: (0, pg_core_1.uuid)('via_flow_path_id').references(() => mst_1.flowPaths.id),
    commandTemplateCode: (0, pg_core_1.text)('command_template_code').notNull(),
    commandText: (0, pg_core_1.text)('command_text').notNull(),
    reasonSummary: (0, pg_core_1.text)('reason_summary').notNull(),
    attentionFlagsJson: (0, pg_core_1.jsonb)('attention_flags_json'),
    operatorWarningText: (0, pg_core_1.text)('operator_warning_text'),
    confidenceLevel: (0, pg_core_1.text)('confidence_level').notNull().default('high'),
    waterLevelCmAtDecision: (0, pg_core_1.numeric)('water_level_cm_at_decision', { precision: 7, scale: 2 }),
    stateSourceAtDecision: (0, pg_core_1.text)('state_source_at_decision'),
    growthPhaseAtDecision: (0, pg_core_1.text)('growth_phase_at_decision'),
    hstAtDecision: (0, pg_core_1.integer)('hst_at_decision'),
    weatherContextJson: (0, pg_core_1.jsonb)('weather_context_json'),
    activeWarningsJson: (0, pg_core_1.jsonb)('active_warnings_json'),
    ruleProfileId: (0, pg_core_1.uuid)('rule_profile_id').references(() => mst_1.irrigationRuleProfiles.id),
    feedbackStatus: (0, pg_core_1.text)('feedback_status').notNull().default('pending'),
    operatorNotes: (0, pg_core_1.text)('operator_notes'),
    feedbackBy: (0, pg_core_1.uuid)('feedback_by').references(() => mst_1.users.id),
    feedbackAt: (0, pg_core_1.timestamp)('feedback_at', { withTimezone: true }),
    hasFeedback: (0, pg_core_1.boolean)('has_feedback').notNull().default(false),
    lastFeedbackAt: (0, pg_core_1.timestamp)('last_feedback_at', { withTimezone: true }),
    engineVersion: (0, pg_core_1.text)('engine_version'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.recommendation_feedback
// ---------------------------------------------------------------------------
exports.recommendationFeedback = exports.trx.table('recommendation_feedback', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    recommendationId: (0, pg_core_1.uuid)('recommendation_id').notNull().references(() => exports.irrigationRecommendations.id, { onDelete: 'cascade' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').notNull().references(() => mst_1.subBlocks.id, { onDelete: 'restrict' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    operatorAction: (0, pg_core_1.text)('operator_action').notNull(),
    actualActionTaken: (0, pg_core_1.text)('actual_action_taken'),
    operatorNotes: (0, pg_core_1.text)('operator_notes'),
    actionedAt: (0, pg_core_1.timestamp)('actioned_at', { withTimezone: true }).notNull().defaultNow(),
    actionedBy: (0, pg_core_1.uuid)('actioned_by').notNull().references(() => mst_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.orthomosaic_uploads
// ---------------------------------------------------------------------------
exports.orthomosaicUploads = exports.trx.table('orthomosaic_uploads', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    mapLayerId: (0, pg_core_1.uuid)('map_layer_id').references(() => mst_1.mapLayers.id, { onDelete: 'set null' }),
    originalFilename: (0, pg_core_1.text)('original_filename').notNull(),
    rawStorageKey: (0, pg_core_1.text)('raw_storage_key'),
    cogStorageKey: (0, pg_core_1.text)('cog_storage_key'),
    fileSizeBytes: (0, pg_core_1.integer)('file_size_bytes'),
    uploadStatus: (0, pg_core_1.text)('upload_status').notNull().default('pending'),
    processingStartedAt: (0, pg_core_1.timestamp)('processing_started_at', { withTimezone: true }),
    processingCompletedAt: (0, pg_core_1.timestamp)('processing_completed_at', { withTimezone: true }),
    processingError: (0, pg_core_1.text)('processing_error'),
    uploadedBy: (0, pg_core_1.uuid)('uploaded_by').references(() => mst_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// trx.orthomosaic_publish_history
// ---------------------------------------------------------------------------
exports.orthomosaicPublishHistory = exports.trx.table('orthomosaic_publish_history', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    mapLayerId: (0, pg_core_1.uuid)('map_layer_id').notNull().references(() => mst_1.mapLayers.id, { onDelete: 'cascade' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => mst_1.fields.id, { onDelete: 'restrict' }),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }).notNull().defaultNow(),
    unpublishedAt: (0, pg_core_1.timestamp)('unpublished_at', { withTimezone: true }),
    publishedBy: (0, pg_core_1.uuid)('published_by').references(() => mst_1.users.id),
    unpublishedBy: (0, pg_core_1.uuid)('unpublished_by').references(() => mst_1.users.id),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=trx.js.map