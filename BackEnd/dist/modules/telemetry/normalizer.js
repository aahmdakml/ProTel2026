"use strict";
// ---------------------------------------------------------------------------
// Pure normalizer — no DB calls, fully unit-testable
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeReading = normalizeReading;
// Batas valid masing-masing sensor
const RANGES = {
    water_level: { min: -100, max: 100 }, // cm dari permukaan tanah
    temperature: { min: -10, max: 70 }, // °C
    humidity: { min: 0, max: 100 }, // %
    battery: { min: 0, max: 100 }, // %
};
const ZERO_OFFSETS = {
    waterLevelOffsetCm: 0,
    temperatureOffsetC: 0,
    humidityOffsetPct: 0,
};
/**
 * Normalize raw sensor reading, apply calibration offsets, validate ranges.
 *
 * @param raw     - raw payload dari device
 * @param offsets - kalibrasi aktif (default: zero offset)
 */
function normalizeReading(raw, offsets = ZERO_OFFSETS) {
    const issues = [];
    // Apply calibration offset
    const wl_raw = raw.water_level_cm ?? null;
    const wl = wl_raw !== null ? r2(wl_raw + offsets.waterLevelOffsetCm) : null;
    const temp = raw.temperature_c !== undefined ? r2(raw.temperature_c + offsets.temperatureOffsetC) : null;
    const humidity = raw.humidity_pct !== undefined ? r2(raw.humidity_pct + offsets.humidityOffsetPct) : null;
    const battery = raw.battery_pct ?? null;
    const rssi = raw.signal_rssi ?? null;
    // Validate — hanya water_level yang mem-fail is_valid
    let is_valid = true;
    if (wl !== null) {
        if (wl < RANGES.water_level.min || wl > RANGES.water_level.max) {
            is_valid = false;
            issues.push(`water_level_cm=${wl} di luar rentang [${RANGES.water_level.min}..${RANGES.water_level.max}]`);
        }
    }
    if (temp !== null && (temp < RANGES.temperature.min || temp > RANGES.temperature.max)) {
        issues.push(`temperature_c=${temp} di luar rentang`);
    }
    if (humidity !== null && (humidity < RANGES.humidity.min || humidity > RANGES.humidity.max)) {
        issues.push(`humidity_pct=${humidity} di luar rentang`);
    }
    if (battery !== null && (battery < RANGES.battery.min || battery > RANGES.battery.max)) {
        issues.push(`battery_pct=${battery} tidak valid`);
    }
    return {
        water_level_cm: wl,
        water_level_raw_cm: wl_raw,
        temperature_c: temp,
        humidity_pct: humidity,
        battery_pct: battery,
        signal_rssi: rssi,
        is_valid,
        validation_notes: issues.length > 0 ? issues.join('; ') : null,
    };
}
/** Round ke 2 desimal */
function r2(n) {
    return Math.round(n * 100) / 100;
}
//# sourceMappingURL=normalizer.js.map