"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRuleProfileSchema = exports.CreateRuleProfileSchema = exports.UpdateCropCyclePhaseSchema = exports.CreateCropCycleSchema = exports.CreateFlowPathSchema = exports.CalibrateDeviceSchema = exports.AssignDeviceSchema = exports.UpdateDeviceSchema = exports.CreateDeviceSchema = exports.ImportSubBlocksSchema = exports.UpdateSubBlockSchema = exports.CreateSubBlockSchema = exports.AssignUserFieldSchema = exports.UpdateFieldSchema = exports.CreateFieldSchema = exports.GeoJsonFeatureCollectionSchema = exports.GeoJsonFeatureSchema = exports.GeoJsonPolygonSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// GeoJSON Polygon schema (sesuai RFC 7946)
// Dipakai untuk import sub-block polygons
// ---------------------------------------------------------------------------
const PositionSchema = zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]); // [lng, lat]
const RingSchema = zod_1.z.array(PositionSchema).min(4); // closed ring
exports.GeoJsonPolygonSchema = zod_1.z.object({
    type: zod_1.z.literal('Polygon'),
    coordinates: zod_1.z.array(RingSchema).min(1),
});
exports.GeoJsonFeatureSchema = zod_1.z.object({
    type: zod_1.z.literal('Feature'),
    geometry: exports.GeoJsonPolygonSchema,
    properties: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.GeoJsonFeatureCollectionSchema = zod_1.z.object({
    type: zod_1.z.literal('FeatureCollection'),
    features: zod_1.z.array(exports.GeoJsonFeatureSchema).min(1),
});
// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------
exports.CreateFieldSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    adm4_code: zod_1.z.string().min(1).max(20),
    water_source_type: zod_1.z.enum(['irrigated', 'rainfed', 'lowland']).default('irrigated'),
    area_hectares: zod_1.z.coerce.number().positive().optional(),
    operator_count_default: zod_1.z.coerce.number().int().min(1).max(50).default(1),
    decision_cycle_mode: zod_1.z.enum(['normal', 'siaga']).default('normal'),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.UpdateFieldSchema = exports.CreateFieldSchema.partial();
exports.AssignUserFieldSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid('user_id harus berupa UUID'),
    field_role: zod_1.z.enum(['manager', 'operator', 'viewer']).default('operator'),
});
// ---------------------------------------------------------------------------
// Sub-block schemas
// ---------------------------------------------------------------------------
exports.CreateSubBlockSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    code: zod_1.z.string().max(20).optional(),
    polygon_geom: exports.GeoJsonPolygonSchema,
    elevation_m: zod_1.z.coerce.number().optional(),
    soil_type: zod_1.z.string().max(100).optional(),
    display_order: zod_1.z.coerce.number().int().min(0).default(0),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.UpdateSubBlockSchema = exports.CreateSubBlockSchema.partial();
exports.ImportSubBlocksSchema = zod_1.z.object({
    geojson: exports.GeoJsonFeatureCollectionSchema,
    name_field: zod_1.z.string().default('name'), // property key dalam GeoJSON features
    code_field: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// Device schemas
// ---------------------------------------------------------------------------
exports.CreateDeviceSchema = zod_1.z.object({
    device_code: zod_1.z.string().min(1).max(100),
    device_type: zod_1.z.enum(['awd_water_level', 'weather_station', 'multi_sensor']).default('awd_water_level'),
    connection_type: zod_1.z.enum(['lorawan', 'nb_iot', 'gsm', 'wifi', 'manual']).default('lorawan'),
    hardware_model: zod_1.z.string().max(100).optional(),
    serial_number: zod_1.z.string().max(100).optional(),
    firmware_version: zod_1.z.string().max(50).optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.UpdateDeviceSchema = exports.CreateDeviceSchema.partial();
exports.AssignDeviceSchema = zod_1.z.object({
    sub_block_id: zod_1.z.string().uuid('sub_block_id harus berupa UUID'),
    notes: zod_1.z.string().max(500).optional(),
});
exports.CalibrateDeviceSchema = zod_1.z.object({
    water_level_offset_cm: zod_1.z.coerce.number().optional().default(0),
    temperature_offset_c: zod_1.z.coerce.number().optional().default(0),
    humidity_offset_pct: zod_1.z.coerce.number().optional().default(0),
    valid_from: zod_1.z.string().datetime().optional(),
    valid_until: zod_1.z.string().datetime().optional(),
    calibration_method: zod_1.z.enum(['field_measurement', 'lab_calibration', 'manufacturer']).default('field_measurement'),
    reference_reading_cm: zod_1.z.coerce.number().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
// ---------------------------------------------------------------------------
// Flow path schemas
// ---------------------------------------------------------------------------
exports.CreateFlowPathSchema = zod_1.z.object({
    from_sub_block_id: zod_1.z.string().uuid(),
    to_sub_block_id: zod_1.z.string().uuid(),
    flow_type: zod_1.z.enum(['natural', 'pipe', 'canal', 'pump']).default('natural'),
    notes: zod_1.z.string().max(500).optional(),
});
// ---------------------------------------------------------------------------
// Crop cycle schemas
// ---------------------------------------------------------------------------
exports.CreateCropCycleSchema = zod_1.z.object({
    bucket_code: zod_1.z.enum(['early', 'medium_early', 'medium', 'medium_late', 'late']),
    variety_name: zod_1.z.string().max(200).optional(),
    rule_profile_id: zod_1.z.string().uuid().optional(),
    planting_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
    expected_harvest_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.UpdateCropCyclePhaseSchema = zod_1.z.object({
    current_phase_code: zod_1.z.enum([
        'land_prep', 'nursery', 'transplanting',
        'vegetative_early', 'vegetative_late',
        'reproductive', 'ripening', 'harvesting', 'harvested',
    ]),
    rule_profile_id: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
// ---------------------------------------------------------------------------
// Rule profile schemas
// ---------------------------------------------------------------------------
exports.CreateRuleProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    bucket_code: zod_1.z.string().min(1),
    phase_code: zod_1.z.string().min(1),
    awd_lower_threshold_cm: zod_1.z.coerce.number(),
    awd_upper_target_cm: zod_1.z.coerce.number(),
    drought_alert_cm: zod_1.z.coerce.number().optional(),
    min_saturation_days: zod_1.z.coerce.number().int().min(0).default(1),
    rain_delay_mm: zod_1.z.coerce.number().min(0).default(10),
    priority_weight: zod_1.z.coerce.number().min(0).max(5).default(1),
    rainfed_modifier_pct: zod_1.z.coerce.number().default(0),
    target_confidence: zod_1.z.enum(['high', 'medium', 'low']).default('high'),
    is_default: zod_1.z.boolean().default(false),
});
exports.UpdateRuleProfileSchema = exports.CreateRuleProfileSchema.partial();
//# sourceMappingURL=master-data.schema.js.map