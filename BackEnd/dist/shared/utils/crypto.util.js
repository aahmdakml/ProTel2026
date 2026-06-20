"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.generateToken = generateToken;
const crypto_1 = require("crypto");
/**
 * Hash string menggunakan SHA-256
 * Dipakai untuk menyimpan refresh token ke DB (tidak pernah simpan raw token)
 */
function sha256(input) {
    return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
}
/**
 * Generate random token (URL-safe base64)
 * @param bytes - jumlah random bytes (default: 48 → 64 char base64url)
 */
function generateToken(bytes = 48) {
    return (0, crypto_1.randomBytes)(bytes).toString('base64url');
}
//# sourceMappingURL=crypto.util.js.map