"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFieldAccess = requireFieldAccess;
exports.requireSystemRole = requireSystemRole;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const mst_1 = require("../db/schema/mst");
const error_middleware_1 = require("../middleware/error.middleware");
// ---------------------------------------------------------------------------
// requireFieldAccess — RBAC per field
//
// Factory middleware: cek apakah user punya field role yang cukup.
// system_admin selalu lolos. field_manager dan operator dibatasi per field.
//
// Cara pakai:
//   router.get('/:fieldId/...', requireAuth, requireFieldAccess('operator'), handler)
//
// Field ID diambil dari req.params.fieldId (atau req.params.id sebagai fallback).
// ---------------------------------------------------------------------------
const ROLE_ORDER = ['viewer', 'operator', 'manager'];
function requireFieldAccess(minRole = 'viewer') {
    return async (req, _res, next) => {
        try {
            const user = req.user;
            if (!user) {
                next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan'));
                return;
            }
            // system_admin punya akses penuh ke semua field
            if (user.role === 'system_admin') {
                req.fieldRole = 'manager';
                next();
                return;
            }
            const fieldId = req.params['fieldId'] ?? req.params['id'];
            if (!fieldId) {
                next(new error_middleware_1.AppError(400, 'FIELD_ID_REQUIRED', 'Field ID tidak ditemukan di request'));
                return;
            }
            const [access] = await client_1.db
                .select({ fieldRole: mst_1.userFields.fieldRole })
                .from(mst_1.userFields)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.userFields.userId, user.id), (0, drizzle_orm_1.eq)(mst_1.userFields.fieldId, fieldId)))
                .limit(1);
            if (!access) {
                next(new error_middleware_1.AppError(403, 'FIELD_ACCESS_DENIED', 'Tidak ada akses ke field ini'));
                return;
            }
            const userRoleIdx = ROLE_ORDER.indexOf(access.fieldRole);
            const minRoleIdx = ROLE_ORDER.indexOf(minRole);
            if (userRoleIdx < minRoleIdx) {
                next(new error_middleware_1.AppError(403, 'INSUFFICIENT_ROLE', `Diperlukan setidaknya role '${minRole}' untuk aksi ini`));
                return;
            }
            req.fieldRole = access.fieldRole;
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
// ---------------------------------------------------------------------------
// requireSystemRole — cek system_role (system_admin / field_manager / operator)
//
// Dipakai untuk endpoint admin-only, tanpa field scope.
// Cara pakai:
//   router.post('/admin/users', requireAuth, requireSystemRole('system_admin'), handler)
// ---------------------------------------------------------------------------
function requireSystemRole(...roles) {
    return (req, _res, next) => {
        const user = req.user;
        if (!user) {
            next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan'));
            return;
        }
        if (!roles.includes(user.role)) {
            next(new error_middleware_1.AppError(403, 'FORBIDDEN', `Aksi ini hanya untuk: ${roles.join(', ')}`));
            return;
        }
        next();
    };
}
//# sourceMappingURL=rbac.middleware.js.map