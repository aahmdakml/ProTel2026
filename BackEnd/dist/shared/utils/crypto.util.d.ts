/**
 * Hash string menggunakan SHA-256
 * Dipakai untuk menyimpan refresh token ke DB (tidak pernah simpan raw token)
 */
export declare function sha256(input: string): string;
/**
 * Generate random token (URL-safe base64)
 * @param bytes - jumlah random bytes (default: 48 → 64 char base64url)
 */
export declare function generateToken(bytes?: number): string;
//# sourceMappingURL=crypto.util.d.ts.map