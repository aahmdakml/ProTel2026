"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchPayloadSchema = exports.ReadingSchema = exports.SensorDataSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Schema untuk POST /ingest/batch
// ---------------------------------------------------------------------------
exports.SensorDataSchema = zod_1.z.object({
    water_level_cm: zod_1.z.number().optional(),
    temperature_c: zod_1.z.number().optional(),
    humidity_pct: zod_1.z.number().optional(),
    battery_pct: zod_1.z.number().min(0).max(100).optional(),
    signal_rssi: zod_1.z.number().int().optional(),
}).passthrough(); // simpan field extra di raw_data
exports.ReadingSchema = zod_1.z.object({
    device_code: zod_1.z.string().min(1).max(100),
    timestamp: zod_1.z.string().datetime({ offset: true }).optional(), // ISO 8601 with tz
    seq_number: zod_1.z.coerce.number().int().optional(),
    data: exports.SensorDataSchema,
});
exports.BatchPayloadSchema = zod_1.z.object({
    field_id: zod_1.z.string().uuid('field_id harus berupa UUID'),
    gateway_code: zod_1.z.string().max(100).optional(),
    readings: zod_1.z.array(exports.ReadingSchema).min(1).max(100),
});
//# sourceMappingURL=ingest.schema.js.map