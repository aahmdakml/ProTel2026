export declare const orthomosaicService: {
    /**
     * Request an upload URL for a new orthomosaic GeoTIFF.
     */
    requestUpload(fieldId: string, filename: string, contentType: string): Promise<{
        uploadId: string;
        uploadUrl: string;
        rawKey: string;
    }>;
    /**
     * Finalize upload and trigger Server 2 for COG conversion.
     */
    finalizeAndConvert(uploadId: string, userId: string): Promise<{
        status: string;
        uploadId: string;
    }>;
    /**
     * Called by Server 2 (or polling) when conversion is done.
     * In this simplified version, we'll assume it's done or provide a manual trigger.
     */
    markAsReady(uploadId: string, cogKey: string): Promise<void>;
    listLayers(fieldId: string): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        fieldId: string;
        displayOrder: number;
        layerType: string;
        version: number;
        rawStorageKey: string | null;
        cogStorageKey: string | null;
        fileSizeBytes: number | null;
        pixelResolutionM: string | null;
        captureDate: string | null;
        uploadStatus: string;
        processingError: string | null;
        uploadedBy: string | null;
    }[]>;
    publishLayer(layerId: string): Promise<void>;
};
//# sourceMappingURL=orthomosaic.service.d.ts.map