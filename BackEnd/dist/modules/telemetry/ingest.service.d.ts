import type { BatchPayload } from './ingest.schema';
export interface BatchResult {
    batchId: string;
    processed: number;
    failed: number;
    skipped: number;
}
export declare function processBatch(payload: BatchPayload): Promise<BatchResult>;
//# sourceMappingURL=ingest.service.d.ts.map