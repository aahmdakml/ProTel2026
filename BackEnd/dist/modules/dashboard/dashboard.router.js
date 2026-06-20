"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const response_util_1 = require("../../shared/utils/response.util");
const dashboard_service_1 = require("./dashboard.service");
exports.dashboardRouter = (0, express_1.Router)();
// Alias handlers untuk mengurangi boilerplate
const h = (fn) => (req, res, next) => {
    fn(req, res).catch(next);
};
// ===========================================================================
// GET /dashboard/summary
// ===========================================================================
exports.dashboardRouter.get('/summary', auth_middleware_1.requireAuth, h(async (req, res) => {
    // Determine if the user is a system_admin to return all data or scoped data
    const isSystemAdmin = req.user.role === 'system_admin';
    const summary = await dashboard_service_1.dashboardService.getSummary(req.user.id, isSystemAdmin);
    res.json((0, response_util_1.successResponse)(summary));
}));
//# sourceMappingURL=dashboard.router.js.map