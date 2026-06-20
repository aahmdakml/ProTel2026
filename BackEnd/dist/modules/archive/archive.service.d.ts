export declare const archiveService: {
    /**
     * Finalize and archive a crop cycle.
     * This marks the cycle as completed/archived.
     * Business logic: ensures today's data is captured before closing.
     */
    archiveCycle(cycleId: string, userId: string): Promise<{
        id: string;
        subBlockId: string;
        fieldId: string;
        bucketCode: string;
        varietyName: string | null;
        ruleProfileId: string | null;
        plantingDate: string;
        expectedHarvestDate: string | null;
        actualHarvestDate: string | null;
        currentPhaseCode: string;
        currentHst: number;
        status: string;
        completedAt: Date | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * List archived cycles for a sub-block or field.
     */
    listArchives(fieldId: string): Promise<{
        status: string;
        bucketCode: string;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        notes: string | null;
        fieldId: string;
        subBlockId: string;
        varietyName: string | null;
        ruleProfileId: string | null;
        plantingDate: string;
        expectedHarvestDate: string | null;
        actualHarvestDate: string | null;
        currentPhaseCode: string;
        currentHst: number;
        completedAt: Date | null;
    }[]>;
};
//# sourceMappingURL=archive.service.d.ts.map