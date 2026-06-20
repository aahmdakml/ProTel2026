export declare const r2Service: {
    /**
     * Generate a presigned PutObject URL for direct upload to R2.
     *
     * @param key - Destination path in R2 (e.g. 'uploads/raw/filename.tif')
     * @param contentType - e.g. 'image/tiff'
     * @param expiresInSeconds - default 3600 (1 hour)
     */
    getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Generate a presigned GetObject URL for temporary access to a file.
     */
    getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
    /**
     * Returns the public URL if configured, otherwise the R2 s3-compatible URL.
     */
    getPublicUrl(key: string): string;
};
//# sourceMappingURL=r2.service.d.ts.map