import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(statusCode: number, code: string, message: string);
}
export declare function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error.middleware.d.ts.map