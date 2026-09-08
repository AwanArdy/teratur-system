import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";
import type { PlanCode } from '../db/schema/enums.js';

const PLAN_LEVELS: Record<PlanCode, number> = {
  free_trial: 0,
  starter: 0,
  growth: 1,
  pro: 2,
  business: 3
};

export const requirePlan = (minPlan: PlanCode) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.ctx) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Otentikasi dibutuhkan'));
    }

    const currentLevel = PLAN_LEVELS[req.ctx.planCode] ?? 0;
    const requiredLevel = PLAN_LEVELS[minPlan] ?? 0;

    if (currentLevel < requiredLevel) {
      return next(
        new HttpError(403, 'PLAN_REQUIRED', `Fitur ini membutuhkan paket minimal ${minPlan}`, {
          currentPlan: req.ctx.planCode,
          requiredPlan: minPlan
        })
      );
    }

    if (req.ctx.planStatus === 'expired') {
      return next(
        new HttpError(403, 'PLAN_REQUIRED', 'Masa berlangganan anda telah berakhir', {
          currentPlan: req.ctx.planCode,
          status: req.ctx.planStatus
        })
      );
    }

    next();
  };
};
