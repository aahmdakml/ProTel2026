"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationQuerySchema = void 0;
exports.parsePagination = parsePagination;
exports.buildPaginationMeta = buildPaginationMeta;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Zod schema untuk pagination query params
// ---------------------------------------------------------------------------
exports.PaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
// ---------------------------------------------------------------------------
// Parse pagination dari query string
// ---------------------------------------------------------------------------
function parsePagination(query, defaults = { page: 1, limit: 20 }) {
    const page = Math.max(1, parseInt(String(query['page'] ?? defaults.page), 10) || defaults.page);
    const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? defaults.limit), 10) || defaults.limit));
    return { page, limit, offset: (page - 1) * limit };
}
// ---------------------------------------------------------------------------
// Buat metadata pagination untuk response
// ---------------------------------------------------------------------------
function buildPaginationMeta(opts, total) {
    return {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit),
    };
}
//# sourceMappingURL=pagination.util.js.map