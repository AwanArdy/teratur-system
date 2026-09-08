import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";

export const requireOutlet = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.ctx?.activeOutletId) {
    return next(
      new HttpError(
        400,
        'OUTLET_REQUIRED',
        'Outlet aktif harus ditentukan melalui header X-Outlet-Id'
      )
    );
  }
  next();
};
