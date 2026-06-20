"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("../../config");
const logger_util_1 = require("../../shared/utils/logger.util");
const s3Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: config_1.config.R2_ENDPOINT,
    credentials: {
        accessKeyId: config_1.config.R2_ACCESS_KEY_ID || '',
        secretAccessKey: config_1.config.R2_SECRET_ACCESS_KEY || '',
    },
});
exports.r2Service = {
    /**
     * Generate a presigned PutObject URL for direct upload to R2.
     *
     * @param key - Destination path in R2 (e.g. 'uploads/raw/filename.tif')
     * @param contentType - e.g. 'image/tiff'
     * @param expiresInSeconds - default 3600 (1 hour)
     */
    async getPresignedUploadUrl(key, contentType, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: config_1.config.R2_BUCKET_NAME,
                Key: key,
                ContentType: contentType,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresInSeconds });
            return url;
        }
        catch (err) {
            logger_util_1.logger.error({ err, key }, 'Failed to generate R2 presigned upload URL');
            throw err;
        }
    },
    /**
     * Generate a presigned GetObject URL for temporary access to a file.
     */
    async getPresignedDownloadUrl(key, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: config_1.config.R2_BUCKET_NAME,
                Key: key,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresInSeconds });
            return url;
        }
        catch (err) {
            logger_util_1.logger.error({ err, key }, 'Failed to generate R2 presigned download URL');
            throw err;
        }
    },
    /**
     * Returns the public URL if configured, otherwise the R2 s3-compatible URL.
     */
    getPublicUrl(key) {
        if (config_1.config.R2_PUBLIC_URL) {
            return `${config_1.config.R2_PUBLIC_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
        }
        return `${config_1.config.R2_ENDPOINT}/${config_1.config.R2_BUCKET_NAME}/${key}`;
    },
};
//# sourceMappingURL=r2.service.js.map