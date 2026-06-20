"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBatch = processBatch;
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
const logger_util_1 = require("../../shared/utils/logger.util");
const normalizer_1 = require("./normalizer");
// ---------------------------------------------------------------------------
// Main ingest function
// ---------------------------------------------------------------------------
async function processBatch(payload) {
    const fieldId = payload.field_id;
    // 1. Create batch record (source-of-truth entry)
    const [batch] = await client_1.db.insert(schema_1.telemetryBatches).values({
        fieldId,
        gatewayCode: payload.gateway_code,
        batchSize: payload.readings.length,
        rawPayload: payload,
        processingStatus: 'received',
    }).returning();
    const batchId = batch.id;
    let processed = 0, failed = 0, skipped = 0;
    try {
        // 2. Pre-load devices for field  (avoid N queries per reading)
        const fieldDevices = await client_1.db.select().from(mst_1.devices)
            .where((0, drizzle_orm_1.eq)(mst_1.devices.fieldId, fieldId));
        const deviceMap = new Map(fieldDevices.map(d => [d.deviceCode, d]));
        // 3. Pre-load calibrations for relevant devices
        const deviceIds = [...new Set(payload.readings
                .map(r => deviceMap.get(r.device_code)?.id)
                .filter((id) => id !== undefined))];
        const calMap = new Map();
        if (deviceIds.length > 0) {
            const cals = await client_1.db.select().from(mst_1.sensorCalibrations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(mst_1.sensorCalibrations.deviceId, deviceIds), (0, drizzle_orm_1.eq)(mst_1.sensorCalibrations.isActive, true), (0, drizzle_orm_1.sql) `${mst_1.sensorCalibrations.validFrom} <= NOW()`, (0, drizzle_orm_1.sql) `(${mst_1.sensorCalibrations.validUntil} IS NULL OR ${mst_1.sensorCalibrations.validUntil} > NOW())`));
            cals.forEach(c => calMap.set(c.deviceId, c));
        }
        // 4. Pre-load alert configs for field
        const alertConfigs = await client_1.db.select().from(mst_1.alertConfigs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.alertConfigs.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.alertConfigs.isEnabled, true)));
        // 5. Process each reading
        for (const reading of payload.readings) {
            try {
                const device = deviceMap.get(reading.device_code);
                if (!device) {
                    logger_util_1.logger.warn({ deviceCode: reading.device_code, fieldId }, 'Device tidak ditemukan');
                    skipped++;
                    continue;
                }
                const eventTime = reading.timestamp ? new Date(reading.timestamp) : new Date();
                // 5a. INSERT raw_event (never modified — source of truth)
                const [rawEvent] = await client_1.db.insert(schema_1.rawEvents).values({
                    batchId,
                    deviceId: device.id,
                    deviceCode: reading.device_code,
                    eventTimestamp: eventTime,
                    seqNumber: reading.seq_number,
                    rawData: reading.data,
                    isProcessed: false,
                }).returning({ id: schema_1.rawEvents.id });
                // 5b. Apply calibration
                const cal = calMap.get(device.id);
                const offsets = {
                    waterLevelOffsetCm: parseFloat(cal?.waterLevelOffsetCm ?? '0'),
                    temperatureOffsetC: parseFloat(cal?.temperatureOffsetC ?? '0'),
                    humidityOffsetPct: parseFloat(cal?.humidityOffsetPct ?? '0'),
                };
                const norm = (0, normalizer_1.normalizeReading)(reading.data, offsets);
                // 5c. INSERT telemetry_record (TimescaleDB hypertable)
                await client_1.db.insert(schema_1.telemetryRecords).values({
                    id: (0, crypto_1.randomUUID)(),
                    eventTimestamp: eventTime,
                    deviceId: device.id,
                    deviceCode: device.deviceCode,
                    subBlockId: device.subBlockId,
                    rawEventId: rawEvent.id,
                    waterLevelCm: norm.water_level_cm?.toString(),
                    temperatureC: norm.temperature_c?.toString(),
                    humidityPct: norm.humidity_pct?.toString(),
                    batteryPct: norm.battery_pct?.toString(),
                    signalRssi: norm.signal_rssi,
                    calibrationId: cal?.id,
                    waterLevelRawCm: norm.water_level_raw_cm?.toString(),
                    isValid: norm.is_valid,
                    validationNotes: norm.validation_notes,
                });
                // 5d. Mark raw_event processed
                await client_1.db.update(schema_1.rawEvents).set({ isProcessed: true })
                    .where((0, drizzle_orm_1.eq)(schema_1.rawEvents.id, rawEvent.id));
                // 5e. Update device telemetry fields
                await client_1.db.update(mst_1.devices).set({
                    lastSeenAt: eventTime,
                    ...(norm.battery_pct !== null && {
                        batteryLevelPct: norm.battery_pct.toString(),
                        batteryUpdatedAt: eventTime,
                    }),
                    updatedAt: new Date(),
                }).where((0, drizzle_orm_1.eq)(mst_1.devices.id, device.id));
                // 5f. Check alert thresholds (async — don't block response)
                if (norm.is_valid && device.subBlockId) {
                    void checkAlerts({
                        fieldId, subBlockId: device.subBlockId, deviceId: device.id,
                        waterLevelCm: norm.water_level_cm, batteryPct: norm.battery_pct,
                        configs: alertConfigs,
                    });
                }
                processed++;
            }
            catch (readingError) {
                logger_util_1.logger.error({ err: readingError, device: reading.device_code }, 'Processing reading failed');
                failed++;
            }
        }
        // 6. Update batch
        await client_1.db.update(schema_1.telemetryBatches).set({
            processingStatus: failed === payload.readings.length ? 'failed' : 'processed',
            processedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(schema_1.telemetryBatches.id, batchId));
        return { batchId, processed, failed, skipped };
    }
    catch (err) {
        await client_1.db.update(schema_1.telemetryBatches)
            .set({ processingStatus: 'failed', processingError: String(err) })
            .where((0, drizzle_orm_1.eq)(schema_1.telemetryBatches.id, batchId));
        throw err;
    }
}
// ---------------------------------------------------------------------------
// Alert checking (internal)
// ---------------------------------------------------------------------------
async function checkAlerts(params) {
    const { fieldId, subBlockId, deviceId, waterLevelCm, batteryPct, configs } = params;
    for (const cfg of configs) {
        // Skip if config scoped to different sub-block
        if (cfg.subBlockId && cfg.subBlockId !== subBlockId)
            continue;
        if (!cfg.isEnabled)
            continue;
        let triggered = null;
        const threshold = parseFloat(cfg.thresholdValue);
        switch (cfg.alertType) {
            case 'water_level_low':
                if (waterLevelCm !== null && waterLevelCm <= threshold)
                    triggered = waterLevelCm;
                break;
            case 'water_level_high':
                if (waterLevelCm !== null && waterLevelCm >= threshold)
                    triggered = waterLevelCm;
                break;
            case 'battery_low':
                if (batteryPct !== null && batteryPct <= threshold)
                    triggered = batteryPct;
                break;
        }
        if (triggered === null)
            continue;
        // Cooldown check — don't repeat alert within cooldown window
        const cooldownSince = new Date(Date.now() - cfg.cooldownMinutes * 60_000);
        const [existing] = await client_1.db.select({ id: schema_1.telemetryAlerts.id })
            .from(schema_1.telemetryAlerts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.subBlockId, subBlockId), (0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.alertType, cfg.alertType), (0, drizzle_orm_1.eq)(schema_1.telemetryAlerts.isResolved, false), (0, drizzle_orm_1.sql) `${schema_1.telemetryAlerts.triggeredAt} > ${cooldownSince}`))
            .limit(1);
        if (existing)
            continue;
        await client_1.db.insert(schema_1.telemetryAlerts).values({
            fieldId,
            subBlockId,
            deviceId,
            alertType: cfg.alertType,
            severity: cfg.severity,
            triggeredValue: triggered.toString(),
            thresholdValue: cfg.thresholdValue,
            alertMessage: alertMsg(cfg.alertType, triggered, threshold, cfg.thresholdUnit),
        });
        logger_util_1.logger.info({ fieldId, subBlockId, alertType: cfg.alertType, triggered }, 'Alert triggered');
    }
}
function alertMsg(type, val, threshold, unit) {
    const labels = {
        water_level_low: `Level air rendah: ${val} ${unit} (batas: ${threshold} ${unit})`,
        water_level_high: `Level air tinggi: ${val} ${unit} (batas: ${threshold} ${unit})`,
        battery_low: `Baterai sensor rendah: ${val}% (batas: ${threshold}%)`,
    };
    return labels[type] ?? `Alert ${type}: ${val} ${unit}`;
}
//# sourceMappingURL=ingest.service.js.map