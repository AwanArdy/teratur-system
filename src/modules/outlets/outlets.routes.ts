import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { outletsService } from './outlets.service.js';
import { createOutletSchema, updateOutletSchema } from './outlets.schemas.js';

export const outletsRouter = Router();
outletsRouter.use(authenticate);

outletsRouter.get('/', async (req, res, next) => {
  try {
    const result = await outletsService.listOutlets(req.ctx!.organizationId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

outletsRouter.post('/', authorize('owner'), async (req, res, next) => {
  try {
    const body = createOutletSchema.parse(req.body);
    const result = await outletsService.createOutlet(req.ctx!.organizationId, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

outletsRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await outletsService.getOutletById(req.ctx!.organizationId, req.params.id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

outletsRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = updateOutletSchema.parse(req.body);
    const result = await outletsService.updateOutlet(req.ctx!.organizationId, req.params.id as string, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
