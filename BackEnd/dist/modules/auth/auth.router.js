"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const auth_service_1 = require("./auth.service");
const auth_schema_1 = require("./auth.schema");
const response_util_1 = require("../../shared/utils/response.util");
exports.authRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// POST /auth/login
// Body: { email, password }
// Response: { access_token, refresh_token, token_type, expires_in }
// ---------------------------------------------------------------------------
exports.authRouter.post('/login', (0, validate_middleware_1.validate)(auth_schema_1.LoginSchema), async (req, res, next) => {
    try {
        const tokens = await auth_service_1.authService.login(req.body, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        res.status(200).json((0, response_util_1.successResponse)(tokens));
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /auth/refresh
// Body: { refresh_token }
// Response: { access_token, token_type, expires_in }
// ---------------------------------------------------------------------------
exports.authRouter.post('/refresh', (0, validate_middleware_1.validate)(auth_schema_1.RefreshSchema), async (req, res, next) => {
    try {
        const result = await auth_service_1.authService.refresh(req.body.refresh_token);
        res.json((0, response_util_1.successResponse)(result));
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /auth/logout
// Body: { refresh_token }
// Response: { message }
// ---------------------------------------------------------------------------
exports.authRouter.post('/logout', (0, validate_middleware_1.validate)(auth_schema_1.RefreshSchema), async (req, res, next) => {
    try {
        await auth_service_1.authService.logout(req.body.refresh_token);
        res.json((0, response_util_1.successResponse)({ message: 'Logout berhasil' }));
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// GET /auth/me
// Header: Authorization: Bearer <access_token>
// Response: user profile (no password hash)
// ---------------------------------------------------------------------------
exports.authRouter.get('/me', auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const user = await auth_service_1.authService.getMe(req.user.id);
        res.json((0, response_util_1.successResponse)(user));
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.router.js.map