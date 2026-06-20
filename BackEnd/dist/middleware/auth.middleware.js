"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const error_middleware_1 = require("../middleware/error.middleware");
// ---------------------------------------------------------------------------
// requireAuth — verifikasi JWT access token
//
// Attach req.user = { id, role } jika valid.
// Throw AppError jika token tidak ada, expired, atau tidak valid.
// ---------------------------------------------------------------------------
function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Token autentikasi diperlukan'));
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
        req.user = { id: payload.sub, role: payload.role };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new error_middleware_1.AppError(401, 'TOKEN_EXPIRED', 'Token sudah kadaluarsa, refresh token diperlukan'));
        }
        else {
            next(new error_middleware_1.AppError(401, 'INVALID_TOKEN', 'Token tidak valid'));
        }
    }
}
//# sourceMappingURL=auth.middleware.js.map