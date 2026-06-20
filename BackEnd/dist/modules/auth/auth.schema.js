"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenResponseSchema = exports.RefreshSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Format email tidak valid'),
    password: zod_1.z.string().min(1, 'Password wajib diisi'),
});
exports.RefreshSchema = zod_1.z.object({
    refresh_token: zod_1.z.string().min(1, 'Refresh token diperlukan'),
});
// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------
exports.TokenResponseSchema = zod_1.z.object({
    access_token: zod_1.z.string(),
    refresh_token: zod_1.z.string(),
    token_type: zod_1.z.literal('Bearer'),
    expires_in: zod_1.z.number(), // seconds
});
//# sourceMappingURL=auth.schema.js.map