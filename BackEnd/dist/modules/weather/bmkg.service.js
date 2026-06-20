"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncFieldForecast = syncFieldForecast;
exports.syncAllForecasts = syncAllForecasts;
exports.getLatestForecast = getLatestForecast;
exports.getActiveWarnings = getActiveWarnings;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
const logger_util_1 = require("../../shared/utils/logger.util");
const bmkg_types_1 = require("./bmkg.types");
// ---------------------------------------------------------------------------
// BMKG API constants
// ---------------------------------------------------------------------------
const BMKG_FORECAST_URL = 'https://api.bmkg.go.id/publik/prakiraan/cuaca';
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'SmartAWD-Backend/1.0 (research/precision-agriculture)';
// ---------------------------------------------------------------------------
// Fetch & store forecast for one field
// ---------------------------------------------------------------------------
async function syncFieldForecast(field) {
    const startedAt = Date.now();
    let responseStatus;
    try {
        const url = `${BMKG_FORECAST_URL}?adm4=${encodeURIComponent(field.adm4Code)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        responseStatus = res.status;
        if (!res.ok) {
            throw new Error(`BMKG returned HTTP ${res.status} for adm4=${field.adm4Code}`);
        }
        const json = await res.json();
        // Parse forecast slots
        const dataEntry = json.data?.[0];
        if (!dataEntry) {
            logger_util_1.logger.warn({ adm4Code: field.adm4Code }, 'BMKG: empty data array');
            return;
        }
        const slots = dataEntry.cuaca.flat(); // flatten day-groups
        const parsed = slots.map(bmkg_types_1.parseTimeSlot).filter(Boolean);
        if (parsed.length === 0) {
            logger_util_1.logger.warn({ adm4Code: field.adm4Code }, 'BMKG: no parseable time slots');
            return;
        }
        // Determine coverage window
        const validFrom = parsed[0].forecastValidFrom;
        const validUntil = parsed[parsed.length - 1].forecastValidUntil;
        // Find next 24-hour precipitation total
        const now = new Date();
        const next24h = parsed.filter((s) => !!s && s.forecastValidFrom >= now && s.forecastValidFrom < new Date(Date.now() + 24 * 3_600_000));
        const precipNext24h = next24h.reduce((sum, s) => sum + (s.precipitationMm ?? 0), 0);
        // Get the nearest slot
        const nearest = (parsed.find((s) => !!s && s.forecastValidFrom >= now) ?? parsed[0]);
        // INSERT snapshot
        await client_1.db.update(schema_1.weatherForecastSnapshots)
            .set({ isLatest: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.weatherForecastSnapshots.fieldId, field.id), (0, drizzle_orm_1.eq)(schema_1.weatherForecastSnapshots.isLatest, true)));
        await client_1.db.insert(schema_1.weatherForecastSnapshots).values({
            fieldId: field.id,
            adm4Code: field.adm4Code,
            forecastValidFrom: validFrom,
            forecastValidUntil: validUntil,
            precipitationMm: precipNext24h > 0 ? precipNext24h.toFixed(2) : '0',
            temperatureC: nearest.temperatureC?.toFixed(2) ?? null,
            humidityPct: nearest.humidityPct?.toFixed(2) ?? null,
            weatherCode: nearest.weatherCode ? Number(nearest.weatherCode) : null,
            weatherDesc: nearest.weatherDesc ?? null,
            bmkgCategory: nearest.bmkgCategory ?? null,
            isLatest: true,
            fetchedAt: new Date(),
        });
        logger_util_1.logger.info({ fieldName: field.name, adm4Code: field.adm4Code, slots: parsed.length, precipNext24h }, 'BMKG forecast synced');
        await logIntegration({ action: 'forecast_sync', status: 'success', url: BMKG_FORECAST_URL,
            responseStatus, responseTimeMs: Date.now() - startedAt });
    }
    catch (err) {
        logger_util_1.logger.error({ err, adm4Code: field.adm4Code }, 'BMKG forecast sync failed');
        await logIntegration({ action: 'forecast_sync', status: 'failed', url: BMKG_FORECAST_URL,
            responseStatus, responseTimeMs: Date.now() - startedAt, error: String(err) });
    }
}
// ---------------------------------------------------------------------------
// Sync all active fields
// ---------------------------------------------------------------------------
async function syncAllForecasts() {
    const activeFields = await client_1.db
        .select({ id: mst_1.fields.id, adm4Code: mst_1.fields.adm4Code, name: mst_1.fields.name })
        .from(mst_1.fields)
        .where((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true));
    logger_util_1.logger.info({ count: activeFields.length }, 'Starting BMKG forecast sync');
    for (const field of activeFields) {
        if (!field.adm4Code)
            continue;
        await syncFieldForecast(field);
        // Rate limit: BMKG allows 60 req/min → 1 req/sec is safe
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}
// ---------------------------------------------------------------------------
// Get latest forecast for DSS (used by engine-client)
// ---------------------------------------------------------------------------
async function getLatestForecast(fieldId) {
    const [latest] = await client_1.db
        .select()
        .from(schema_1.weatherForecastSnapshots)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.weatherForecastSnapshots.fieldId, fieldId), (0, drizzle_orm_1.eq)(schema_1.weatherForecastSnapshots.isLatest, true)))
        .limit(1);
    return latest ?? null;
}
// ---------------------------------------------------------------------------
// Get active warnings for DSS (placeholder — BMKG warning API varies)
// ---------------------------------------------------------------------------
async function getActiveWarnings(fieldId) {
    const now = new Date();
    return client_1.db
        .select()
        .from(schema_1.weatherWarningSnapshots)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.weatherWarningSnapshots.fieldId, fieldId), (0, drizzle_orm_1.eq)(schema_1.weatherWarningSnapshots.isActive, true), (0, drizzle_orm_1.sql) `(${schema_1.weatherWarningSnapshots.warningExpiresAt} IS NULL OR ${schema_1.weatherWarningSnapshots.warningExpiresAt} > ${now})`));
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function logIntegration(params) {
    try {
        await client_1.db.insert(schema_1.integrationLogs).values({
            integrationName: 'bmkg',
            action: params.action,
            status: params.status,
            requestUrl: params.url,
            responseStatus: params.responseStatus,
            responseTimeMs: params.responseTimeMs,
            errorMessage: params.error,
        });
    }
    catch { /* non-critical */ }
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=bmkg.service.js.map