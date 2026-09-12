import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { idempotency } from '../../middleware/idempotency.js';
import { transfersService } from './transfers.service.js';
import { createTransferSchema, transfersQuerySchema } from './transfers.schemas.js';

export const transfersRouter = Router();
transfersRouter.use(authenticate);
transfersRouter.use(requirePlan('growth'));

transfersRouter.get('/', async (req, res, next) => {
  try {
    const query = transfersQuerySchema.parse(req.query);
    const result = await transfersService.listTransfers(req.ctx!.organizationId, query);
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

transfersRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await transfersService.getTransferById(req.ctx!.organizationId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

transfersRouter.post('/', idempotency, authorize('owner', 'admin', 'staff'), async (req, res, next) => {
  try {
    const body = createTransferSchema.parse(req.body);
    const result = await transfersService.createTransfer(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

transfersRouter.post('/:id/receive', authorize('owner', 'admin', 'staff'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await transfersService.receiveTransfer(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

transfersRouter.post('/:id/cancel', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await transfersService.cancelTransfer(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
