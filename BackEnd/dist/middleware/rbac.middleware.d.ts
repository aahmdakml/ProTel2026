import { Request, Response, NextFunction } from 'express';
import type { FieldRole, SystemRole } from '../shared/types';
export declare function requireFieldAccess(minRole?: FieldRole): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export declare function requireSystemRole(...roles: SystemRole[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.middleware.d.ts.map