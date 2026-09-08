import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";

export const authorize = (...allowedRoles: Array<'owner' | 'admin' | 'staff'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.ctx) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Otentikasi dibutuhkan'));
    }

    if (!allowedRoles.includes(req.ctx.orgRole)) {
      return next(
        new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki akses untuk tindakan ini')
      );
    }

    next();
  };
};
