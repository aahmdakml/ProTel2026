"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orthomosaicService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const axios_1 = __importDefault(require("axios"));
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const trx_1 = require("../../db/schema/trx");
const config_1 = require("../../config");
const logger_util_1 = require("../../shared/utils/logger.util");
const r2_service_1 = require("./r2.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.orthomosaicService = {
    /**
     * Request an upload URL for a new orthomosaic GeoTIFF.
     */
    async requestUpload(fieldId, filename, contentType) {
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const rawKey = `uploads/raw/${fieldId}/${timestamp}_${safeFilename}`;
        const uploadUrl = await r2_service_1.r2Service.getPresignedUploadUrl(rawKey, contentType);
        // Save metadata
        const [upload] = await client_1.db.insert(trx_1.orthomosaicUploads).values({
            fieldId: fieldId,
            originalFilename: filename,
            fileSizeBytes: 0,
            rawStorageKey: rawKey,
            uploadStatus: 'pending',
            uploadedBy: null, // filled by router later
        }).returning();
        return {
            uploadId: upload.id,
            uploadUrl,
            rawKey,
        };
    },
    /**
     * Finalize upload and trigger Server 2 for COG conversion.
     */
    async finalizeAndConvert(uploadId, userId) {
        const [upload] = await client_1.db.select().from(trx_1.orthomosaicUploads).where((0, drizzle_orm_1.eq)(trx_1.orthomosaicUploads.id, uploadId)).limit(1);
        if (!upload)
            throw new error_middleware_1.AppError(404, 'UPLOAD_NOT_FOUND', 'Upload record tidak ditemukan');
        if (upload.uploadStatus !== 'pending')
            throw new error_middleware_1.AppError(400, 'INVALID_STATUS', 'Upload sudah diproses atau gagal');
        const cogKey = upload.rawStorageKey.replace('uploads/raw/', 'tiles/cog/') + '.cog.tif';
        // Update status
        await client_1.db.update(trx_1.orthomosaicUploads).set({
            uploadStatus: 'processing',
            uploadedBy: userId,
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(trx_1.orthomosaicUploads.id, uploadId));
        // Trigger Server 2
        try {
            const response = await axios_1.default.post(`${config_1.config.DECISION_ENGINE_URL}/cog/convert`, {
                raw_key: upload.rawStorageKey,
                output_key: cogKey,
                field_id: upload.fieldId,
            }, { timeout: 15000 });
            logger_util_1.logger.info({ fieldId: upload.fieldId, uploadId, status: response.data.status }, 'COG conversion triggered on Server 2');
        }
        catch (err) {
            logger_util_1.logger.error({ err, uploadId }, 'Failed to trigger Server 2 COG conversion');
            // Still return success to user, processing happens in background
        }
        return { status: 'processing', uploadId };
    },
    /**
     * Called by Server 2 (or polling) when conversion is done.
     * In this simplified version, we'll assume it's done or provide a manual trigger.
     */
    async markAsReady(uploadId, cogKey) {
        const [upload] = await client_1.db.update(trx_1.orthomosaicUploads).set({
            uploadStatus: 'ready',
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(trx_1.orthomosaicUploads.id, uploadId)).returning();
        if (!upload)
            return;
        // Create a new map layer automatically
        await client_1.db.insert(mst_1.mapLayers).values({
            fieldId: upload.fieldId,
            name: `Orthomosaic ${new Date(upload.createdAt).toLocaleDateString()}`,
            layerType: 'orthomosaic',
            cogStorageKey: cogKey,
            isActive: false,
            displayOrder: 0,
        });
    },
    async listLayers(fieldId) {
        return client_1.db.select()
            .from(mst_1.mapLayers)
            .where((0, drizzle_orm_1.eq)(mst_1.mapLayers.fieldId, fieldId))
            .orderBy(mst_1.mapLayers.displayOrder, (0, drizzle_orm_1.desc)(mst_1.mapLayers.createdAt));
    },
    async publishLayer(layerId) {
        // Deactivate others
        const [target] = await client_1.db.select({ fieldId: mst_1.mapLayers.fieldId }).from(mst_1.mapLayers).where((0, drizzle_orm_1.eq)(mst_1.mapLayers.id, layerId)).limit(1);
        if (!target)
            throw new error_middleware_1.AppError(404, 'LAYER_NOT_FOUND', 'Layer tidak ditemukan');
        await client_1.db.update(mst_1.mapLayers).set({ isActive: false }).where((0, drizzle_orm_1.eq)(mst_1.mapLayers.fieldId, target.fieldId));
        await client_1.db.update(mst_1.mapLayers).set({ isActive: true }).where((0, drizzle_orm_1.eq)(mst_1.mapLayers.id, layerId));
    }
};
//# sourceMappingURL=orthomosaic.service.js.map