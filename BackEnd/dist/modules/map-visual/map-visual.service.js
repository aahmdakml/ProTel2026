"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapVisualService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const r2_service_1 = require("../orthomosaic/r2.service");
const error_middleware_1 = require("../../middleware/error.middleware");
const config_1 = require("../../config");
exports.mapVisualService = {
    /**
     * Request a presigned URL or Local upload URL to upload a field visual.
     */
    async requestUpload(fieldId, filename, contentType) {
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        // Cek apakah R2 sudah dikonfigurasi
        const isR2Configured = config_1.config.R2_ACCESS_KEY_ID &&
            !config_1.config.R2_ACCESS_KEY_ID.includes('YOUR_') &&
            config_1.config.R2_ENDPOINT &&
            !config_1.config.R2_ENDPOINT.includes('YOUR_ACCOUNT_ID');
        if (!isR2Configured) {
            // Local Upload Fallback
            const uploadUrl = `http://localhost:3000/fields/${fieldId}/map-visual/local-upload?filename=${timestamp}_${encodeURIComponent(safeFilename)}`;
            const storageKey = `http://localhost:3000/uploads/map-visuals/${fieldId}/${timestamp}_${safeFilename}`;
            return {
                uploadUrl,
                storageKey,
            };
        }
        const storageKey = `map-visuals/${fieldId}/${timestamp}_${safeFilename}`;
        const uploadUrl = await r2_service_1.r2Service.getPresignedUploadUrl(storageKey, contentType);
        return {
            uploadUrl,
            storageKey,
        };
    },
    /**
     * Finalize the upload by updating the field record with the visual URL.
     */
    async finalizeUpload(fieldId, storageKey) {
        const publicUrl = storageKey.startsWith('http')
            ? storageKey
            : r2_service_1.r2Service.getPublicUrl(storageKey);
        const [updated] = await client_1.db.update(mst_1.fields)
            .set({
            mapVisualUrl: publicUrl,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'FIELD_NOT_FOUND', 'Field tidak ditemukan');
        return updated;
    },
    /**
     * Update the map bounds (georeferencing) for the field.
     */
    async updateBounds(fieldId, bounds) {
        const [updated] = await client_1.db.update(mst_1.fields)
            .set({
            mapBounds: bounds,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'FIELD_NOT_FOUND', 'Field tidak ditemukan');
        return updated;
    },
    async deleteVisual(fieldId) {
        const [updated] = await client_1.db.update(mst_1.fields)
            .set({
            mapVisualUrl: null,
            mapBounds: null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId))
            .returning();
        return updated;
    }
};
//# sourceMappingURL=map-visual.service.js.map