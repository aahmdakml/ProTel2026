"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationsRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const recommendations_service_1 = require("./recommendations.service");
exports.recommendationsRouter = (0, express_1.Router)();
const h = (fn) => (req, res, next) => { fn(req, res).catch(next); };
// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------
// GET /fields/:fieldId/recommendations — latest cycle recs for field
exports.recommendationsRouter.get('/fields/:fieldId/recommendations', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const result = await (0, recommendations_service_1.getFieldRecommendations)(req.params['fieldId'], req.query);
    res.json((0, response_util_1.successResponse)(result.rows, {
        ...result.meta,
        latestJobId: result.latestJobId,
        latestEvaluatedAt: result.latestEvaluatedAt,
    }));
}));
// GET /fields/:fieldId/recommendations/history — historical recommendations
exports.recommendationsRouter.get('/fields/:fieldId/recommendations/history', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const result = await (0, recommendations_service_1.getFieldRecommendationHistory)(req.params['fieldId'], req.query);
    res.json((0, response_util_1.successResponse)(result.rows, result.meta));
}));
// GET /sub-blocks/:id/recommendations — per sub-block
exports.recommendationsRouter.get('/sub-blocks/:id/recommendations', auth_middleware_1.requireAuth, h(async (req, res) => {
    const rows = await (0, recommendations_service_1.getSubBlockRecommendations)(req.params['id']);
    res.json((0, response_util_1.successResponse)(rows));
}));
// POST /recommendations/:id/feedback — operator executes / skips recommendation
exports.recommendationsRouter.post('/recommendations/:id/feedback', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(recommendations_service_1.FeedbackSchema), h(async (req, res) => {
    const updated = await (0, recommendations_service_1.submitFeedback)(req.params['id'], req.user.id, req.body);
    res.json((0, response_util_1.successResponse)(updated));
}));
// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------
// GET /fields/:fieldId/alerts
exports.recommendationsRouter.get('/fields/:fieldId/alerts', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireFieldAccess)('viewer'), h(async (req, res) => {
    const result = await (0, recommendations_service_1.getFieldAlerts)(req.params['fieldId'], req.query);
    res.json((0, response_util_1.successResponse)(result.rows, result.meta));
}));
// POST /alerts/:id/acknowledge
exports.recommendationsRouter.post('/alerts/:id/acknowledge', auth_middleware_1.requireAuth, h(async (req, res) => {
    const alert = await (0, recommendations_service_1.acknowledgeAlert)(req.params['id'], req.user.id);
    res.json((0, response_util_1.successResponse)(alert));
}));
//# sourceMappingURL=recommendations.router.js.map