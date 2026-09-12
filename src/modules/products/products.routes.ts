import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { productsService } from './products.service.js';
import {
  createProductSchema,
  updateProductSchema,
  previewHppSchema,
} from './products.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const search = req.query.search as string | undefined;

    const result = await productsService.listProducts(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      { search, page: query.page, limit: query.limit }
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

productsRouter.post('/preview-hpp', async (req, res, next) => {
  try {
    const body = previewHppSchema.parse(req.body);
    const result = await productsService.calculateHpp(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      body.sellingPriceIdr,
      body.recipe
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await productsService.getProductById(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      id
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createProductSchema.parse(req.body);
    const result = await productsService.createProduct(req.ctx!.organizationId, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

productsRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateProductSchema.parse(req.body);
    const result = await productsService.updateProduct(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await productsService.deleteProduct(req.ctx!.organizationId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
