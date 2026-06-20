"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const archive_service_1 = require("./archive.service");
exports.archiveRouter = (0, express_1.Router)();
const h = (fn) => (req, res, next) => { fn(req, res).catch(next); };
// POST /crop-cycles/:id/complete
exports.archiveRouter.post('/crop-cycles/:id/complete', auth_middleware_1.requireAuth, h(async (req, res) => {
    const result = await archive_service_1.archiveService.archiveCycle(req.params['id'], req.user.id);
    res.json((0, response_util_1.successResponse)(result));
}));
// GET /fields/:fieldId/archives
exports.archiveRouter.get('/fields/:fieldId/archives', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const rows = await archive_service_1.archiveService.listArchives(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(rows));
}));
//# sourceMappingURL=archive.router.js.map