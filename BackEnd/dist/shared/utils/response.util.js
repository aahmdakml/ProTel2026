"use strict";
// ---------------------------------------------------------------------------
// Standard API response format
// Semua endpoint menggunakan format ini untuk konsistensi
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
/** Buat respons sukses */
function successResponse(data, meta) {
    return {
        success: true,
        data,
        ...(meta !== undefined && { meta }),
    };
}
/** Buat respons error */
function errorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined && { details }),
        },
    };
}
//# sourceMappingURL=response.util.js.map