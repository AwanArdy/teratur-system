import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { shiftsService } from './shifts.service.js';
import { openShiftSchema, closeShiftSchema } from './shifts.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const shiftsRouter = Router();
shiftsRouter.use(authenticate);

shiftsRouter.get('/active', async (req, res, next) => {
  try {
    const result = await shiftsService.getActiveShift(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await shiftsService.listShifts(
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

shiftsRouter.post('/open', requireOutlet, authorize('owner', 'admin', 'staff'), async (req, res, next) => {
  try {
    const body = openShiftSchema.parse(req.body);
    const result = await shiftsService.openShift(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.post('/close', requireOutlet, authorize('owner', 'admin', 'staff'), async (req, res, next) => {
  try {
    const body = closeShiftSchema.parse(req.body);
    const result = await shiftsService.closeShift(req.ctx!, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
