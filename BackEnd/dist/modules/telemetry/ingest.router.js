"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestRouter = void 0;
const express_1 = require("express");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const ingest_schema_1 = require("./ingest.schema");
const ingest_service_1 = require("./ingest.service");
const state_builder_service_1 = require("../../modules/state-builder/state-builder.service");
exports.ingestRouter = (0, express_1.Router)();
const h = (fn) => (req, res, next) => { fn(req, res).catch(next); };
// ---------------------------------------------------------------------------
// POST /ingest/batch
//
// Endpoint menerima batch reading dari IoT gateway.
// Tidak ada JWT auth (gateway pakai mTLS atau private network).
// Field ID dalam payload wajib valid (validasi dilakukan oleh DB foreign key).
//
// Response: batch summary (batchId, processed, failed, skipped)
// ---------------------------------------------------------------------------
exports.ingestRouter.post('/batch', (0, validate_middleware_1.validate)(ingest_schema_1.BatchPayloadSchema), h(async (req, res) => {
    const result = await (0, ingest_service_1.processBatch)(req.body);
    // Trigger state builder async — tidak block response
    setImmediate(() => {
        (0, state_builder_service_1.buildFieldStates)(req.body.field_id).catch(() => null);
    });
    res.status(202).json((0, response_util_1.successResponse)(result));
}));
// ---------------------------------------------------------------------------
// POST /ingest/trigger-state-build  (manual trigger untuk testing)
// ---------------------------------------------------------------------------
exports.ingestRouter.post('/trigger-state-build', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('operator'), h(async (req, res) => {
    const fieldId = req.params['fieldId'] ?? req.body.field_id;
    const count = await (0, state_builder_service_1.buildFieldStates)(fieldId);
    res.json((0, response_util_1.successResponse)({ updated: count }));
}));
//# sourceMappingURL=ingest.router.js.map