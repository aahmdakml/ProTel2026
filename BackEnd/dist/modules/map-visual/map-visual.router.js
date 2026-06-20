"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapVisualRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const map_visual_service_1 = require("./map-visual.service");
exports.mapVisualRouter = (0, express_1.Router)();
const h = (fn) => (req, res, next) => { fn(req, res).catch(next); };
// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const MapVisualUploadSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1),
    content_type: zod_1.z.string().regex(/^image\/(png|jpeg|jpg|webp|tiff|x-tiff|tif)$/),
});
const MapBoundsSchema = zod_1.z.object({
    bounds: zod_1.z.array(zod_1.z.array(zod_1.z.number())).length(2), // [[lat, lng], [lat, lng]] or similar
});
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// POST /fields/:id/map-visual/upload-url
exports.mapVisualRouter.post('/fields/:id/map-visual/upload-url', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(MapVisualUploadSchema), h(async (req, res) => {
    const result = await map_visual_service_1.mapVisualService.requestUpload(req.params['id'], req.body.filename, req.body.content_type);
    res.json((0, response_util_1.successResponse)(result));
}));
// PUT /fields/:id/map-visual/local-upload
exports.mapVisualRouter.put('/fields/:id/map-visual/local-upload', h(async (req, res) => {
    const fieldId = req.params['id'];
    const filename = req.query.filename || 'visual.png';
    const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'map-visuals', fieldId);
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path_1.default.join(uploadDir, filename);
    const fileStream = fs_1.default.createWriteStream(filePath);
    req.pipe(fileStream);
    await new Promise((resolve, reject) => {
        fileStream.on('finish', () => resolve(true));
        fileStream.on('error', (err) => reject(err));
    });
    res.json({ success: true, message: 'Local upload complete' });
}));
// POST /fields/:id/map-visual/finalize
exports.mapVisualRouter.post('/fields/:id/map-visual/finalize', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), h(async (req, res) => {
    const result = await map_visual_service_1.mapVisualService.finalizeUpload(req.params['id'], req.body.storage_key);
    res.json((0, response_util_1.successResponse)(result));
}));
// PATCH /fields/:id/map-visual/bounds
exports.mapVisualRouter.patch('/fields/:id/map-visual/bounds', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(MapBoundsSchema), h(async (req, res) => {
    const result = await map_visual_service_1.mapVisualService.updateBounds(req.params['id'], req.body.bounds);
    res.json((0, response_util_1.successResponse)(result));
}));
// DELETE /fields/:id/map-visual
exports.mapVisualRouter.delete('/fields/:id/map-visual', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), h(async (req, res) => {
    await map_visual_service_1.mapVisualService.deleteVisual(req.params['id']);
    res.json((0, response_util_1.successResponse)({ status: 'deleted' }));
}));
//# sourceMappingURL=map-visual.router.js.map