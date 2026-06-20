"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorMiddleware = errorMiddleware;
const zod_1 = require("zod");
const logger_util_1 = require("../shared/utils/logger.util");
const response_util_1 = require("../shared/utils/response.util");
// ---------------------------------------------------------------------------
// AppError — custom error class untuk business logic errors
// Contoh: throw new AppError(404, 'FIELD_NOT_FOUND', 'Field tidak ditemukan')
// ---------------------------------------------------------------------------
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
        // Ensure stack trace is captured properly
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}
exports.AppError = AppError;
// ---------------------------------------------------------------------------
// Global error handler middleware
// Harus terdaftar PALING AKHIR di app.ts setelah semua routes
// ---------------------------------------------------------------------------
function errorMiddleware(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    // Zod validation errors (422 Unprocessable Entity)
    if (err instanceof zod_1.ZodError) {
        res.status(422).json((0, response_util_1.errorResponse)('VALIDATION_ERROR', 'Input tidak valid', err.flatten().fieldErrors));
        return;
    }
    // Known business logic errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json((0, response_util_1.errorResponse)(err.code, err.message));
        return;
    }
    // Unknown / unexpected errors
    logger_util_1.logger.error({ err, method: req.method, path: req.path, ip: req.ip }, 'Unhandled server error');
    res.status(500).json((0, response_util_1.errorResponse)('INTERNAL_SERVER_ERROR', 'Terjadi kesalahan pada server'));
}
//# sourceMappingURL=error.middleware.js.map