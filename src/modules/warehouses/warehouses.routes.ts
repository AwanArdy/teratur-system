import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { warehousesService } from './warehouses.service.js';
import { createWarehouseSchema, updateWarehouseSchema } from './warehouses.schemas.js';

export const warehousesRouter = Router({ mergeParams: true });
warehousesRouter.use(authenticate);

warehousesRouter.get('/', async (req, res, next) => {
  try {
    const outletId = req.params.outletId as string;
    const result = await warehousesService.listWarehouses(req.ctx!.organizationId, outletId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

warehousesRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const outletId = req.params.outletId as string;
    const body = createWarehouseSchema.parse(req.body);
    const result = await warehousesService.createWarehouse(req.ctx!.organizationId, outletId, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

export const warehouseSingleRouter = Router();
warehouseSingleRouter.use(authenticate);

warehouseSingleRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = updateWarehouseSchema.parse(req.body);
    const result = await warehousesService.updateWarehouse(
      req.ctx!.organizationId,
      req.params.id,
      body
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
