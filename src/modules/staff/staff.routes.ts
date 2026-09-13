import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { staffService } from './staff.service.js';
import { createStaffSchema, updateStaffSchema } from './staff.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const staffRouter = Router();
staffRouter.use(authenticate);

staffRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await staffService.listStaff(
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

staffRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await staffService.getStaffById(req.ctx!.organizationId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createStaffSchema.parse(req.body);
    const result = await staffService.createStaff(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

staffRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateStaffSchema.parse(req.body);
    const result = await staffService.updateStaff(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
