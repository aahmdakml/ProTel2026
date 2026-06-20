"use strict";
// ---------------------------------------------------------------------------
// BMKG API TypeScript interfaces
// Ref: https://api.bmkg.go.id
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBmkgCategory = getBmkgCategory;
exports.parseTimeSlot = parseTimeSlot;
// ---------------------------------------------------------------------------
// Weather code → BMKG category mapping
// ---------------------------------------------------------------------------
const WEATHER_CATEGORIES = {
    0: 'cerah',
    1: 'cerah_berawan',
    2: 'cerah_berawan',
    3: 'berawan',
    4: 'berawan_tebal',
    10: 'asap',
    45: 'kabut',
    60: 'hujan_ringan',
    61: 'hujan_ringan',
    63: 'hujan_sedang',
    65: 'hujan_lebat',
    80: 'hujan_lokal',
    95: 'hujan_petir',
    97: 'hujan_petir_lebat',
};
function getBmkgCategory(weatherCode) {
    if (weatherCode === undefined)
        return null;
    return WEATHER_CATEGORIES[weatherCode] ?? null;
}
/** Parse satu time slot dari BMKG ke format normalized */
function parseTimeSlot(slot) {
    if (!slot.local_datetime)
        return null;
    // Parse "2024-06-01 18:00:00" → Date
    const validFrom = new Date(slot.local_datetime.replace(' ', 'T') + '+07:00');
    if (isNaN(validFrom.getTime()))
        return null;
    // Forecast valid window: 3 hours per slot
    const validUntil = new Date(validFrom.getTime() + 3 * 60 * 60 * 1000);
    return {
        forecastValidFrom: validFrom,
        forecastValidUntil: validUntil,
        temperatureC: slot.t ?? null,
        humidityPct: slot.hu ?? null,
        precipitationMm: slot.tp ?? null, // undocumented field
        windSpeedKmh: slot.ws ?? null,
        windDirection: slot.wd_to ?? null,
        weatherCode: slot.weather ?? null,
        weatherDesc: slot.weather_desc ?? null,
        bmkgCategory: getBmkgCategory(slot.weather),
    };
}
//# sourceMappingURL=bmkg.types.js.map