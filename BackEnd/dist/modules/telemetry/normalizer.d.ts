/** Raw sensor data dari device gateway */
export interface RawSensorData {
    water_level_cm?: number;
    temperature_c?: number;
    humidity_pct?: number;
    battery_pct?: number;
    signal_rssi?: number;
    [key: string]: unknown;
}
/** Calibration offsets dari mst.sensor_calibrations */
export interface CalibrationOffsets {
    waterLevelOffsetCm: number;
    temperatureOffsetC: number;
    humidityOffsetPct: number;
}
/** Hasil normalisasi — siap masuk ke trx.telemetry_records */
export interface NormalizedReading {
    water_level_cm: number | null;
    water_level_raw_cm: number | null;
    temperature_c: number | null;
    humidity_pct: number | null;
    battery_pct: number | null;
    signal_rssi: number | null;
    is_valid: boolean;
    validation_notes: string | null;
}
/**
 * Normalize raw sensor reading, apply calibration offsets, validate ranges.
 *
 * @param raw     - raw payload dari device
 * @param offsets - kalibrasi aktif (default: zero offset)
 */
export declare function normalizeReading(raw: RawSensorData, offsets?: CalibrationOffsets): NormalizedReading;
//# sourceMappingURL=normalizer.d.ts.map