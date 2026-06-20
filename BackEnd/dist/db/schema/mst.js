"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLayers = exports.cropCycles = exports.irrigationRuleProfiles = exports.alertConfigs = exports.sensorCalibrations = exports.deviceAssignments = exports.devices = exports.flowPaths = exports.subBlocks = exports.userFields = exports.fields = exports.users = exports.growthPhases = exports.riceDurationBuckets = exports.mst = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const geometry_1 = require("../geometry");
exports.mst = (0, pg_core_1.pgSchema)('mst');
// ---------------------------------------------------------------------------
// mst.rice_duration_buckets
// ---------------------------------------------------------------------------
exports.riceDurationBuckets = exports.mst.table('rice_duration_buckets', {
    bucketCode: (0, pg_core_1.text)('bucket_code').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull(),
    hstMin: (0, pg_core_1.integer)('hst_min').notNull(),
    hstMax: (0, pg_core_1.integer)('hst_max').notNull(),
    description: (0, pg_core_1.text)('description'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.growth_phases
// ---------------------------------------------------------------------------
exports.growthPhases = exports.mst.table('growth_phases', {
    phaseCode: (0, pg_core_1.text)('phase_code').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull(),
    phaseOrder: (0, pg_core_1.integer)('phase_order').notNull(),
    description: (0, pg_core_1.text)('description'),
    isDssActive: (0, pg_core_1.boolean)('is_dss_active').notNull().default(true),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.users
// ---------------------------------------------------------------------------
exports.users = exports.mst.table('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    fullName: (0, pg_core_1.text)('full_name').notNull(),
    systemRole: (0, pg_core_1.text)('system_role').notNull().default('operator'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.fields
// ---------------------------------------------------------------------------
exports.fields = exports.mst.table('fields', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    adm4Code: (0, pg_core_1.text)('adm4_code').notNull(),
    waterSourceType: (0, pg_core_1.text)('water_source_type').notNull().default('irrigated'),
    areaHectares: (0, pg_core_1.numeric)('area_hectares', { precision: 8, scale: 4 }),
    operatorCountDefault: (0, pg_core_1.integer)('operator_count_default').notNull().default(1),
    decisionCycleMode: (0, pg_core_1.text)('decision_cycle_mode').notNull().default('normal'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    notes: (0, pg_core_1.text)('notes'),
    mapVisualUrl: (0, pg_core_1.text)('map_visual_url'),
    mapBounds: (0, pg_core_1.jsonb)('map_bounds'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.user_fields
// ---------------------------------------------------------------------------
exports.userFields = exports.mst.table('user_fields', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'cascade' }),
    fieldRole: (0, pg_core_1.text)('field_role').notNull().default('operator'),
    grantedAt: (0, pg_core_1.timestamp)('granted_at', { withTimezone: true }).notNull().defaultNow(),
    grantedBy: (0, pg_core_1.uuid)('granted_by').references(() => exports.users.id),
});
// ---------------------------------------------------------------------------
// mst.sub_blocks
// ---------------------------------------------------------------------------
exports.subBlocks = exports.mst.table('sub_blocks', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'restrict' }),
    name: (0, pg_core_1.text)('name').notNull(),
    code: (0, pg_core_1.text)('code'),
    polygonGeom: (0, geometry_1.geometryPolygon)('polygon_geom').notNull(),
    // Generated columns (read-only — PostgreSQL generates these dari polygonGeom)
    areaM2: (0, pg_core_1.numeric)('area_m2', { precision: 12, scale: 2 }),
    centroid: (0, geometry_1.geometryPoint)('centroid'),
    elevationM: (0, pg_core_1.numeric)('elevation_m', { precision: 7, scale: 2 }),
    soilType: (0, pg_core_1.text)('soil_type'),
    displayOrder: (0, pg_core_1.integer)('display_order').notNull().default(0),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.flow_paths
// ---------------------------------------------------------------------------
exports.flowPaths = exports.mst.table('flow_paths', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fromSubBlockId: (0, pg_core_1.uuid)('from_sub_block_id').notNull().references(() => exports.subBlocks.id, { onDelete: 'restrict' }),
    toSubBlockId: (0, pg_core_1.uuid)('to_sub_block_id').notNull().references(() => exports.subBlocks.id, { onDelete: 'restrict' }),
    flowType: (0, pg_core_1.text)('flow_type').notNull().default('natural'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.devices
// ---------------------------------------------------------------------------
exports.devices = exports.mst.table('devices', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    deviceCode: (0, pg_core_1.text)('device_code').notNull().unique(),
    deviceType: (0, pg_core_1.text)('device_type').notNull().default('awd_water_level'),
    connectionType: (0, pg_core_1.text)('connection_type').notNull().default('lorawan'),
    hardwareModel: (0, pg_core_1.text)('hardware_model'),
    serialNumber: (0, pg_core_1.text)('serial_number'),
    firmwareVersion: (0, pg_core_1.text)('firmware_version'),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'restrict' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').references(() => exports.subBlocks.id, { onDelete: 'set null' }),
    status: (0, pg_core_1.text)('status').notNull().default('active'),
    batteryLevelPct: (0, pg_core_1.numeric)('battery_level_pct', { precision: 5, scale: 2 }),
    batteryUpdatedAt: (0, pg_core_1.timestamp)('battery_updated_at', { withTimezone: true }),
    installedAt: (0, pg_core_1.timestamp)('installed_at', { withTimezone: true }),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.device_assignments
// ---------------------------------------------------------------------------
exports.deviceAssignments = exports.mst.table('device_assignments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    deviceId: (0, pg_core_1.uuid)('device_id').notNull().references(() => exports.devices.id, { onDelete: 'restrict' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').notNull().references(() => exports.subBlocks.id, { onDelete: 'restrict' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'restrict' }),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    unassignedAt: (0, pg_core_1.timestamp)('unassigned_at', { withTimezone: true }),
    assignedBy: (0, pg_core_1.uuid)('assigned_by').references(() => exports.users.id),
    unassignedBy: (0, pg_core_1.uuid)('unassigned_by').references(() => exports.users.id),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.sensor_calibrations
// ---------------------------------------------------------------------------
exports.sensorCalibrations = exports.mst.table('sensor_calibrations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    deviceId: (0, pg_core_1.uuid)('device_id').notNull().references(() => exports.devices.id, { onDelete: 'restrict' }),
    validFrom: (0, pg_core_1.timestamp)('valid_from', { withTimezone: true }).notNull().defaultNow(),
    validUntil: (0, pg_core_1.timestamp)('valid_until', { withTimezone: true }),
    waterLevelOffsetCm: (0, pg_core_1.numeric)('water_level_offset_cm', { precision: 6, scale: 2 }).notNull().default('0.00'),
    temperatureOffsetC: (0, pg_core_1.numeric)('temperature_offset_c', { precision: 4, scale: 2 }).notNull().default('0.00'),
    humidityOffsetPct: (0, pg_core_1.numeric)('humidity_offset_pct', { precision: 4, scale: 2 }).notNull().default('0.00'),
    calibrationMethod: (0, pg_core_1.text)('calibration_method').notNull().default('field_measurement'),
    referenceReadingCm: (0, pg_core_1.numeric)('reference_reading_cm', { precision: 7, scale: 2 }),
    calibratedBy: (0, pg_core_1.uuid)('calibrated_by').references(() => exports.users.id),
    notes: (0, pg_core_1.text)('notes'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.alert_configs
// ---------------------------------------------------------------------------
exports.alertConfigs = exports.mst.table('alert_configs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').references(() => exports.fields.id, { onDelete: 'cascade' }),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').references(() => exports.subBlocks.id, { onDelete: 'cascade' }),
    alertType: (0, pg_core_1.text)('alert_type').notNull(),
    thresholdValue: (0, pg_core_1.numeric)('threshold_value', { precision: 10, scale: 3 }).notNull(),
    thresholdUnit: (0, pg_core_1.text)('threshold_unit').notNull(),
    severity: (0, pg_core_1.text)('severity').notNull().default('warning'),
    cooldownMinutes: (0, pg_core_1.integer)('cooldown_minutes').notNull().default(60),
    isEnabled: (0, pg_core_1.boolean)('is_enabled').notNull().default(true),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.irrigation_rule_profiles
// ---------------------------------------------------------------------------
exports.irrigationRuleProfiles = exports.mst.table('irrigation_rule_profiles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    bucketCode: (0, pg_core_1.text)('bucket_code').notNull().references(() => exports.riceDurationBuckets.bucketCode),
    phaseCode: (0, pg_core_1.text)('phase_code').notNull().references(() => exports.growthPhases.phaseCode),
    awdLowerThresholdCm: (0, pg_core_1.numeric)('awd_lower_threshold_cm', { precision: 6, scale: 2 }).notNull(),
    awdUpperTargetCm: (0, pg_core_1.numeric)('awd_upper_target_cm', { precision: 6, scale: 2 }).notNull(),
    droughtAlertCm: (0, pg_core_1.numeric)('drought_alert_cm', { precision: 6, scale: 2 }),
    minSaturationDays: (0, pg_core_1.integer)('min_saturation_days').notNull().default(1),
    rainfedModifierPct: (0, pg_core_1.numeric)('rainfed_modifier_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    priorityWeight: (0, pg_core_1.numeric)('priority_weight', { precision: 5, scale: 3 }).notNull().default('1.000'),
    rainDelayMm: (0, pg_core_1.numeric)('rain_delay_mm', { precision: 6, scale: 2 }).notNull().default('10.0'),
    targetConfidence: (0, pg_core_1.text)('target_confidence').notNull().default('high'),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.crop_cycles
// ---------------------------------------------------------------------------
exports.cropCycles = exports.mst.table('crop_cycles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    subBlockId: (0, pg_core_1.uuid)('sub_block_id').notNull().references(() => exports.subBlocks.id, { onDelete: 'restrict' }),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'restrict' }),
    bucketCode: (0, pg_core_1.text)('bucket_code').notNull().references(() => exports.riceDurationBuckets.bucketCode),
    varietyName: (0, pg_core_1.text)('variety_name'),
    ruleProfileId: (0, pg_core_1.uuid)('rule_profile_id').references(() => exports.irrigationRuleProfiles.id, { onDelete: 'set null' }),
    plantingDate: (0, pg_core_1.text)('planting_date').notNull(), // DATE stored as text for simplicity
    expectedHarvestDate: (0, pg_core_1.text)('expected_harvest_date'),
    actualHarvestDate: (0, pg_core_1.text)('actual_harvest_date'),
    currentPhaseCode: (0, pg_core_1.text)('current_phase_code').notNull().default('land_prep').references(() => exports.growthPhases.phaseCode),
    currentHst: (0, pg_core_1.integer)('current_hst').notNull().default(0),
    status: (0, pg_core_1.text)('status').notNull().default('active'),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ---------------------------------------------------------------------------
// mst.map_layers
// ---------------------------------------------------------------------------
exports.mapLayers = exports.mst.table('map_layers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fieldId: (0, pg_core_1.uuid)('field_id').notNull().references(() => exports.fields.id, { onDelete: 'restrict' }),
    name: (0, pg_core_1.text)('name').notNull(),
    layerType: (0, pg_core_1.text)('layer_type').notNull().default('orthomosaic'),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(false),
    displayOrder: (0, pg_core_1.integer)('display_order').notNull().default(0),
    rawStorageKey: (0, pg_core_1.text)('raw_storage_key'),
    cogStorageKey: (0, pg_core_1.text)('cog_storage_key'),
    fileSizeBytes: (0, pg_core_1.integer)('file_size_bytes'), // bigint → integer for drizzle simplicity
    pixelResolutionM: (0, pg_core_1.numeric)('pixel_resolution_m', { precision: 8, scale: 4 }),
    captureDate: (0, pg_core_1.text)('capture_date'),
    uploadStatus: (0, pg_core_1.text)('upload_status').notNull().default('uploaded'),
    processingError: (0, pg_core_1.text)('processing_error'),
    uploadedBy: (0, pg_core_1.uuid)('uploaded_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=mst.js.map