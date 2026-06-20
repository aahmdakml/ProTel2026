export interface NeighborState {
    subBlockId: string;
    waterLevelCm: number | null;
    freshnessStatus: string;
    stateSource: string;
}
export interface EstimationResult {
    waterLevelCm: number | null;
    stateSource: 'estimated';
    interpolationConfidence: number;
    usedNeighborCount: number;
}
/**
 * Estimasi water level untuk sub-block yang tidak punya data,
 * berdasarkan level air dari tetangga yang terhubung via flow_paths.
 *
 * Confidence:
 *   - 1.0 jika semua tetangga 'fresh'
 *   - 0.6 jika semua tetangga 'stale'
 *   - 0.0 jika tidak ada tetangga dengan data
 */
export declare function estimateFromNeighbors(subBlockId: string): Promise<EstimationResult | null>;
//# sourceMappingURL=estimator.d.ts.map