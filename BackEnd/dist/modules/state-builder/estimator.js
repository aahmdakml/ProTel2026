"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateFromNeighbors = estimateFromNeighbors;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
/**
 * Estimasi water level untuk sub-block yang tidak punya data,
 * berdasarkan level air dari tetangga yang terhubung via flow_paths.
 *
 * Confidence:
 *   - 1.0 jika semua tetangga 'fresh'
 *   - 0.6 jika semua tetangga 'stale'
 *   - 0.0 jika tidak ada tetangga dengan data
 */
async function estimateFromNeighbors(subBlockId) {
    // 1. Ambil flow_paths yang terhubung ke subBlock ini (sebagai from atau to)
    const paths = await client_1.db.select({
        fromId: mst_1.flowPaths.fromSubBlockId,
        toId: mst_1.flowPaths.toSubBlockId,
    })
        .from(mst_1.flowPaths)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.flowPaths.isActive, true), (0, drizzle_orm_1.sql) `(${mst_1.flowPaths.fromSubBlockId} = ${subBlockId} OR ${mst_1.flowPaths.toSubBlockId} = ${subBlockId})`));
    if (paths.length === 0)
        return null;
    // 2. Kumpulkan neighbor IDs (max 1-hop)
    const neighborIds = [...new Set(paths.flatMap(p => [p.fromId, p.toId]).filter(id => id !== subBlockId))];
    if (neighborIds.length === 0)
        return null;
    // 3. Dapatkan current state tetangga
    const neighborStates = [];
    for (const nId of neighborIds) {
        const [state] = await client_1.db.select({
            subBlockId: schema_1.subBlockCurrentStates.subBlockId,
            waterLevelCm: schema_1.subBlockCurrentStates.waterLevelCm,
            freshnessStatus: schema_1.subBlockCurrentStates.freshnessStatus,
            stateSource: schema_1.subBlockCurrentStates.stateSource,
        })
            .from(schema_1.subBlockCurrentStates)
            .where((0, drizzle_orm_1.eq)(schema_1.subBlockCurrentStates.subBlockId, nId))
            .limit(1);
        if (state)
            neighborStates.push({
                subBlockId: state.subBlockId,
                waterLevelCm: state.waterLevelCm !== null ? parseFloat(state.waterLevelCm) : null,
                freshnessStatus: state.freshnessStatus,
                stateSource: state.stateSource,
            });
    }
    // 4. Hanya pakai tetangga dengan data (fresh atau stale)
    const usable = neighborStates.filter(n => n.waterLevelCm !== null && ['fresh', 'stale'].includes(n.freshnessStatus));
    if (usable.length === 0)
        return null;
    // 5. Weighted average (fresh weight = 1.0, stale weight = 0.5)
    let totalWeight = 0;
    let weightedSum = 0;
    let freshCount = 0;
    for (const n of usable) {
        const w = n.freshnessStatus === 'fresh' ? 1.0 : 0.5;
        weightedSum += n.waterLevelCm * w;
        totalWeight += w;
        if (n.freshnessStatus === 'fresh')
            freshCount++;
    }
    const waterLevelCm = Math.round((weightedSum / totalWeight) * 100) / 100;
    const confidence = freshCount / usable.length; // 1.0 = semua fresh
    return {
        waterLevelCm,
        stateSource: 'estimated',
        interpolationConfidence: Math.round(confidence * 100) / 100,
        usedNeighborCount: usable.length,
    };
}
//# sourceMappingURL=estimator.js.map