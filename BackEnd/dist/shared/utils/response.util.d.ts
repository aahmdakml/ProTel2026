export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        [key: string]: unknown;
    };
}
/** Buat respons sukses */
export declare function successResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T>;
/** Buat respons error */
export declare function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never>;
//# sourceMappingURL=response.util.d.ts.map