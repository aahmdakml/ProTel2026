/**
 * Parse expiry string ke milliseconds
 * Contoh: '15m' → 900_000, '7d' → 604_800_000
 */
export declare function parseExpiryMs(expiry: string): number;
/**
 * Parse expiry ke detik (untuk expires_in di OAuth2 response)
 */
export declare function parseExpirySec(expiry: string): number;
//# sourceMappingURL=time.util.d.ts.map