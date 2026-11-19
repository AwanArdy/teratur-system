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

export const authorizeStaff = (
  allowedStaffRoles: Array<'manager' | 'cashier' | 'barista' | 'kitchen' | 'helper'>,
  options?: { allowOwnerAdmin?: boolean }
) => {
  const allowOwnerAdmin = options?.allowOwnerAdmin ?? true;
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.ctx) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Otentikasi dibutuhkan'));
    }

    if (allowOwnerAdmin && (req.ctx.orgRole === 'owner' || req.ctx.orgRole === 'admin')) {
      return next();
    }

    if (req.ctx.orgRole === 'staff' && req.ctx.staffRole && allowedStaffRoles.includes(req.ctx.staffRole as any)) {
      return next();
    }

    return next(
      new HttpError(403, 'FORBIDDEN', 'Peran staf Anda tidak memiliki izin untuk tindakan ini')
    );
  };
};
