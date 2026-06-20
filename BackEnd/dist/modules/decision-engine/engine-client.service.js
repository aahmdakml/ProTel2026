"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecisionCycleForField = runDecisionCycleForField;
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
const bmkg_service_1 = require("../../modules/weather/bmkg.service");
const state_builder_service_1 = require("../../modules/state-builder/state-builder.service");
const config_1 = require("../../config");
const logger_util_1 = require("../../shared/utils/logger.util");
// ---------------------------------------------------------------------------
// Main function: run one decision cycle for a field
// ---------------------------------------------------------------------------
async function runDecisionCycleForField(fieldId, cycleMode) {
    const jobId = (0, crypto_1.randomUUID)();
    // 1. Create decision_job record
    await client_1.db.insert(schema_1.decisionJobs).values({
        id: jobId,
        fieldId,
        cycleMode,
        status: 'pending',
        startedAt: new Date(),
    });
    try {
        logger_util_1.logger.info({ jobId, fieldId, cycleMode }, 'Decision cycle starting');
        // 2. Refresh state for all sub-blocks (fresh data before evaluation)
        await (0, state_builder_service_1.buildFieldStates)(fieldId);
        // 3. Load all active sub-blocks with full context
        const subBlocks = await client_1.db
            .select({
            id: mst_1.subBlocks.id,
            code: mst_1.subBlocks.code,
            waterSourceType: (0, drizzle_orm_1.sql) `'irrigated'`, // from field, simplified
        })
            .from(mst_1.subBlocks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.subBlocks.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.subBlocks.isActive, true)));
        if (subBlocks.length === 0) {
            await client_1.db.update(schema_1.decisionJobs).set({ status: 'skipped', completedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.decisionJobs.id, jobId));
            return;
        }
        // 4. Load current states
        const stateRows = await client_1.db.select().from(schema_1.subBlockCurrentStates)
            .where((0, drizzle_orm_1.eq)(schema_1.subBlockCurrentStates.fieldId, fieldId));
        const stateMap = new Map(stateRows.map(s => [s.subBlockId, s]));
        // 5. Load active crop cycles
        const cycles = await client_1.db.select().from(mst_1.cropCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.cropCycles.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.cropCycles.status, 'active')));
        const cycleMap = new Map(cycles.map(c => [c.subBlockId, c]));
        // 6. Load rule profiles (merge: crop-cycle specific → default)
        const ruleIds = [...new Set(cycles.map(c => c.ruleProfileId).filter(Boolean))];
        const ruleMap = new Map();
        if (ruleIds.length > 0) {
            const rules = await client_1.db.select().from(mst_1.irrigationRuleProfiles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${mst_1.irrigationRuleProfiles.id} = ANY(${ruleIds})`, (0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.isActive, true)));
            rules.forEach(r => ruleMap.set(r.id, r));
        }
        // 7. Load management flags (active now)
        const flagRows = await client_1.db.select().from(schema_1.managementEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.managementEvents.fieldId, fieldId), (0, drizzle_orm_1.sql) `${schema_1.managementEvents.flagExpiresAt} > NOW()`));
        const flagMap = new Map();
        flagRows.forEach(f => {
            if (!f.subBlockId)
                return;
            const arr = flagMap.get(f.subBlockId) ?? [];
            arr.push(f);
            flagMap.set(f.subBlockId, arr);
        });
        // 8. Load flow paths for field
        const allFlowPaths = await client_1.db.select().from(mst_1.flowPaths)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${mst_1.flowPaths.fromSubBlockId} IN (SELECT id FROM mst.sub_blocks WHERE field_id = ${fieldId})`, (0, drizzle_orm_1.eq)(mst_1.flowPaths.isActive, true)));
        // 9. Load weather + warnings
        const forecast = await (0, bmkg_service_1.getLatestForecast)(fieldId);
        const warnings = await (0, bmkg_service_1.getActiveWarnings)(fieldId);
        // 10. Build request payload for Server 2
        const subBlocksPayload = subBlocks.map(sb => {
            const state = stateMap.get(sb.id);
            const cycle = cycleMap.get(sb.id);
            const rule = cycle?.ruleProfileId ? ruleMap.get(cycle.ruleProfileId) : null;
            const flags = flagMap.get(sb.id) ?? [];
            const sbFlows = allFlowPaths.filter(fp => fp.fromSubBlockId === sb.id || fp.toSubBlockId === sb.id);
            return {
                id: sb.id,
                code: sb.code,
                state: {
                    water_level_cm: state?.waterLevelCm ? parseFloat(state.waterLevelCm) : null,
                    state_source: state?.stateSource ?? 'no_data',
                    freshness_status: state?.freshnessStatus ?? 'no_data',
                    last_observation_at: state?.lastObservationAt?.toISOString() ?? null,
                    interpolation_confidence: state?.interpolationConfidence ? parseFloat(state.interpolationConfidence) : null,
                },
                crop_cycle: cycle ? {
                    bucket_code: cycle.bucketCode,
                    phase_code: cycle.currentPhaseCode,
                    hst: cycle.currentHst,
                    variety_name: cycle.varietyName,
                } : null,
                rule_profile: rule ? {
                    id: rule.id,
                    awd_lower_threshold_cm: parseFloat(rule.awdLowerThresholdCm),
                    awd_upper_target_cm: parseFloat(rule.awdUpperTargetCm),
                    drought_alert_cm: rule.droughtAlertCm ? parseFloat(rule.droughtAlertCm) : null,
                    priority_weight: parseFloat(rule.priorityWeight),
                    rain_delay_mm: parseFloat(rule.rainDelayMm),
                    target_confidence: rule.targetConfidence,
                    rainfed_modifier_pct: parseFloat(rule.rainfedModifierPct),
                } : null,
                management_flags: flags.map(f => ({
                    event_type: f.eventType,
                    flag_text: f.attentionFlagText,
                    expires_at: f.flagExpiresAt?.toISOString() ?? new Date().toISOString(),
                })),
                flow_paths: sbFlows.map(fp => ({
                    from_sub_block_id: fp.fromSubBlockId,
                    to_sub_block_id: fp.toSubBlockId,
                    flow_type: fp.flowType,
                })),
            };
        });
        const isStale = !forecast || (Date.now() - (forecast.fetchedAt?.getTime() ?? 0)) > 6 * 3_600_000;
        const evalRequest = {
            job_id: jobId,
            field_id: fieldId,
            cycle_mode: cycleMode,
            field_context: { water_source_type: 'irrigated', operator_count: 1 },
            sub_blocks: subBlocksPayload,
            weather: {
                precipitation_mm: forecast?.precipitationMm ? parseFloat(forecast.precipitationMm) : null,
                bmkg_category: forecast?.bmkgCategory ?? null,
                temperature_c: forecast?.temperatureC ? parseFloat(forecast.temperatureC) : null,
                humidity_pct: forecast?.humidityPct ? parseFloat(forecast.humidityPct) : null,
                is_stale: isStale,
            },
            active_warnings: warnings.map(w => ({
                warning_type: w.warningType,
                warning_level: w.warningLevel,
                dss_action: w.dssAction ?? 'none',
                warning_text: w.warningText,
            })),
        };
        // 11. POST to Server 2
        await client_1.db.update(schema_1.decisionJobs).set({ status: 'running' }).where((0, drizzle_orm_1.eq)(schema_1.decisionJobs.id, jobId));
        const response = await fetch(`${config_1.config.DECISION_ENGINE_URL}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evalRequest),
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Server 2 returned ${response.status}: ${body.slice(0, 200)}`);
        }
        const result = await response.json();
        // 12. Store recommendations
        const validUntil = new Date(Date.now() + (cycleMode === 'siaga' ? 30 : 60) * 60_000);
        for (const rec of result.recommendations) {
            await client_1.db.insert(schema_1.irrigationRecommendations).values({
                decisionJobId: jobId,
                fieldId,
                subBlockId: rec.sub_block_id,
                recommendationType: rec.recommendation_type,
                priorityRank: rec.priority_rank,
                priorityScore: rec.priority_score.toString(),
                fromSubBlockId: rec.from_sub_block_id,
                toSubBlockId: rec.to_sub_block_id,
                commandTemplateCode: rec.command_template_code,
                commandText: rec.command_text,
                reasonSummary: rec.reason_summary,
                confidenceLevel: rec.confidence_level,
                attentionFlagsJson: rec.attention_flags_json,
                operatorWarningText: rec.operator_warning_text,
                validUntil,
                engineVersion: result.engine_version,
                feedbackStatus: 'pending',
            }).onConflictDoNothing(); // idempotent re-runs
        }
        // 13. Mark job complete
        await client_1.db.update(schema_1.decisionJobs).set({
            status: 'completed',
            completedAt: new Date(),
            recommendationsGenerated: result.recommendations.length,
        }).where((0, drizzle_orm_1.eq)(schema_1.decisionJobs.id, jobId));
        logger_util_1.logger.info({ jobId, fieldId, recs: result.recommendations.length, engineVersion: result.engine_version }, 'Decision cycle complete');
    }
    catch (err) {
        await client_1.db.update(schema_1.decisionJobs).set({
            status: 'failed',
            completedAt: new Date(),
            errorMessage: String(err),
        }).where((0, drizzle_orm_1.eq)(schema_1.decisionJobs.id, jobId));
        logger_util_1.logger.error({ err, jobId, fieldId }, 'Decision cycle failed');
        throw err;
    }
}
//# sourceMappingURL=engine-client.service.js.map