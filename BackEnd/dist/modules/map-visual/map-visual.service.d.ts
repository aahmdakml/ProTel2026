export declare const mapVisualService: {
    /**
     * Request a presigned URL or Local upload URL to upload a field visual.
     */
    requestUpload(fieldId: string, filename: string, contentType: string): Promise<{
        uploadUrl: string;
        storageKey: string;
    }>;
    /**
     * Finalize the upload by updating the field record with the visual URL.
     */
    finalizeUpload(fieldId: string, storageKey: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        adm4Code: string;
        waterSourceType: string;
        areaHectares: string | null;
        operatorCountDefault: number;
        decisionCycleMode: string;
        isActive: boolean;
        notes: string | null;
        mapVisualUrl: string | null;
        mapBounds: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Update the map bounds (georeferencing) for the field.
     */
    updateBounds(fieldId: string, bounds: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        adm4Code: string;
        waterSourceType: string;
        areaHectares: string | null;
        operatorCountDefault: number;
        decisionCycleMode: string;
        isActive: boolean;
        notes: string | null;
        mapVisualUrl: string | null;
        mapBounds: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteVisual(fieldId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        adm4Code: string;
        waterSourceType: string;
        areaHectares: string | null;
        operatorCountDefault: number;
        decisionCycleMode: string;
        isActive: boolean;
        notes: string | null;
        mapVisualUrl: string | null;
        mapBounds: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
};
//# sourceMappingURL=map-visual.service.d.ts.map