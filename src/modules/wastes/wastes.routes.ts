import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { wastesService } from './wastes.service.js';
import { createWasteSchema } from './wastes.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const wastesRouter = Router();
wastesRouter.use(authenticate);
wastesRouter.use(requirePlan('growth'));

wastesRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await wastesService.listWastes(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      query
    );
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

wastesRouter.post(
  '/',
  requireOutlet,
  authorize('owner', 'admin', 'staff'),
  async (req, res, next) => {
    try {
      const body = createWasteSchema.parse(req.body);
      const result = await wastesService.createWaste(req.ctx!, body);
      res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
    } catch (err) {
      next(err);
    }
  }
);
