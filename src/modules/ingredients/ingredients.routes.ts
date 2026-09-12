import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ingredientsService } from './ingredients.service.js';
import { createIngredientSchema, updateIngredientSchema } from './ingredients.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const ingredientsRouter = Router();
ingredientsRouter.use(authenticate);

ingredientsRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const result = await ingredientsService.listIngredients(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      { search, category, page: query.page, limit: query.limit }
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

ingredientsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await ingredientsService.getIngredientById(req.ctx!.organizationId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

ingredientsRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createIngredientSchema.parse(req.body);
    const result = await ingredientsService.createIngredient(req.ctx!.organizationId, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

ingredientsRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateIngredientSchema.parse(req.body);
    const result = await ingredientsService.updateIngredient(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

ingredientsRouter.delete('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await ingredientsService.deleteIngredient(req.ctx!.organizationId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
