import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { opnamesService } from './opnames.service.js';
import { createOpnameSchema } from './opnames.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const opnamesRouter = Router();
opnamesRouter.use(authenticate);
opnamesRouter.use(requirePlan('growth'));

opnamesRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await opnamesService.listOpnames(
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

opnamesRouter.post(
  '/',
  requireOutlet,
  authorize('owner', 'admin', 'staff'),
  async (req, res, next) => {
    try {
      const body = createOpnameSchema.parse(req.body);
      const result = await opnamesService.createOpname(req.ctx!, body);
      res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
    } catch (err) {
      next(err);
    }
  }
);

opnamesRouter.post('/:id/approve', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await opnamesService.approveOpname(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

opnamesRouter.post('/:id/reject', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await opnamesService.rejectOpname(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
