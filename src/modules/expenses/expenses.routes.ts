import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { expensesService } from './expenses.service.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expensesQuerySchema,
} from './expenses.schemas.js';

export const expensesRouter = Router();
expensesRouter.use(authenticate);

expensesRouter.get('/summary', async (req, res, next) => {
  try {
    const result = await expensesService.getSummary(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

expensesRouter.get('/', async (req, res, next) => {
  try {
    const query = expensesQuerySchema.parse(req.query);
    const result = await expensesService.listExpenses(
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

expensesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await expensesService.getExpenseById(req.ctx!.organizationId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

expensesRouter.post('/', requireOutlet, authorize('owner', 'admin', 'staff'), async (req, res, next) => {
  try {
    const body = createExpenseSchema.parse(req.body);
    const result = await expensesService.createExpense(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

expensesRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateExpenseSchema.parse(req.body);
    const result = await expensesService.updateExpense(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

expensesRouter.delete('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await expensesService.deleteExpense(req.ctx!.organizationId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
