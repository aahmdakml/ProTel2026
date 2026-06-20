"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterDataRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const master_data_service_1 = require("./master-data.service");
const master_data_schema_1 = require("./master-data.schema");
exports.masterDataRouter = (0, express_1.Router)();
// Alias handlers untuk mengurangi boilerplate
const h = (fn) => (req, res, next) => {
    fn(req, res).catch(next);
};
// ===========================================================================
// FIELDS  —  /fields
// ===========================================================================
// GET /fields — list semua field milik user (atau semua jika admin)
exports.masterDataRouter.get('/fields', auth_middleware_1.requireAuth, h(async (req, res) => {
    const { rows, meta } = await master_data_service_1.fieldsService.list(req.user.id, req.user.role === 'system_admin', req.query);
    res.json((0, response_util_1.successResponse)(rows, meta));
}));
// GET /fields/:fieldId
exports.masterDataRouter.get('/fields/:fieldId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const field = await master_data_service_1.fieldsService.getById(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(field));
}));
// POST /fields — only system_admin
exports.masterDataRouter.post('/fields', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), (0, validate_middleware_1.validate)(master_data_schema_1.CreateFieldSchema), h(async (req, res) => {
    const field = await master_data_service_1.fieldsService.create(req.body, req.user.id);
    res.status(201).json((0, response_util_1.successResponse)(field));
}));
// PATCH /fields/:fieldId
exports.masterDataRouter.patch('/fields/:fieldId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), (0, validate_middleware_1.validate)(master_data_schema_1.UpdateFieldSchema), h(async (req, res) => {
    const field = await master_data_service_1.fieldsService.update(req.params['fieldId'], req.body);
    res.json((0, response_util_1.successResponse)(field));
}));
// POST /fields/:fieldId/users — assign user ke field
exports.masterDataRouter.post('/fields/:fieldId/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(master_data_schema_1.AssignUserFieldSchema), h(async (req, res) => {
    await master_data_service_1.fieldsService.assignUser(req.params['fieldId'], req.body, req.user.id);
    res.json((0, response_util_1.successResponse)({ message: 'Akses diberikan' }));
}));
// DELETE /fields/:fieldId/users/:userId — revoke access
exports.masterDataRouter.delete('/fields/:fieldId/users/:userId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), h(async (req, res) => {
    await master_data_service_1.fieldsService.revokeUser(req.params['fieldId'], req.params['userId']);
    res.json((0, response_util_1.successResponse)({ message: 'Akses dicabut' }));
}));
// DELETE /fields/:fieldId
exports.masterDataRouter.delete('/fields/:fieldId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), h(async (req, res) => {
    await master_data_service_1.fieldsService.delete(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)({ message: 'Lahan berhasil dihapus' }));
}));
// ===========================================================================
// SUB-BLOCKS  —  /fields/:fieldId/sub-blocks
// ===========================================================================
// GET /fields/:fieldId/sub-blocks
exports.masterDataRouter.get('/fields/:fieldId/sub-blocks', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const rows = await master_data_service_1.subBlocksService.listByField(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /fields/:fieldId/sub-blocks
exports.masterDataRouter.post('/fields/:fieldId/sub-blocks', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(master_data_schema_1.CreateSubBlockSchema), h(async (req, res) => {
    const sb = await master_data_service_1.subBlocksService.create(req.params['fieldId'], req.body);
    res.status(201).json((0, response_util_1.successResponse)(sb));
}));
// POST /fields/:fieldId/sub-blocks/import-geojson — batch import dari GeoJSON file
exports.masterDataRouter.post('/fields/:fieldId/sub-blocks/import-geojson', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(master_data_schema_1.ImportSubBlocksSchema), h(async (req, res) => {
    const result = await master_data_service_1.subBlocksService.importFromGeoJson(req.params['fieldId'], req.body);
    res.status(201).json((0, response_util_1.successResponse)(result));
}));
// PATCH /sub-blocks/:id
exports.masterDataRouter.patch('/sub-blocks/:id', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.UpdateSubBlockSchema), h(async (req, res) => {
    const sb = await master_data_service_1.subBlocksService.update(req.params['id'], req.body);
    res.json((0, response_util_1.successResponse)(sb));
}));
// GET /sub-blocks/:id
exports.masterDataRouter.get('/sub-blocks/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    const sb = await master_data_service_1.subBlocksService.getById(req.params['id']);
    res.json((0, response_util_1.successResponse)(sb));
}));
// DELETE /sub-blocks/:id
exports.masterDataRouter.delete('/sub-blocks/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), h(async (req, res) => {
    await master_data_service_1.subBlocksService.delete(req.params['id']);
    res.json((0, response_util_1.successResponse)({ message: 'Petak berhasil dihapus' }));
}));
// ===========================================================================
// DEVICES  —  /fields/:fieldId/devices
// ===========================================================================
// GET /fields/:fieldId/devices
exports.masterDataRouter.get('/fields/:fieldId/devices', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('operator'), h(async (req, res) => {
    const rows = await master_data_service_1.devicesService.listByField(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /fields/:fieldId/devices
exports.masterDataRouter.post('/fields/:fieldId/devices', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(master_data_schema_1.CreateDeviceSchema), h(async (req, res) => {
    const dev = await master_data_service_1.devicesService.create(req.params['fieldId'], req.body);
    res.status(201).json((0, response_util_1.successResponse)(dev));
}));
// PATCH /devices/:id
exports.masterDataRouter.patch('/devices/:id', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.UpdateDeviceSchema.partial()), h(async (req, res) => {
    const dev = await master_data_service_1.devicesService.update(req.params['id'], req.body);
    res.json((0, response_util_1.successResponse)(dev));
}));
// GET /devices/:id
exports.masterDataRouter.get('/devices/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    const dev = await master_data_service_1.devicesService.getById(req.params['id']);
    res.json((0, response_util_1.successResponse)(dev));
}));
// DELETE /devices/:id
exports.masterDataRouter.delete('/devices/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), h(async (req, res) => {
    await master_data_service_1.devicesService.delete(req.params['id']);
    res.json((0, response_util_1.successResponse)({ message: 'Perangkat berhasil dihapus' }));
}));
// POST /devices/:id/assign
exports.masterDataRouter.post('/devices/:id/assign', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.AssignDeviceSchema), h(async (req, res) => {
    const dev = await master_data_service_1.devicesService.getById(req.params['id']);
    await master_data_service_1.devicesService.assign(req.params['id'], dev.fieldId, req.body, req.user.id);
    res.json((0, response_util_1.successResponse)({ message: 'Device berhasil di-assign' }));
}));
// POST /devices/:id/unassign
exports.masterDataRouter.post('/devices/:id/unassign', auth_middleware_1.requireAuth, h(async (req, res) => {
    await master_data_service_1.devicesService.unassign(req.params['id'], req.user.id);
    res.json((0, response_util_1.successResponse)({ message: 'Device berhasil di-unassign' }));
}));
// POST /devices/:id/calibrate
exports.masterDataRouter.post('/devices/:id/calibrate', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.CalibrateDeviceSchema), h(async (req, res) => {
    const cal = await master_data_service_1.devicesService.calibrate(req.params['id'], req.body, req.user.id);
    res.status(201).json((0, response_util_1.successResponse)(cal));
}));
// ===========================================================================
// FLOW PATHS  —  /fields/:fieldId/flow-paths
// ===========================================================================
// GET /fields/:fieldId/flow-paths
exports.masterDataRouter.get('/fields/:fieldId/flow-paths', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const rows = await master_data_service_1.flowPathsService.listByField(req.params['fieldId']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /fields/:fieldId/flow-paths
exports.masterDataRouter.post('/fields/:fieldId/flow-paths', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('manager'), (0, validate_middleware_1.validate)(master_data_schema_1.CreateFlowPathSchema), h(async (req, res) => {
    const fp = await master_data_service_1.flowPathsService.create(req.params['fieldId'], req.body);
    res.status(201).json((0, response_util_1.successResponse)(fp));
}));
// DELETE /flow-paths/:id
exports.masterDataRouter.delete('/flow-paths/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    await master_data_service_1.flowPathsService.delete(req.params['id']);
    res.json((0, response_util_1.successResponse)({ message: 'Flow path dihapus' }));
}));
// ===========================================================================
// CROP CYCLES  —  /sub-blocks/:id/crop-cycles
// ===========================================================================
// GET /sub-blocks/:id/crop-cycles
exports.masterDataRouter.get('/sub-blocks/:id/crop-cycles', auth_middleware_1.requireAuth, h(async (req, res) => {
    const rows = await master_data_service_1.cropCyclesService.listBySubBlock(req.params['id']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /sub-blocks/:id/crop-cycles — mulai musim tanam baru
exports.masterDataRouter.post('/sub-blocks/:id/crop-cycles', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.CreateCropCycleSchema), h(async (req, res) => {
    const sb = await master_data_service_1.subBlocksService.getById(req.params['id']);
    const cc = await master_data_service_1.cropCyclesService.create(req.params['id'], sb.fieldId, req.body);
    res.status(201).json((0, response_util_1.successResponse)(cc));
}));
// PATCH /crop-cycles/:id/phase — advance ke fase berikutnya
exports.masterDataRouter.patch('/crop-cycles/:id/phase', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(master_data_schema_1.UpdateCropCyclePhaseSchema), h(async (req, res) => {
    const cc = await master_data_service_1.cropCyclesService.advancePhase(req.params['id'], req.body);
    res.json((0, response_util_1.successResponse)(cc));
}));
// POST /crop-cycles/:id/complete — tandai panen/selesai
exports.masterDataRouter.post('/crop-cycles/:id/complete', auth_middleware_1.requireAuth, h(async (req, res) => {
    const cc = await master_data_service_1.cropCyclesService.complete(req.params['id'], req.body.actual_harvest_date);
    res.json((0, response_util_1.successResponse)(cc));
}));
// GET /crop-cycles/:id
exports.masterDataRouter.get('/crop-cycles/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    const cc = await master_data_service_1.cropCyclesService.getById(req.params['id']);
    res.json((0, response_util_1.successResponse)(cc));
}));
// DELETE /crop-cycles/:id
exports.masterDataRouter.delete('/crop-cycles/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    await master_data_service_1.cropCyclesService.delete(req.params['id']);
    res.json((0, response_util_1.successResponse)({ message: 'Siklus tanam dihapus' }));
}));
// ===========================================================================
// RULE PROFILES  —  /rule-profiles
// ===========================================================================
// GET /rule-profiles
exports.masterDataRouter.get('/rule-profiles', auth_middleware_1.requireAuth, h(async (req, res) => {
    const result = await master_data_service_1.ruleProfilesService.list(req.query);
    res.json((0, response_util_1.successResponse)(result.rows, result.meta));
}));
// POST /rule-profiles
exports.masterDataRouter.post('/rule-profiles', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), (0, validate_middleware_1.validate)(master_data_schema_1.CreateRuleProfileSchema), h(async (req, res) => {
    const profile = await master_data_service_1.ruleProfilesService.create(req.body, req.user.id);
    res.status(201).json((0, response_util_1.successResponse)(profile));
}));
// GET /rule-profiles/:id
exports.masterDataRouter.get('/rule-profiles/:id', auth_middleware_1.requireAuth, h(async (req, res) => {
    const profile = await master_data_service_1.ruleProfilesService.getById(req.params['id']);
    res.json((0, response_util_1.successResponse)(profile));
}));
// PATCH /rule-profiles/:id
exports.masterDataRouter.patch('/rule-profiles/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), (0, validate_middleware_1.validate)(master_data_schema_1.UpdateRuleProfileSchema), h(async (req, res) => {
    const profile = await master_data_service_1.ruleProfilesService.update(req.params['id'], req.body);
    res.json((0, response_util_1.successResponse)(profile));
}));
// DELETE /rule-profiles/:id
exports.masterDataRouter.delete('/rule-profiles/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireSystemRole)('system_admin'), h(async (req, res) => {
    await master_data_service_1.ruleProfilesService.delete(req.params['id']);
    res.json((0, response_util_1.successResponse)({ message: 'Profil aturan dihapus' }));
}));
//# sourceMappingURL=master-data.router.js.map