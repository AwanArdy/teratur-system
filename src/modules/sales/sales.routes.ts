import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { requireIdempotencyKey } from '../../middleware/idempotency.js';
import { salesService } from './sales.service.js';
import { createSaleSchema, listSalesQuerySchema } from './sales.schemas.js';

export const salesRouter = Router();
salesRouter.use(authenticate);
salesRouter.use(requireOutlet);

salesRouter.post('/', requireIdempotencyKey, async (req, res, next) => {
  try {
    const body = createSaleSchema.parse(req.body);
    const result = await salesService.createSale(req.ctx!, body);
    res.status(201).json({
      data: result,
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

salesRouter.get('/', async (req, res, next) => {
  try {
    const query = listSalesQuerySchema.parse(req.query);
    const result = await salesService.listSales(req.ctx!, query);
    res.json({
      data: result.data,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
      },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

salesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await salesService.getSaleById(req.ctx!, id);
    res.json({
      data: result,
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

salesRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await salesService.cancelSale(req.ctx!, id);
    res.json({
      data: result,
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});
