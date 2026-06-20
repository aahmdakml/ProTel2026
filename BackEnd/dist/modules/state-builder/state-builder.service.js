"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFieldStates = buildFieldStates;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
const logger_util_1 = require("../../shared/utils/logger.util");
const estimator_1 = require("./estimator");
// ---------------------------------------------------------------------------
// Freshness thresholds
// ---------------------------------------------------------------------------
const FRESH_MS = 2 * 60 * 60 * 1000; // < 2 jam    → fresh
const STALE_MS = 8 * 60 * 60 * 1000; // 2-8 jam    → stale
function getFreshness(lastSeenAt) {
    if (!lastSeenAt)
        return 'no_data';
    const age = Date.now() - lastSeenAt.getTime();
    if (age < FRESH_MS)
        return 'fresh';
    if (age < STALE_MS)
        return 'stale';
    return 'no_data';
}
async function buildSubBlockState(subBlockId, fieldId) {
    // 1. Get latest valid telemetry from devices assigned to this sub-block
    const [latest] = await client_1.db
        .select({
        id: schema_1.telemetryRecords.id,
        waterLevelCm: schema_1.telemetryRecords.waterLevelCm,
        waterLevelRawCm: schema_1.telemetryRecords.waterLevelRawCm,
        temperatureC: schema_1.telemetryRecords.temperatureC,
        humidityPct: schema_1.telemetryRecords.humidityPct,
        eventTimestamp: schema_1.telemetryRecords.eventTimestamp,
    })
        .from(schema_1.telemetryRecords)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.telemetryRecords.subBlockId, subBlockId), (0, drizzle_orm_1.eq)(schema_1.telemetryRecords.isValid, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.telemetryRecords.eventTimestamp))
        .limit(1);
    const freshness = getFreshness(latest?.eventTimestamp ?? null);
    // 2. If we have observed data
    if (latest && freshness !== 'no_data') {
        return {
            subBlockId,
            fieldId,
            waterLevelCm: latest.waterLevelCm !== null ? parseFloat(latest.waterLevelCm) : null,
            waterLevelRawCm: latest.waterLevelRawCm !== null ? parseFloat(latest.waterLevelRawCm) : null,
            temperatureC: latest.temperatureC !== null ? parseFloat(latest.temperatureC) : null,
            humidityPct: latest.humidityPct !== null ? parseFloat(latest.humidityPct) : null,
            stateSource: 'observed',
            freshnessStatus: freshness,
            lastObservationAt: latest.eventTimestamp,
            interpolationConfidence: null,
            recordId: latest.id,
        };
    }
    // 3. No fresh data → try neighbor estimation
    const estimate = await (0, estimator_1.estimateFromNeighbors)(subBlockId);
    if (estimate) {
        return {
            subBlockId,
            fieldId,
            waterLevelCm: estimate.waterLevelCm,
            waterLevelRawCm: null,
            temperatureC: null,
            humidityPct: null,
            stateSource: 'estimated',
            freshnessStatus: 'no_data',
            lastObservationAt: latest?.eventTimestamp ?? null,
            interpolationConfidence: estimate.interpolationConfidence,
            recordId: null,
        };
    }
    // 4. No data at all
    return {
        subBlockId,
        fieldId,
        waterLevelCm: null,
        waterLevelRawCm: null,
        temperatureC: null,
        humidityPct: null,
        stateSource: 'no_data',
        freshnessStatus: 'no_data',
        lastObservationAt: null,
        interpolationConfidence: null,
        recordId: null,
    };
}
// ---------------------------------------------------------------------------
// Build state for all sub-blocks in a field
// ---------------------------------------------------------------------------
async function buildFieldStates(fieldId) {
    const subBlocks = await client_1.db
        .select({ id: mst_1.subBlocks.id })
        .from(mst_1.subBlocks)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.subBlocks.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.subBlocks.isActive, true)));
    if (subBlocks.length === 0)
        return 0;
    let updated = 0;
    const now = new Date();
    for (const sb of subBlocks) {
        try {
            const state = await buildSubBlockState(sb.id, fieldId);
            // 1. History Record (trx.sub_block_states)
            await client_1.db.insert(schema_1.subBlockStates).values({
                subBlockId: state.subBlockId,
                fieldId: state.fieldId,
                stateTime: state.lastObservationAt ?? now,
                waterLevelCm: state.waterLevelCm?.toFixed(2),
                waterLevelTrend: 'stable', // placeholder logic
                stateSource: state.stateSource,
                freshnessStatus: state.freshnessStatus,
                lastObservationAt: state.lastObservationAt,
                interpolationConfidence: state.interpolationConfidence?.toFixed(2),
            });
            // 2. Current State (trx.sub_block_current_states) — Upsert
            await client_1.db.insert(schema_1.subBlockCurrentStates).values({
                subBlockId: state.subBlockId,
                fieldId: state.fieldId,
                stateTime: state.lastObservationAt ?? now,
                waterLevelCm: state.waterLevelCm?.toFixed(2),
                stateSource: state.stateSource,
                freshnessStatus: state.freshnessStatus,
                lastObservationAt: state.lastObservationAt,
                interpolationConfidence: state.interpolationConfidence?.toFixed(2),
                updatedAt: now,
            }).onConflictDoUpdate({
                target: schema_1.subBlockCurrentStates.subBlockId,
                set: {
                    stateTime: state.lastObservationAt ?? now,
                    waterLevelCm: state.waterLevelCm?.toFixed(2),
                    stateSource: state.stateSource,
                    freshnessStatus: state.freshnessStatus,
                    lastObservationAt: state.lastObservationAt,
                    interpolationConfidence: state.interpolationConfidence?.toFixed(2),
                    updatedAt: now,
                },
            });
            updated++;
        }
        catch (err) {
            logger_util_1.logger.error({ err, subBlockId: sb.id }, 'State builder failed for sub-block');
        }
    }
    logger_util_1.logger.debug({ fieldId, updated }, 'State builder complete');
    return updated;
}
//# sourceMappingURL=state-builder.service.js.map