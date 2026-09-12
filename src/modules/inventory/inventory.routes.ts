import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { inventoryService } from './inventory.service.js';
import { stockAdjustmentSchema, inventoryQuerySchema } from './inventory.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const query = inventoryQuerySchema.parse(req.query);

    const result = await inventoryService.listInventory(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      {
        search: query.search,
        itemType: query.itemType,
        warehouseId: query.warehouseId,
        page: query.page,
        limit: query.limit,
      }
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

inventoryRouter.post(
  '/adjustments',
  requireOutlet,
  authorize('owner', 'admin', 'staff'),
  async (req, res, next) => {
    try {
      const body = stockAdjustmentSchema.parse(req.body);
      const result = await inventoryService.createAdjustment(req.ctx!, body);
      res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
    } catch (err) {
      next(err);
    }
  }
);

inventoryRouter.get('/:itemType/:itemId/movements', async (req, res, next) => {
  try {
    const { itemType, itemId } = req.params as { itemType: string; itemId: string };
    if (!['ingredient', 'finished_good'].includes(itemType)) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'itemType harus ingredient atau finished_good');
    }

    const query = paginationSchema.parse(req.query);
    const result = await inventoryService.getMovements(
      req.ctx!.organizationId,
      itemType as 'ingredient' | 'finished_good',
      itemId,
      { page: query.page, limit: query.limit }
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
