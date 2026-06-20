import { PaginationOptions, PaginationMeta } from '../../shared/types';
import { z } from 'zod';
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare function parsePagination(query: Record<string, unknown>, defaults?: {
    page: number;
    limit: number;
}): PaginationOptions;
export declare function buildPaginationMeta(opts: PaginationOptions, total: number): PaginationMeta;
//# sourceMappingURL=pagination.util.d.ts.map