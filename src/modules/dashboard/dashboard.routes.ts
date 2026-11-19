import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeStaff } from '../../middleware/authorize.js';
import { dashboardService } from './dashboard.service.js';
import { dashboardQuerySchema } from './dashboard.schemas.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/', authorizeStaff(['manager', 'cashier']), async (req, res, next) => {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const outletId = query.outletId || req.ctx!.activeOutletId;

    const result = await dashboardService.getDashboardData(
      req.ctx!.organizationId,
      outletId,
      query,
      req.ctx!.planCode
    );

    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
