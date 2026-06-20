import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
type RequestSource = 'body' | 'query' | 'params';
export declare function validate<T>(schema: ZodSchema<T>, source?: RequestSource): (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validate.middleware.d.ts.map