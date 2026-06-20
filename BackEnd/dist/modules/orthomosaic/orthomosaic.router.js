"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orthomosaicRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const orthomosaic_service_1 = require("./orthomosaic.service");
exports.orthomosaicRouter = (0, express_1.Router)();
const h = (fn) => (req, res, next) => { fn(req, res).catch(next); };
// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const UploadRequestSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1),
    content_type: zod_1.z.string().startsWith('image/'),
});
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// POST /fields/:fieldId/orthomosaic/upload-url
exports.orthomosaicRouter.post('/fields/:fieldId/orthomosaic/upload-url', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(UploadRequestSchema), h(async (req, res) => {
    const result = await orthomosaic_service_1.orthomosaicService.requestUpload(req.params['fieldId'], req.body.filename, req.body.content_type);
    res.json((0, response_util_1.successResponse)(result));
}));
// POST /orthomosaic/finalize/:uploadId
exports.orthomosaicRouter.post('/orthomosaic/finalize/:uploadId', auth_middleware_1.requireAuth, h(async (req, res) => {
    const result = await orthomosaic_service_1.orthomosaicService.finalizeAndConvert(req.params['uploadId'], req.user.id);
    res.json((0, response_util_1.successResponse)(result));
}));
// GET /fields/:fieldId/map-layers
exports.orthomosaicRouter.get('/fields/:fieldId/map-layers', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const rows = await orthomosaic_service_1.orthomosaicService.listLayers(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /map-layers/:id/publish
exports.orthomosaicRouter.post('/map-layers/:id/publish', auth_middleware_1.requireAuth, h(async (req, res) => {
    await orthomosaic_service_1.orthomosaicService.publishLayer(req.params['id']);
    res.json((0, response_util_1.successResponse)({ status: 'published' }));
}));
//# sourceMappingURL=orthomosaic.router.js.map